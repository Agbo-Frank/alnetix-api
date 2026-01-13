import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, Pagination, PaginationParams } from '../utils';
import { CoinPaymentIPN } from './coinpayment/coinpayment.interface';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) { }

  @Get('checkout')
  async getCheckoutDetails(
    @CurrentUser() user: { id: number },
  ) {
    return this.paymentsService.getCheckoutDetails(user.id);
  }

  @Post()
  async createPayment(
    @CurrentUser() user: { id: number },
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(user.id, dto);
  }

  @Get()
  async getUserPayments(
    @CurrentUser() user: { id: number },
    @Pagination() pagination: PaginationParams,
  ) {
    return this.paymentsService.getUserPayments(user.id, pagination);
  }

  @Get(':id')
  async getPayment(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) paymentId: number,
  ) {
    return this.paymentsService.getPaymentById(paymentId, user.id);
  }

  @Post("webhook/coinpayment")
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() ipnData: CoinPaymentIPN,
    @Headers('hmac') hmac: string,
  ) {
    try {
      await this.paymentsService.handleCoinPaymentWebhook(ipnData, hmac);

      return 'OK';
    } catch (error) {
      throw error;
    }
  }
}
