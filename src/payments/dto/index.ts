import { IsInt, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentItemType } from 'src/generated/enums';

export class CreatePaymentDto {
  @IsInt()
  @IsOptional()
  packageId?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? value : true))
  includeMembershipFee?: boolean = true;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value || 'USD')
  currency?: string = 'USD';
}

export interface PaymentItem {
  type: PaymentItemType;
  name: string;
  amount: number;
  referenceId?: number | null;
}
