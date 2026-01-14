import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MiscService {
  constructor(private prisma: PrismaService) { }

  async validateReferralCode(referralCode: string) {
    const user = await this.prisma.user.findFirst({
      where: { referral_code: referralCode },
      select: { id: true },
    });

    const isValid = !!user;

    return {
      message: `Referral code ${isValid ? 'is valid' : 'is invalid'}`,
      data: { valid: isValid },
    };
  }
}
