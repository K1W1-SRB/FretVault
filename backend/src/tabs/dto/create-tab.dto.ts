import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateTabDto {
  @IsInt()
  songId: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  tuning?: string; // default "EADGBE"

  @IsOptional()
  @IsInt()
  tempo?: number;

  @IsOptional()
  @IsInt()
  timeSigTop?: number;

  @IsOptional()
  @IsInt()
  timeSigBot?: number;

  @IsOptional()
  @IsInt()
  capo?: number;
}
