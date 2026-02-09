import { IsOptional, IsString } from 'class-validator';

export class TargetStatsQuery {
  @IsOptional()
  @IsString()
  limit?: string;
}
