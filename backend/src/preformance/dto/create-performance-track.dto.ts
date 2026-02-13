import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePerformanceTrackDto {
  @IsString()
  workspaceId: string;

  @IsString()
  projectId: string;

  @IsInt()
  index: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-60)
  @Max(12)
  gainDb?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(-1)
  @Max(1)
  pan?: number;

  @IsOptional()
  @IsBoolean()
  mute?: boolean;

  @IsOptional()
  @IsBoolean()
  solo?: boolean;
}
