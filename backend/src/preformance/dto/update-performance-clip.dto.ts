import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePerformanceClipDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  startMs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offsetInAssetMs?: number;
}
