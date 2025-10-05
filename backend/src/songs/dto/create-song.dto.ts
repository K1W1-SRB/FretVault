import { IsString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { Visibility } from 'src/common/enums/visibility.enum';

export class CreateSongDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsInt()
  tempo?: number;

  @IsOptional()
  @IsString()
  key?: string; // e.g. "C major"

  @IsOptional()
  @IsInt()
  capo?: number;

  @IsOptional()
  @IsInt()
  timeSigTop?: number;

  @IsOptional()
  @IsInt()
  timeSigBot?: number;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;
}
