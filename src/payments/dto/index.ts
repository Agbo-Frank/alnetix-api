import { IsInt, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePaymentDto {
  @IsInt()
  @IsNotEmpty({ message: 'packageId is required' })
  packageId: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value || 'USD')
  currency?: string = 'USD';
}