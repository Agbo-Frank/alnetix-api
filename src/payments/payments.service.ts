import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { CoinPaymentService, } from './coinpayment/coinpayment.service';
import { CoinPaymentIPN } from './coinpayment/coinpayment.interface';
import {
  CreatePaymentDto,
} from './dto';
import { PaymentStatus, PaymentItemType, PaymentProvider, CommissionStatus } from 'src/generated/enums';
import { AppConfigService } from '../utils/env';
import { CommissionsService } from '../commissions/commissions.service';
import dayjs from 'dayjs';
import { paginate, PaginationParams } from 'src/utils';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coinPaymentService: CoinPaymentService,
    private readonly env: AppConfigService,
    private readonly logger: PinoLogger,
    private readonly commissionsService: CommissionsService,
  ) {
    this.logger.setContext(PaymentsService.name);
  }

  /**
   * Get checkout details including packages, and payment currencies
   */
  async getCheckoutDetails(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { package: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all packages
    let availablePackages = await this.prisma.package.findMany({
      orderBy: { price: 'asc' },
    });

    if (user.packageId && user.package) {
      const currentPackagePrice = user.package.price;

      availablePackages = availablePackages
        .filter((pkg) => pkg.price > currentPackagePrice)
        .map((pkg) => ({
          id: pkg.id,
          slug: pkg.slug,
          description: pkg.description,
          name: pkg.name,
          price: pkg.price - currentPackagePrice
        }));
    }

    const supportedCurrencies = await this.coinPaymentService.getSupportedCurrencies();

    const data = {
      supportedCurrencies,
      availablePackages
    };
    return { message: 'Checkout details fetched successfully', data };
  }

  /**
   * Create a payment for package purchase or upgrade
   */
  async createPayment(userId: number, dto: CreatePaymentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { package: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetPackage = await this.prisma.package.findUnique({
      where: { id: dto.packageId },
    });

    if (!targetPackage) {
      throw new NotFoundException('Package not found');
    }

    // Determine payment type and calculate amount
    const isUpgrade = !!user.packageId;
    const paymentType = isUpgrade
      ? PaymentItemType.PACKAGE_UPGRADE
      : PaymentItemType.PACKAGE_PURCHASE;

    let amount: number = 0;
    if (isUpgrade) {
      const currentPackagePrice = user.package?.price || 0;
      amount = targetPackage.price - currentPackagePrice;

      if (amount <= 0) {
        throw new BadRequestException(
          'Target package price must be higher than current package',
        );
      }

      // Check if user already has this package
      if (user.packageId === dto.packageId) {
        throw new ConflictException('User already has this package');
      }
    } else {
      amount = targetPackage.price;

      // Check if user already has a package
      if (user.packageId) {
        throw new ConflictException(
          'User already has a package. Use upgrade instead.',
        );
      }
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount,
        status: PaymentStatus.PENDING,
        commission_status: CommissionStatus.NOT_ELIGIBLE,
        items: {
          create: {
            type: paymentType,
            name: `${paymentType === PaymentItemType.PACKAGE_PURCHASE ? 'Purchase' : 'Upgrade'} - ${targetPackage.name}`,
            amount,
            referenceId: targetPackage.id,
          },
        },
      },
      include: {
        items: true,
      },
    });

    // Create CoinPayment transaction
    try {
      const transaction = await this.coinPaymentService.createTransaction({
        amount,
        buyer_email: user.email,
        currency1: "USD",
        currency2: dto.currency || 'USD', // Can be changed to accept crypto
        item_name: targetPackage.name,
        item_number: String(targetPackage.id),
        invoice: String(payment.id),
        custom: JSON.stringify({ userId, packageId: targetPackage.id }),
        ipn_url: this.env.ipnUrl,
      });

      // Update payment with provider reference
      if (!transaction) {
        throw new BadRequestException('Transaction creation failed');
      }

      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          provider: PaymentProvider.COINPAYMENT,
          provider_reference: transaction.txn_id,
          expires_at: dayjs().add(transaction.timeout, 'second').toDate(),
        },
        include: {
          items: true,
        },
      });

      return {
        ...transaction,
        payment_id: updatedPayment.id,
      };
    } catch (error) {
      // Update payment status to failed if CoinPayment fails
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      this.logger.error(
        { err: error, paymentId: payment.id },
        'Failed to create CoinPayment transaction',
      );
      throw error;
    }
  }

  /**
   * Handle CoinPayment webhook
   */
  async handleCoinPaymentWebhook(ipn: CoinPaymentIPN, hmac: string) {
    this.logger.info(
      { txn_id: ipn.txn_id, status: ipn.status, status_text: ipn.status_text },
      'Processing CoinPayment webhook',
    );


    if (!hmac) {
      this.logger.warn('Missing HMAC signature in webhook');
      throw new BadRequestException('Missing HMAC signature');
    }

    const isValid = this.coinPaymentService.verifyIpnSignature(
      ipn as unknown as Record<string, unknown>,
      hmac,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid HMAC signature');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { provider_reference: ipn.txn_id },
      include: {
        items: true,
        user: {
          include: { package: true },
        },
      },
    });

    if (!payment || payment.status !== PaymentStatus.PENDING) {
      return;
    }

    // Map CoinPayment status to our PaymentStatus
    let paymentStatus: Record<string, PaymentStatus> = {
      "0": PaymentStatus.PENDING,
      "1": PaymentStatus.PENDING,
      "2": PaymentStatus.PENDING,
      "100": PaymentStatus.COMPLETED,
      "-1": PaymentStatus.CANCELLED,
    };

    const newStatus = paymentStatus[String(ipn.status)] || PaymentStatus.FAILED;

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        completed_at:
          newStatus === PaymentStatus.COMPLETED ? dayjs().toDate() : null,
      },
      include: {
        items: true,
        user: {
          include: { package: true },
        },
      },
    });

    // If payment is completed, update user's package
    if (newStatus === PaymentStatus.COMPLETED) {
      await this.completePayment(updatedPayment);
    }

    this.logger.info(
      { paymentId: updatedPayment.id, status: newStatus },
      'Payment status updated from webhook',
    );

    return { message: 'Payment status updated successfully', data: null };
  }

  /**
   * Complete payment and update user's package
   */
  private async completePayment(payment: any): Promise<void> {
    try {
      // Find package item
      const packageItem = payment.items.find(
        (item: any) => item.referenceId,
      );

      if (!packageItem) {
        return;
      }

      const packageId = packageItem.referenceId;

      await this.prisma.user.update({
        where: { id: payment.userId },
        data: {
          packageId,
          turnover: {
            increment: payment.amount,
          },
        },
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          commission_status: CommissionStatus.ELIGIBLE,
        },
      });

      // Distribute commissions
      await this.commissionsService.distributeCommissions(
        payment.userId,
        payment.id,
        payment.amount,
      );

      return;
    } catch (error) {
      this.logger.error(
        { err: error, paymentId: payment.id },
        'Failed to complete payment',
      );
      throw error;
    }
  }

  async getUserPayments(userId: number, pagination: PaginationParams) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        include: {
          items: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({
        where: { userId },
      }),
    ]);

    const data = paginate(payments, total, page, limit);
    return { message: 'Payments fetched successfully', data };
  }

  async getPaymentById(paymentId: number, userId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Simulate payment completion (dev environment only)
   */
  async simulatePaymentCompletion(paymentId: number) {
    if (this.env.isProduction) {
      throw new ForbiddenException();
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        items: true,
        user: {
          include: { package: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      const message = {
        [PaymentStatus.COMPLETED]: 'Payment is already completed',
        [PaymentStatus.CANCELLED]: 'Payment is cancelled',
        [PaymentStatus.FAILED]: 'Payment is failed',
      };
      throw new BadRequestException(message[payment.status] || 'Payment is not pending');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        completed_at: dayjs().toDate(),
      },
      include: {
        items: true,
        user: {
          include: { package: true },
        },
      },
    });

    await this.completePayment(updatedPayment);

    this.logger.info(
      { paymentId: updatedPayment.id },
      'Payment completion simulated',
    );

    return { message: 'Payment completed successfully', data: null };
  }
}
