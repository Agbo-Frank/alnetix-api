import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  name: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;
}

export class UpdateWalletDto {
  @IsString()
  @IsOptional()
  wallet_address?: string;
}