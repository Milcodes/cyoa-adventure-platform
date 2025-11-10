import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { TranslationStatus } from '@prisma/client';

export class UpdateNodeTranslationDto {
  @IsOptional()
  @IsString()
  textMd?: string;

  @IsOptional()
  @IsObject()
  choicesLabels?: Record<string, any>;

  @IsOptional()
  @IsEnum(TranslationStatus)
  translationStatus?: TranslationStatus;
}
