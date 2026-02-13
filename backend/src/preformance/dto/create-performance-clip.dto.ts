import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePerformanceClipDto {
  @IsString()
  assetId: string;

  @IsInt()
  @Min(0)
  startMs: number;

  @IsInt()
  @Min(1)
  durationMs: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offsetInAssetMs?: number;
}
