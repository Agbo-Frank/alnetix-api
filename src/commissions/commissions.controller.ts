import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, Pagination, PaginationParams } from '../utils';
import { GetCommissionsDto } from './dto';
import type { User } from 'src/generated/client';

@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) { }

  @Get()
  async getCommissions(
    @CurrentUser() user: User,
    @Query() query: GetCommissionsDto,
    @Pagination() pagination: PaginationParams,
  ) {

    return this.commissionsService.getUserCommissions(user.id, query, pagination);
  }

  @Get('reconcile')
  async reconcileBalance(@CurrentUser() user: User) {
    return this.commissionsService.reconcileBalance(user.id);
  }
}
