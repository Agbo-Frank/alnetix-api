import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from 'src/generated/client';

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PoolsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Calculate the total turnover for a leg (direct member + their entire downline)
   */
  private async calculateLegTurnover(
    directMemberId: number,
    tx: PrismaTransaction,
  ): Promise<number> {
    const directMember = await tx.user.findUnique({
      where: { id: directMemberId },
      select: { turnover: true, team_turnover: true },
    });

    if (!directMember) {
      return 0;
    }

    // Leg turnover = direct member's personal turnover + their team turnover
    return directMember.turnover + directMember.team_turnover;
  }

  /**
   * Get all direct members of a user
   */
  private async getDirectMembers(
    userReferralCode: string,
    tx: PrismaTransaction,
  ) {
    return await tx.user.findMany({
      where: { referred_by_code: userReferralCode },
      select: { id: true, referral_code: true },
    });
  }

  /**
   * Check if a user qualifies for a specific pool
   */
  async checkPoolEligibility(
    userId: number,
    poolId: number,
    tx?: PrismaTransaction,
  ): Promise<{
    eligible: boolean;
    reasons: string[];
    criteria: {
      directMembers: { required: number; actual: number; met: boolean };
      personalTurnover: { required: number; actual: number; met: boolean };
      teamTurnover: { required: number; actual: number; met: boolean };
      legRequirement: { required: number; maxLegTurnover: number; met: boolean };
    };
  }> {
    const prisma = tx || this.prisma;

    // Get user and pool
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referral_code: true,
        turnover: true,
        team_turnover: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    const reasons: string[] = [];
    const criteria = {
      directMembers: { required: pool.min_direct_members, actual: 0, met: false },
      personalTurnover: {
        required: pool.min_turnover,
        actual: user.turnover,
        met: false,
      },
      teamTurnover: {
        required: pool.min_team_turnover,
        actual: user.team_turnover,
        met: false,
      },
      legRequirement: {
        required: pool.max_turnover_per_leg,
        maxLegTurnover: 0,
        met: false,
      },
    };

    // Check direct members count
    const directMembers = await this.getDirectMembers(user.referral_code, prisma);
    criteria.directMembers.actual = directMembers.length;
    criteria.directMembers.met =
      criteria.directMembers.actual >= criteria.directMembers.required;

    if (!criteria.directMembers.met) {
      reasons.push(
        `Requires ${criteria.directMembers.required} direct members, but has ${criteria.directMembers.actual}`,
      );
    }

    // Check personal turnover
    criteria.personalTurnover.met =
      criteria.personalTurnover.actual >= criteria.personalTurnover.required;

    if (!criteria.personalTurnover.met) {
      reasons.push(
        `Requires personal turnover of $${criteria.personalTurnover.required}, but has $${criteria.personalTurnover.actual}`,
      );
    }

    // Check team turnover
    criteria.teamTurnover.met =
      criteria.teamTurnover.actual >= criteria.teamTurnover.required;

    if (!criteria.teamTurnover.met) {
      reasons.push(
        `Requires team turnover of $${criteria.teamTurnover.required}, but has $${criteria.teamTurnover.actual}`,
      );
    }

    // Check leg requirement (at least max_turnover_per_leg from one leg)
    let maxLegTurnover = 0;
    for (const directMember of directMembers) {
      const legTurnover = await this.calculateLegTurnover(
        directMember.id,
        prisma,
      );
      maxLegTurnover = Math.max(maxLegTurnover, legTurnover);
    }

    criteria.legRequirement.maxLegTurnover = maxLegTurnover;
    criteria.legRequirement.met =
      maxLegTurnover >= criteria.legRequirement.required;

    if (!criteria.legRequirement.met) {
      reasons.push(
        `Requires at least $${criteria.legRequirement.required} from one leg, but maximum leg turnover is $${maxLegTurnover}`,
      );
    }

    const eligible =
      criteria.directMembers.met &&
      criteria.personalTurnover.met &&
      criteria.teamTurnover.met &&
      criteria.legRequirement.met;

    return {
      eligible,
      reasons,
      criteria,
    };
  }

  /**
   * Check and upgrade user to the highest eligible pool
   */
  async checkAndUpgradePool(userId: number): Promise<{
    upgraded: boolean;
    previousPoolId: number | null;
    newPoolId: number | null;
    message: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, poolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all pools ordered by id (ascending, so pool 1, 2, 3, etc.)
    const pools = await this.prisma.pool.findMany({
      orderBy: { id: 'asc' },
    });

    let highestEligiblePoolId: number | null = null;

    // Check eligibility for each pool, starting from the highest
    for (let i = pools.length - 1; i >= 0; i--) {
      const pool = pools[i];
      const eligibility = await this.checkPoolEligibility(userId, pool.id);

      if (eligibility.eligible) {
        highestEligiblePoolId = pool.id;
        break;
      }
    }

    // If user is already in the highest eligible pool, no upgrade needed
    if (user.poolId === highestEligiblePoolId) {
      return {
        upgraded: false,
        previousPoolId: user.poolId,
        newPoolId: highestEligiblePoolId,
        message: 'User is already in the highest eligible pool',
      };
    }

    // Upgrade user to the highest eligible pool
    if (highestEligiblePoolId !== null) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { poolId: highestEligiblePoolId },
      });

      return {
        upgraded: true,
        previousPoolId: user.poolId,
        newPoolId: highestEligiblePoolId,
        message: 'User pool upgraded successfully',
      };
    }

    // No pool eligible, remove pool assignment if user had one
    if (user.poolId !== null) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { poolId: null },
      });
    }

    return {
      upgraded: false,
      previousPoolId: user.poolId,
      newPoolId: null,
      message: 'User does not qualify for any pool',
    };
  }
}
