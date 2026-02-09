import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PracticeTargetType } from '@prisma/client';

export class ListFocusTargetsQuery {
  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsEnum(PracticeTargetType)
  type?: PracticeTargetType;

  @IsOptional()
  @IsString()
  refId?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
