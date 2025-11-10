import { IsString, MaxLength, IsOptional, IsEnum, IsObject } from 'class-validator';
import { TranslationStatus } from '@prisma/client';

export class CreateNodeTranslationDto {
  @IsString()
  @MaxLength(5)
  locale: string; // e.g., 'en', 'de', 'hu'

  @IsString()
  textMd: string; // Markdown content

  @IsOptional()
  @IsObject()
  choicesLabels?: Record<string, any>; // Translated choice labels

  @IsOptional()
  @IsEnum(TranslationStatus)
  translationStatus?: TranslationStatus; // Default: incomplete
}
