import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { COMMISSION_CONSTANTS } from './commissions.constants';
import { CommissionType } from 'src/generated/enums';
import { Prisma, PrismaClient, User } from 'src/generated/client';
import { AffiliateBonus, GetCommissionsDto, UnstoppableBonus } from './dto';
import { paginate, PaginationParams } from 'src/utils';

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CommissionsService.name);
  }

  /**
   * Get user's commissions with optional filters
   */
  async getUserCommissions(
    userId: number,
    query: GetCommissionsDto,
    pagination: PaginationParams,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.CommissionWhereInput = {
      userId,
    };

    if (query.type) {
      where.type = query.type;
    }
    if (query.startDate) {
      where.createdAt = {
        gte: new Date(query.startDate),
      };
    }
    if (query.endDate) {
      where.createdAt = {
        lte: new Date(query.endDate),
      };
    }

    const [commissions, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commission.count({ where }),
    ]);

    const data = paginate(commissions, total, page, limit);
    return { message: 'Commissions fetched successfully', data };
  }

  /**
   * Recalculate balance from commission records (for audit/reconciliation)
   */
  async reconcileBalance(userId: number): Promise<{
    commission_earned: number;
    commission_balance: number;
    discrepancy: boolean;
  }> {
    // Sum all commissions for the user
    const result = await this.prisma.commission.aggregate({
      where: { userId },
      _sum: {
        commission: true,
      },
    });

    const calculatedEarned = result._sum.commission || 0;

    // Get current balance from User table
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        commission_earned: true,
        commission_balance: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const discrepancy =
      Math.abs(user.commission_earned - calculatedEarned) > 0.01; // Allow for floating point precision

    // Update if discrepancy found
    let difference = 0;
    if (discrepancy) {
      difference = calculatedEarned - user.commission_earned;
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          commission_earned: calculatedEarned,
          commission_balance: {
            increment: difference,
          },
        },
      });

      this.logger.warn(
        {
          userId,
          calculatedEarned,
          storedEarned: user.commission_earned,
          difference,
        },
        'Commission balance discrepancy found and corrected',
      );
    }

    return {
      commission_earned: calculatedEarned,
      commission_balance: user.commission_balance + difference,
      discrepancy,
    };
  }

  /**
   * Distributes both affiliate and unstoppable commissions
   */
  async distributeCommissions(customerId: number, paymentId: number, amount: number) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      })
      if (!payment) {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }

      const customer = await this.prisma.user.findUnique({
        where: { id: customerId },
      });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Use transaction to ensure atomicity
      const processedUserIds = await this.prisma.$transaction(async (tx) => {

        // Distribute affiliate commissions
        await this.distributeAffiliateCommissions(
          customer,
          paymentId,
          amount,
          tx,
        );

        // Update team_turnover for all parents/ancestors
        return await this.updateTeamTurnover(customer, amount, tx); // Update team_turnover for all parents/ancestors
      });

      this.logger.info(
        { customerId, paymentId, amount },
        'Commissions distributed successfully',
      );
      return Array.from(processedUserIds);
    } catch (error) {
      this.logger.error(
        { err: error, customerId, paymentId, amount },
        'Failed to distribute commissions',
      );
      return [];
    }
  }

  private async distributeAffiliateCommissions(
    customer: User,
    paymentId: number,
    amount: number,
    tx: PrismaTransaction,
  ): Promise<void> {
    const affiliateBonuses = await this.calculateAffiliateBonuses(
      customer,
      amount,
      tx,
    );

    for (const affiliateBonus of affiliateBonuses) {
      if (affiliateBonus.commission) {
        await tx.commission.create({
          data: {
            type: CommissionType.affiliate,
            userId: affiliateBonus.userId,
            customerId: customer.id,
            paymentId,
            amount,
            position: String(affiliateBonus.level),
            commission: affiliateBonus.commission,
            percentage: affiliateBonus.bonus,
          },
        });

        // Update user balances
        await this.updateUserBalances(
          affiliateBonus.userId,
          affiliateBonus.commission,
          tx,
        );
      }
    }
  }

  /**
   * Update user's commission balance fields
   */
  private async updateUserBalances(
    userId: number,
    commissionAmount: number,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.user.update({
      where: { id: userId },
      data: {
        commission_earned: {
          increment: commissionAmount,
        },
        commission_balance: {
          increment: commissionAmount,
        },
      },
    });
  }

  /**
   * Update team_turnover for all parents/ancestors of the customer who made payment
   * This excludes the customer themselves and only updates their parents up the referral tree
   */
  private async updateTeamTurnover(
    customer: User,
    amount: number,
    tx: PrismaTransaction,
  ) {
    let currentUser = customer;

    const processedUserIds = new Set<number>([customer.id]);

    // Traverse up the referral tree
    while (currentUser?.referred_by_code) {
      const parent = await tx.user.findFirst({
        where: { referral_code: currentUser.referred_by_code }
      });

      if (!parent) {
        break; // Parent not found, stop traversal
      }

      // Prevent circular references
      if (processedUserIds.has(parent.id)) {
        break;
      }

      processedUserIds.add(parent.id);

      // Increment team_turnover for this parent (excluding customer's personal turnover)
      await tx.user.update({
        where: { id: parent.id },
        data: {
          team_turnover: {
            increment: amount,
          },
        },
      });

      // Move to next parent
      currentUser = parent;
    }

    return processedUserIds;
  }

  private async calculateAffiliateBonuses(
    customer: User,
    amount: number,
    tx: PrismaTransaction,
  ) {
    const affiliateBonuses: AffiliateBonus[] = [];

    let currentUser = customer;

    let level = 1;
    let count = 1;
    const processedUserIds = new Set<number>([customer.id]);

    while (level <= COMMISSION_CONSTANTS.AFFILIATE_LEVEL_DEPTH) {
      if (!currentUser) {
        break;
      }

      // Check if current user has a parent
      if (!currentUser.referred_by_code) {
        break; // No parent, stop traversal
      }

      // Find parent by referral code
      const parent = await tx.user.findFirst({
        where: { referral_code: currentUser.referred_by_code },
      });

      if (!parent) {
        break; // Parent not found, stop traversal
      }

      // Prevent circular references
      if (processedUserIds.has(parent.id)) {
        break;
      }

      processedUserIds.add(parent.id);

      // Calculate commission
      const bonus = COMMISSION_CONSTANTS.levels[Math.min(level, COMMISSION_CONSTANTS.AFFILIATE_LEVEL_DEPTH)];
      const commission = amount *
        (COMMISSION_CONSTANTS.referral / 100) *
        (bonus / 100)

      // Add to bonuses array
      affiliateBonuses.push({
        userId: parent.id,
        level,
        bonus,
        commission,
      });

      level++;
      count++;
      currentUser = parent;
    }

    return affiliateBonuses
  }
}
