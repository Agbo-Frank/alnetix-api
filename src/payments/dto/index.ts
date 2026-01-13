import { IsInt, IsString, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  packageId: number;

  @IsString()
  @IsOptional()
  currency?: string; // Optional: defaults to USD, can specify crypto currency
}