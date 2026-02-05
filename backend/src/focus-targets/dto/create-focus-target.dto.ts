import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PracticeTargetType } from '@prisma/client';

export class CreateFocusTargetDto {
  @IsString()
  workspaceId: string;

  @IsEnum(PracticeTargetType)
  type: PracticeTargetType;

  @IsOptional()
  @IsString()
  refId?: string | null;

  @IsString()
  @MaxLength(200)
  title: string;
}
