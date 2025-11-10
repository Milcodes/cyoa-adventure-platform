import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitForReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string; // Optional notes from author about the story
}
