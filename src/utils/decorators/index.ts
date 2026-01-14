import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationParams {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const Pagination = createParamDecorator((
  data: { defaultPage?: number; defaultLimit?: number; maxLimit?: number } = {},
  ctx: ExecutionContext
): PaginationParams => {
  const request = ctx.switchToHttp().getRequest();
  const query = request.query;

  const defaultPage = data.defaultPage ?? 1;
  const defaultLimit = data.defaultLimit ?? 25;
  const maxLimit = data.maxLimit ?? 100;

  // Extract and parse page
  let page = defaultPage;
  if (query.page !== undefined) {
    const pageNum = parseInt(query.page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('Page must be a positive integer');
    }
    page = pageNum;
  }

  // Extract and parse limit
  let limit = defaultLimit;
  if (query.limit !== undefined) {
    const limitNum = parseInt(query.limit, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }
    if (limitNum > maxLimit) {
      throw new BadRequestException(`Limit cannot exceed ${maxLimit}`);
    }
    limit = limitNum;
  }

  return { page, limit };
},
);
