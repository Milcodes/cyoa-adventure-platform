import {
  IsString,
  IsOptional,
  MaxLength,
  IsObject,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { MediaLayout } from '@prisma/client';

export class CreateNodeDto {
  @IsString()
  @MaxLength(100)
  key: string; // Unique node identifier (e.g., 'start', 'forest_path', 'dragon_encounter')

  @IsString()
  textMd: string; // Markdown content

  @IsOptional()
  @IsString()
  mediaRef?: string; // S3 reference or URL

  @IsOptional()
  @IsEnum(MediaLayout)
  layout?: MediaLayout; // Default: 'image'

  @IsOptional()
  @IsArray()
  diceChecks?: any[]; // Dice check requirements

  @IsOptional()
  @IsArray()
  conditions?: any[]; // JSONLogic conditions

  @IsOptional()
  @IsArray()
  effects?: any[]; // Effects to apply

  @IsOptional()
  @IsArray()
  choices?: any[]; // Choice options

  @IsOptional()
  @IsBoolean()
  isTerminal?: boolean; // Is this an ending node?
}
