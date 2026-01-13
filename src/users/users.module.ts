import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../utils/storage/storage.module';
import { UtilsModule } from '../utils/utils.module';

@Module({
  imports: [PrismaModule, StorageModule, UtilsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
