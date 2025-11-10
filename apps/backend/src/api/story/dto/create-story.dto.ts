import { IsString, IsOptional, MaxLength, IsArray, IsEnum } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  genre?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  primaryLanguage?: string; // Default: 'hu'

  @IsOptional()
  @IsArray()
  availableLanguages?: string[]; // Default: ['hu']
}
