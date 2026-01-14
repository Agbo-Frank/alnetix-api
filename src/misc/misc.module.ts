import { Module } from '@nestjs/common';
import { MiscService } from './misc.service';
import { MiscController } from './misc.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MiscService],
  controllers: [MiscController],
  exports: [MiscService],
})
export class MiscModule { }
