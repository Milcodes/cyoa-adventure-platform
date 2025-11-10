import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'User password (minimum 8 characters)', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Display name for the user', minLength: 2 })
  @IsString()
  @MinLength(2)
  display_name: string;

  @ApiPropertyOptional({ example: 'en', description: 'Preferred language (hu, de, en, es, fr)', enum: ['hu', 'de', 'en', 'es', 'fr'] })
  @IsOptional()
  @IsEnum(['hu', 'de', 'en', 'es', 'fr'])
  preferred_language?: string;

  @ApiPropertyOptional({ example: 'player', description: 'User role', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
