import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { MediaLayout } from '@prisma/client';

export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  textMd?: string;

  @IsOptional()
  @IsString()
  mediaRef?: string;

  @IsOptional()
  @IsEnum(MediaLayout)
  layout?: MediaLayout;

  @IsOptional()
  @IsArray()
  diceChecks?: any[];

  @IsOptional()
  @IsArray()
  conditions?: any[];

  @IsOptional()
  @IsArray()
  effects?: any[];

  @IsOptional()
  @IsArray()
  choices?: any[];

  @IsOptional()
  @IsBoolean()
  isTerminal?: boolean;
}
