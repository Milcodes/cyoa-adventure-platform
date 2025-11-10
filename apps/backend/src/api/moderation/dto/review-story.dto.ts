import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ModerationStatus } from '@prisma/client';

export class ReviewStoryDto {
  @IsEnum(ModerationStatus)
  status: ModerationStatus; // 'approved' or 'rejected'

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string; // Moderator's review notes (reason for rejection, etc.)
}
