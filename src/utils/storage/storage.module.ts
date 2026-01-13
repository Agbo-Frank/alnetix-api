import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { UtilsModule } from '../utils.module';

@Module({
  imports: [UtilsModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class StorageModule { }
