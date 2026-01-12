import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { AppConfigService } from '../env';

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule { }
