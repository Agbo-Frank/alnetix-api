import { IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionType } from 'src/generated/enums';

export class GetCommissionsDto {
  @IsOptional()
  @IsEnum(CommissionType)
  type?: CommissionType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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

export interface AffiliateBonus {
  userId: number;
  level: number;
  bonus: number;
  commission: number | null;
}

export interface UnstoppableBonus extends Omit<AffiliateBonus, 'level' | 'bonus'> {
  rank: string | null;
  is_qualified: boolean;
  is_actived: boolean;
  default_bonus: number;
  bonus: number | null;
}