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
  PaymentItem
} from './dto';
import { PaymentStatus, PaymentItemType, PaymentProvider, CommissionStatus } from 'src/generated/enums';
import { AppConfigService } from '../utils/env';
import { CommissionsService } from '../commissions/commissions.service';
import { PoolsService } from '../pools/pools.service';
import dayjs from 'dayjs';
import { paginate, PaginationParams } from 'src/utils';
import { ANNUAL_FEE, REGISTRATION_FEE } from 'src/utils/constant';
import { Payment } from 'src/generated/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coinPaymentService: CoinPaymentService,
    private readonly env: AppConfigService,
    private readonly logger: PinoLogger,
    private readonly commissionsService: CommissionsService,
    private readonly poolsService: PoolsService,
  ) {
    this.logger.setContext(PaymentsService.name);
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

    await this.completePayment(updatedPayment.id, updatedPayment.userId);

    this.logger.info(
      { paymentId: updatedPayment.id },
      'Payment completion simulated',
    );

    return { message: 'Payment completed successfully', data: null };
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

    let membershipFee: PaymentItem | null = null;
    if (!user.membership_due_date) {
      membershipFee = {
        amount: REGISTRATION_FEE,
        name: 'Registration Fee',
        type: PaymentItemType.REGISTRATION_FEE,
      } as PaymentItem;
    } else if (dayjs().isAfter(dayjs(user.membership_due_date))) {
      membershipFee = {
        amount: ANNUAL_FEE,
        name: 'Annual Fee',
        type: PaymentItemType.ANNUAL_FEE,
      };
    }

    const data = {
      supportedCurrencies,
      availablePackages,
      membershipFee
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

    // Validate that at least one of packageId or includeMembershipFee is provided
    if (!dto.packageId && !dto.includeMembershipFee) {
      throw new BadRequestException(
        'Either package or membership must be provided',
      );
    }

    const paymentItems: PaymentItem[] = [];

    if (dto.packageId) {
      const packageData = await this.prisma.package.findUnique({
        where: { id: dto.packageId },
      });

      if (!packageData) {
        throw new NotFoundException('Package not found');
      }

      // Determine payment type and calculate amount
      const isUpgrade = !!user.packageId;
      const paymentType = isUpgrade
        ? PaymentItemType.PACKAGE_UPGRADE
        : PaymentItemType.PACKAGE_PURCHASE;

      let packageAmount: number = 0;

      if (isUpgrade) {
        const currentPackagePrice = user.package?.price || 0;
        packageAmount = packageData.price - currentPackagePrice;

        if (packageAmount <= 0) {
          throw new BadRequestException(
            'Target package price must be higher than current package',
          );
        }

        // Check if user already has this package
        if (user.packageId === dto.packageId) {
          throw new ConflictException('User already has this package');
        }
      } else {
        packageAmount = packageData.price;

        // Check if user already has a package
        if (user.packageId) {
          throw new ConflictException(
            'User already has a package. Use upgrade instead.',
          );
        }
      }

      paymentItems.push({
        type: paymentType,
        name: `${paymentType === PaymentItemType.PACKAGE_PURCHASE ? 'Purchase' : 'Upgrade'} - ${packageData.name}`,
        amount: packageAmount,
        referenceId: packageData.id,
      });
    }

    if (dto.includeMembershipFee) {
      if (!user.membership_due_date) {
        paymentItems.push({
          type: PaymentItemType.REGISTRATION_FEE,
          name: 'Registration Fee',
          amount: REGISTRATION_FEE,
        });
      } else if (dayjs().isAfter(dayjs(user.membership_due_date))) {
        paymentItems.push({
          type: PaymentItemType.ANNUAL_FEE,
          name: 'Annual Fee',
          amount: ANNUAL_FEE,
        });
      }
    }

    const totalAmount = paymentItems.reduce((acc, item) => acc + item.amount, 0);
    if (totalAmount <= 0) {
      throw new BadRequestException('No payment items to process');
    }

    return await this.initiatePayment(
      userId,
      totalAmount,
      paymentItems,
      user.email,
      dto.currency || 'USD'
    );
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

    // const isValid = this.coinPaymentService.verifyIpnSignature(
    //   ipn as unknown as Record<string, unknown>,
    //   hmac,
    // );

    // if (!isValid) {
    //   throw new BadRequestException('Invalid HMAC signature');
    // }

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

    const newStatus = this.getPaymentStatus(String(ipn.status));
    if (newStatus === PaymentStatus.PENDING) {
      return;
    }

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
      await this.completePayment(updatedPayment.id, payment.userId);
    }

    this.logger.info(
      { paymentId: updatedPayment.id, status: newStatus },
      'Payment status updated from webhook',
    );

    return { message: 'Payment status updated successfully', data: null };
  }

  /**
   * Create payment record and initiate payment transaction with provider
   */
  private async initiatePayment(
    userId: number,
    amount: number,
    paymentItems: Omit<PaymentItem, 'id' | 'paymentId'>[],
    buyerEmail: string,
    currency: string,
  ) {
    const itemNames = paymentItems.map((item) => item.name).join(', ');
    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount,
        status: PaymentStatus.PENDING,
        commission_status: CommissionStatus.NOT_ELIGIBLE,
        items: {
          create: paymentItems,
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
        buyer_email: buyerEmail,
        currency1: 'USD',
        currency2: currency,
        item_name: itemNames,
        invoice: String(payment.id),
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
   * Complete payment and update user's package
   */
  private async completePayment(paymentId: number, userId: number): Promise<void> {
    try {
      const paymentItems = await this.prisma.paymentItem.findMany({
        where: { paymentId },
      })

      for (const item of paymentItems) {
        switch (item.type) {
          case PaymentItemType.PACKAGE_PURCHASE:
          case PaymentItemType.PACKAGE_UPGRADE:
            const packageId = item.referenceId;
            if (!packageId) {
              continue;
            }
            await this.processPackagePayment(packageId, paymentId, userId, item.amount);
            break;
          case PaymentItemType.REGISTRATION_FEE:
          case PaymentItemType.ANNUAL_FEE:
            await this.prisma.user.update({
              where: { id: userId },
              data: {
                membership_due_date: dayjs().add(1, "year").toDate()
              }
            })
            break;
        }
      }


      return;
    } catch (error) {
      this.logger.error(
        { err: error, paymentId },
        'Failed to complete payment',
      );
      throw error;
    }
  }

  private async processPackagePayment(packageId: number, paymentId: number, userId: number, amount: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        packageId,
        turnover: {
          increment: amount,
        },
      },
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        commission_status: CommissionStatus.ELIGIBLE,
      },
    });

    // Distribute commissions
    const processedUserIds = await this.commissionsService.distributeCommissions(
      userId,
      paymentId,
      amount,
    );
    // Check and upgrade pools for customer and all ancestors
    if (processedUserIds) {
      await this.checkAndUpgradePools(processedUserIds);
    }
  }

  /**
   * Check and upgrade pools for customer and all ancestors after payment
   */
  private async checkAndUpgradePools(affectedUserIds: number[]): Promise<void> {
    try {
      const pools = await this.prisma.pool.findMany();

      for (const userId of affectedUserIds) {
        await this.poolsService.checkAndUpgradePool(userId, pools);
      }

      this.logger.debug('Pool eligibility checked for customer and ancestors');
    } catch (error) {
      this.logger.error(
        error,
        'Failed to check and upgrade pools after payment',
      );
    }
  }

  private getPaymentStatus(status: string) {
    const _status = Number(status);
    if (_status < 0) {
      return PaymentStatus.FAILED;
    }
    else if (_status === 2) {
      return PaymentStatus.COMPLETED;
    }
    else if (_status >= 0 && _status < 100) {
      return PaymentStatus.PENDING;
    }
    else if (_status >= 100) {
      return PaymentStatus.COMPLETED;
    } else {
      return PaymentStatus.FAILED;
    }
  }
}
