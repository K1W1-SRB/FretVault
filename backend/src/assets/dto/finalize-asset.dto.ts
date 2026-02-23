import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class FinalizeAssetDto {
  @IsInt()
  @Min(1)
  byteSize!: number;

  @IsOptional()
  @IsString()
  sha256?: string;

  @IsInt()
  @Min(1)
  durationMs!: number;

  @IsInt()
  @Min(8000)
  sampleRate!: number;

  @IsInt()
  @Min(1)
  @Max(8)
  channels!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2048)
  @IsNumber({}, { each: true })
  waveformPeaks?: number[];
}
