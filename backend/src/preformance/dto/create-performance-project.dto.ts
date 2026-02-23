import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreatePerformanceProjectDto {
  @IsString()
  workspaceId: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsInt()
  @Min(1)
  bpm: number;

  @IsInt()
  @Min(1)
  sampleRate: number;
}
