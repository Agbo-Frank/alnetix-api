import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { COMMISSION_CONSTANTS } from './commissions.constants';
import { CommissionType } from 'src/generated/enums';
import { Prisma, PrismaClient } from 'src/generated/client';
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
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
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
  async distributeCommissions(
    customerId: number,
    paymentId: number,
    amount: number,
  ): Promise<void> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      })
      if (!payment) {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }

      // Use transaction to ensure atomicity
      await this.prisma.$transaction(async (tx) => {
        // Distribute affiliate commissions
        await this.distributeAffiliateCommissions(
          customerId,
          paymentId,
          amount,
          tx,
        );

        // Distribute unstoppable commissions

        await this.distributeUnstoppableCommissions(
          customerId,
          paymentId,
          amount,
          tx,
        );
      });

      this.logger.info(
        { customerId, paymentId, amount },
        'Commissions distributed successfully',
      );
    } catch (error) {
      this.logger.error(
        { err: error, customerId, paymentId, amount },
        'Failed to distribute commissions',
      );
    }
  }

  private async distributeAffiliateCommissions(
    customerId: number,
    paymentId: number,
    amount: number,
    tx: PrismaTransaction,
  ): Promise<void> {
    const { affiliateBonuses, processedUserIds } = await this.calculateAffiliateBonuses(
      customerId,
      amount,
      tx,
    );

    for (const affiliateBonus of affiliateBonuses) {
      if (affiliateBonus.commission !== null) {
        await tx.commission.create({
          data: {
            type: CommissionType.affiliate,
            userId: affiliateBonus.userId,
            customerId,
            paymentId,
            position: String(affiliateBonus.level),
            commission: affiliateBonus.commission,
            percentage: affiliateBonus.default_bonus,
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

    // Update team_turnover for all parents (regardless of qualification)
    await tx.user.updateMany({
      where: {
        id: { in: processedUserIds },
      },
      data: {
        team_turnover: {
          increment: amount,
        },
      },
    });
  }

  private async distributeUnstoppableCommissions(
    customerId: number,
    paymentId: number,
    amount: number,
    tx: PrismaTransaction,
  ): Promise<void> {
    const unstoppableBonuses = await this.calculateUnstoppableBonuses(customerId, amount, tx);

    // Create commission records and update balances
    for (const unstoppableBonus of unstoppableBonuses) {
      if (unstoppableBonus.commission !== null) {
        await tx.commission.create({
          data: {
            type: CommissionType.unstoppable,
            userId: unstoppableBonus.userId,
            customerId,
            paymentId,
            position: unstoppableBonus.rank || '',
            commission: unstoppableBonus.commission,
            percentage: unstoppableBonus.bonus || 0,
          },
        });

        // Update user balances
        await this.updateUserBalances(
          unstoppableBonus.userId,
          unstoppableBonus.commission,
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

  private async calculateAffiliateBonuses(
    customerId: number,
    amount: number,
    tx: PrismaTransaction,
  ) {
    const affiliateBonuses: AffiliateBonus[] = [];

    const processedUserIds = new Set<number>([customerId]);
    let currentUser = await tx.user.findUnique({
      where: { id: customerId },
    });

    if (!currentUser) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    let level = 1;
    let count = 1;

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

      // Check if parent is active
      const is_actived = parent.is_active;

      // Check qualification: must have at least (level - 1) direct children
      const directChildrenCount = await tx.user.count({
        where: {
          referred_by_code: parent.referral_code,
        },
      });

      const is_qualified = directChildrenCount >= level - 1;

      // Commission is only available if both active and qualified
      const isAvailableBonus = is_actived && is_qualified;

      // Calculate commission
      const default_bonus =
        level === 1
          ? COMMISSION_CONSTANTS.direct
          : COMMISSION_CONSTANTS.indirect;

      const bonus = isAvailableBonus ? default_bonus : null;
      const commission = isAvailableBonus
        ? amount *
        (COMMISSION_CONSTANTS.referral / 100) *
        (default_bonus / 100)
        : null;

      // Add to bonuses array
      affiliateBonuses.push({
        userId: parent.id,
        level,
        is_qualified,
        is_actived,
        default_bonus,
        bonus,
        commission,
      });
      if (is_actived && is_qualified) {
        level++;
      }

      count++;
      currentUser = parent;
    }

    return {
      affiliateBonuses,
      processedUserIds: Array.from(processedUserIds),
    };
  }

  private async calculateUnstoppableBonuses(
    customerId: number,
    amount: number,
    tx: PrismaTransaction,
  ) {
    const unstoppableBonuses: UnstoppableBonus[] = [];

    const customer = await tx.user.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    if (!customer.referred_by_code) {
      return unstoppableBonuses;
    }

    // Find the parent (partner) to start the loop
    let partner = await tx.user.findFirst({
      where: { referral_code: customer.referred_by_code },
      include: {
        rank: true,
      },
    });

    if (!partner) {
      return unstoppableBonuses; // Parent not found, return empty array
    }

    let previous_bonus = 0;

    // Loop through parents starting from customer's parent
    while (partner) {
      const is_actived = partner.is_active;
      const is_qualified = Boolean(partner.rank);
      const unstoppable_bonus = partner.rank;

      let bonus: number | null = null;
      let commission: number | null = null;

      if (unstoppable_bonus) {
        if (is_actived && is_qualified) {
          const temp_bonus =
            unstoppable_bonus.cumulative_percent - previous_bonus;
          bonus = temp_bonus > 0 ? temp_bonus : null;
          if (bonus) {
            previous_bonus = unstoppable_bonus.cumulative_percent;
            commission =
              amount *
              (COMMISSION_CONSTANTS.referral / 100) *
              (bonus / 100);
          }
        }
      }

      unstoppableBonuses.push({
        userId: partner.id,
        rank: unstoppable_bonus?.name || null,
        is_qualified,
        is_actived,
        default_bonus: unstoppable_bonus?.cumulative_percent ?? 0,
        bonus,
        commission,
      });

      // Move to next parent
      if (!partner.referred_by_code) {
        break; // No more parents, stop traversal
      }

      partner = await tx.user.findFirst({
        where: { referral_code: partner.referred_by_code },
        include: {
          rank: true,
        },
      });
    }

    return unstoppableBonuses;
  }
}
