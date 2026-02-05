import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { FocusDifficulty, FocusMetricType } from '@prisma/client';

export class EndFocusSessionDto {
  @IsOptional()
  @IsEnum(FocusMetricType)
  metricType?: FocusMetricType;

  @IsOptional()
  @IsNumber()
  metricValue?: number;

  @IsOptional()
  @IsEnum(FocusDifficulty)
  difficulty?: FocusDifficulty;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
