import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PracticeTargetType } from '@prisma/client';

export class UpdateFocusTargetDto {
  @IsOptional()
  @IsEnum(PracticeTargetType)
  type?: PracticeTargetType;

  @IsOptional()
  @IsString()
  refId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
