
import { IsNotEmpty, IsString, Matches, MinLength, IsEmail, IsDateString } from 'class-validator';

export class ValidateReferralCodeDto {
  @IsString()
  @IsNotEmpty()
  referralCode: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must be a strong password',
  })
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must be a strong password',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  referralCode?: string;
}
