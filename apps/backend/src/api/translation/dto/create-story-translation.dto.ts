import { IsString, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { TranslationStatus } from '@prisma/client';

export class CreateStoryTranslationDto {
  @IsString()
  @MaxLength(5)
  locale: string; // e.g., 'en', 'de', 'hu'

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsOptional()
  @IsEnum(TranslationStatus)
  translationStatus?: TranslationStatus; // Default: incomplete
}
