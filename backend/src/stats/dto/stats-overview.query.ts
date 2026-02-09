import { IsOptional, IsString } from 'class-validator';

export class StatsOverviewQuery {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
