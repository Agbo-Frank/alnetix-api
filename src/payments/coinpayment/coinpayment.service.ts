import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { AppConfigService } from '../../utils/env';
import { CoinPaymentRatesResponse, CoinPaymentTransactionResponse, CreateTransactionParams } from './coinpayment.interface';

@Injectable()
export class CoinPaymentService {
  private readonly client: AxiosInstance;
  private readonly baseUrl = 'https://www.coinpayments.net/api.php';

  constructor(
    private readonly logger: PinoLogger,
    private readonly env: AppConfigService,
  ) {
    this.logger.setContext(CoinPaymentService.name);
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Create HMAC signature for CoinPayment API requests
   */
  private createHmac(data: string): string {
    return crypto
      .createHmac('sha512', this.env.coinpaymentPrivateKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify IPN signature from CoinPayment webhook
   */
  verifyIpnSignature(ipnData: Record<string, unknown>, hmac: string): boolean {
    const sortedKeys = Object.keys(ipnData).sort();
    const queryString = sortedKeys
      .map((key) => `${key}=${ipnData[key]}`)
      .join('&');

    const calculatedHmac = crypto
      .createHmac('sha512', this.env.coinpaymentIpnSecret)
      .update(queryString)
      .digest('hex');

    return calculatedHmac === hmac;
  }

  /**
   * Create a transaction with CoinPayment
   */
  async createTransaction(
    params: CreateTransactionParams,
  ): Promise<CoinPaymentTransactionResponse['result']> {
    try {
      const payload = {
        version: 1,
        cmd: 'create_transaction',
        key: this.env.coinpaymentPublicKey,
        format: 'json',
        ...params,
      };

      const formData = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const hmac = this.createHmac(formData.toString());

      const response = await this.client.post<CoinPaymentTransactionResponse>(
        '',
        formData.toString(),
        {
          headers: {
            HMAC: hmac,
          },
        },
      );

      if (response.data.error && response.data.error !== 'ok') {
        this.logger.error(
          { error: response.data.error, params },
          'CoinPayment API error',
        );
        throw new BadRequestException(
          `CoinPayment error: ${response.data.error}`,
        );
      }

      if (!response.data.result) {
        throw new BadRequestException('Invalid response from CoinPayment');
      }

      this.logger.info(
        { txn_id: response.data.result.txn_id },
        'Transaction created successfully',
      );

      return response.data.result;
    } catch (error) {
      this.logger.error({ err: error, params }, 'Failed to create transaction');
      throw error;
    }
  }

  async getRates(
    accepted: number = 1,
  ): Promise<CoinPaymentRatesResponse['result']> {
    try {
      const payload = {
        version: 1,
        cmd: 'rates',
        key: this.env.coinpaymentPublicKey,
        format: 'json',
        accepted,
      };

      const formData = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const hmac = this.createHmac(formData.toString());

      const response = await this.client.post<CoinPaymentRatesResponse>(
        '',
        formData.toString(),
        {
          headers: {
            HMAC: hmac,
          },
        },
      );

      if (response.data.error && response.data.error !== 'ok') {
        this.logger.error(
          { error: response.data.error },
          'CoinPayment rates API error',
        );
        throw new BadRequestException(
          `CoinPayment error: ${response.data.error}`,
        );
      }

      if (!response.data.result) {
        throw new BadRequestException('Invalid response from CoinPayment');
      }

      return response.data.result;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to get rates');
      throw error;
    }
  }

  async getSupportedCurrencies(): Promise<string[]> {
    return ['USD', 'BTC', 'ETH', 'LTC'];
  }
}
