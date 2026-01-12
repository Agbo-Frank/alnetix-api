import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './env';
import { MailService } from './mail/mail.service';
import { getLoggerConfig } from './logger';
import { validate } from './env/validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env.local', '.env'],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getLoggerConfig(configService),
    }),
  ],
  providers: [AppConfigService, MailService],
  exports: [AppConfigService, MailService],
})
export class UtilsModule { }
