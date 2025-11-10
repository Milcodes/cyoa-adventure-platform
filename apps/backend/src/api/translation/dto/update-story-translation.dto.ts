import { IsString, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { TranslationStatus } from '@prisma/client';

export class UpdateStoryTranslationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsOptional()
  @IsEnum(TranslationStatus)
  translationStatus?: TranslationStatus;
}
