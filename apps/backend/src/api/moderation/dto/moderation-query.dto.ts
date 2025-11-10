import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ModerationStatus } from '@prisma/client';

export class ModerationQueryDto {
  @IsOptional()
  @IsEnum(ModerationStatus)
  status?: ModerationStatus; // Filter by status

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number; // Pagination limit (default: 20)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number; // Pagination offset (default: 0)
}
