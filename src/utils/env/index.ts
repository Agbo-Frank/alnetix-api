import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) { }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL') || '';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get smtpHost(): string {
    return this.configService.get<string>('SMTP_HOST') || '';
  }

  get smtpPort(): number {
    return this.configService.get<number>('SMTP_PORT', 587);
  }

  get smtpSecure(): boolean {
    const secure = this.configService.get<string>('SMTP_SECURE');
    if (secure) {
      return secure === 'true';
    }
    return this.smtpPort === 465;
  }

  get smtpUser(): string {
    return this.configService.get<string>('SMTP_USER') || '';
  }

  get smtpPassword(): string {
    return this.configService.get<string>('SMTP_PASSWORD') || '';
  }

  get frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || '';
  }

  get backendUrl(): string {
    return this.configService.get<string>('BACKEND_URL') || '';
  }

  get whitelistedOrigins(): string[] {
    const origins = this.configService.get<string>('WHITELISTED_ORIGINS');
    if (!origins) {
      return [this.frontendUrl];
    }
    return origins.split(',').map((origin) => origin.trim());
  }

  get mailFromName(): string {
    return this.configService.get<string>('MAIL_FROM_NAME') || '';
  }

  get mailFromAddress(): string {
    return this.configService.get<string>('MAIL_FROM_ADDRESS') || '';
  }

  get coinpaymentPublicKey(): string {
    return this.configService.get<string>('COINPAYMENT_PUBLIC_KEY') || '';
  }

  get coinpaymentPrivateKey(): string {
    return this.configService.get<string>('COINPAYMENT_PRIVATE_KEY') || '';
  }

  get coinpaymentMerchantId(): string | undefined {
    return this.configService.get<string>('COINPAYMENT_MERCHANT_ID');
  }

  get ipnUrl(): string {
    return `${this.backendUrl}/payments/webhook/coinpayment`;
  }

  get coinpaymentIpnSecret(): string {
    return this.configService.get<string>('COINPAYMENT_IPN_SECRET') || '';
  }

  get awsEndpoint(): string {
    return this.configService.get<string>('AWS_ENDPOINT') || '';
  }

  get awsRegion(): string {
    return this.configService.get<string>('AWS_REGION') || 'us-east-1';
  }

  get awsAccessKeyId(): string {
    return this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
  }

  get awsSecretAccessKey(): string {
    return this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';
  }

  get awsS3Bucket(): string {
    return this.configService.get<string>('AWS_S3_BUCKET') || '';
  }
}
