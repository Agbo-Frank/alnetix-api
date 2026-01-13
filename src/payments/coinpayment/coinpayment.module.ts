import { Module } from '@nestjs/common';
import { CoinPaymentService } from './coinpayment.service';
import { UtilsModule } from '../../utils/utils.module';

@Module({
  imports: [UtilsModule],
  providers: [CoinPaymentService],
  exports: [CoinPaymentService],
})
export class CoinPaymentModule { }
