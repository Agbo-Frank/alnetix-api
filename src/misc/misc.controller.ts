import { Controller, Get, Param } from '@nestjs/common';
import { MiscService } from './misc.service';

@Controller()
export class MiscController {
  constructor(private miscService: MiscService) { }

  @Get('validate/referral-code/:code')
  validateReferralCode(@Param('code') code: string) {
    return this.miscService.validateReferralCode(code);
  }
}
