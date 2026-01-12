import { Module } from '@nestjs/common';
import { UtilsModule } from './utils/utils.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    UtilsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule { }
