import { Module } from '@nestjs/common';
import { UtilsModule } from './utils/utils.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { CommissionsModule } from './commissions/commissions.module';

@Module({
  imports: [
    UtilsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PaymentsModule,
    CommissionsModule,
  ],
})
export class AppModule { }
