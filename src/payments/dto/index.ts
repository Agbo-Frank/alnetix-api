import { IsInt, IsString, IsOptional, Min } from 'class-validator';
import { Package } from 'src/generated/client';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  packageId: number;

  @IsString()
  @IsOptional()
  currency?: string; // Optional: defaults to USD, can specify crypto currency
}

export class CheckoutDetailsResponseDto {
  availablePackages: Package[];
  supportedCurrencies: string[];
}
