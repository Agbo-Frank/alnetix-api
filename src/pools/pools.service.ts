import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient, Pool, User } from 'src/generated/client';
import { PinoLogger } from 'nestjs-pino';

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger
  ) { }


  async checkAndUpgradePool(userId: number, pools: Pool[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    const nextPoolId = user.poolId ? user.poolId + 1 : 1;
    if (nextPoolId > pools.length) {
      this.logger.debug(`User ${userId} is already in the highest pool`);
      return;
    }

    const nextPool = pools.find(pool => pool.id === nextPoolId);
    if (!nextPool) {
      this.logger.debug(`Next pool not found for user ${userId}`);
      return;
    }

    const {
      min_direct_members,
      min_turnover,
      min_team_turnover,
      max_turnover_per_leg,
    } = nextPool

    if (user.turnover < min_turnover) {
      this.logger.debug(`User ${userId} does not have enough turnover`);
      return;
    }

    const directMembers = await this.prisma.user.findMany({
      where: {
        referred_by_code: user.referral_code,
      },
    });

    if (directMembers.length < min_direct_members) {
      this.logger.debug(`User ${userId} does not have enough direct members`);
      return;
    }

    const teamTurnover = await this.getTeamTurnover(max_turnover_per_leg, directMembers);
    if (teamTurnover < min_team_turnover) {
      this.logger.debug(`User ${userId} does not have enough team turnover`);
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { poolId: nextPoolId },
    });

    this.logger.debug(`User ${userId} upgraded to pool ${nextPoolId}`);
  }

  private async getTeamTurnover(maxTurnoverPerLeg: number, directMembers: User[]) {
    const team_turnover = directMembers.reduce((total, member) => {
      return total + Math.min(member.turnover, maxTurnoverPerLeg);
    }, 0);

    return team_turnover;
  }
}
