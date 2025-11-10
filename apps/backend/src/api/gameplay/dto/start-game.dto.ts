import { IsString, IsUUID, IsOptional, IsObject, IsInt, Min } from 'class-validator';

export class StartGameDto {
  @IsUUID()
  storyId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  saveSlot?: number; // Optional save slot number (default: 0)

  @IsOptional()
  @IsObject()
  customStats?: Record<string, number>;

  @IsOptional()
  @IsString()
  seed?: string; // Optional seed for deterministic randomness
}
