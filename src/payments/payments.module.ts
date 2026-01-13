import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CoinPaymentModule } from './coinpayment/coinpayment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UtilsModule } from '../utils/utils.module';
import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [
    PrismaModule,
    UtilsModule,
    CoinPaymentModule,
    CommissionsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }
