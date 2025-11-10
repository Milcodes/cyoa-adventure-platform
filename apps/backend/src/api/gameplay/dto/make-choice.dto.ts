import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class MakeChoiceDto {
  @IsString()
  saveId: string;

  @IsInt()
  @Min(0)
  choiceIndex: number;

  @IsOptional()
  @IsString()
  locale?: string; // Optional locale for translations (default: 'hu')
}
