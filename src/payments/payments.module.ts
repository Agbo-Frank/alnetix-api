import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CoinPaymentModule } from './coinpayment/coinpayment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UtilsModule } from '../utils/utils.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { PoolsModule } from '../pools/pools.module';

@Module({
  imports: [
    PrismaModule,
    UtilsModule,
    CoinPaymentModule,
    CommissionsModule,
    PoolsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }
