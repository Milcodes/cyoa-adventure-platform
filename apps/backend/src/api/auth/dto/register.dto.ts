import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  display_name: string;

  @IsOptional()
  @IsEnum(['hu', 'de', 'en', 'es', 'fr'])
  preferred_language?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
