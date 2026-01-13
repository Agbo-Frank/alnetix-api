import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import type { User } from 'src/generated/client';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) { }

  @Get('checkout')
  @UseGuards(JwtAuthGuard)
  async getCheckoutDetails(
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.getCheckoutDetails(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserPayments(
    @CurrentUser() user: User,
    @Pagination() pagination: PaginationParams,
  ) {
    return this.paymentsService.getUserPayments(user.id, pagination);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(
    @CurrentUser() user: User,
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
      return this.paymentsService.handleCoinPaymentWebhook(ipnData, hmac);
    } catch (error) {
      throw error;
    }
  }
}
