import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsEmail,
  IsUrl,
  Min,
  Max,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  SMTP_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  SMTP_PORT: number = 587;

  @IsString()
  SMTP_USER: string;

  @IsString()
  SMTP_PASSWORD: string;

  @IsUrl({ require_protocol: true })
  FRONTEND_URL: string;

  @IsEmail()
  MAIL_FROM_ADDRESS: string;

  @IsString()
  MAIL_FROM_NAME: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}