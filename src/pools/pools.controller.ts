import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { PoolsService } from './pools.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../utils';
import { User } from 'src/generated/client';

@Controller('pools')
@UseGuards(JwtAuthGuard)
export class PoolsController {
  constructor(private poolsService: PoolsService) { }

  @Get()
  getPools() {
    return this.poolsService.getPools();
  }
}
