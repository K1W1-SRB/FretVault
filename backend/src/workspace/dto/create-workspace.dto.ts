import { IsEnum, IsString, MaxLength } from 'class-validator';
import { WorkspaceType } from '@prisma/client';

export class CreateWorkspaceDto {
  @IsEnum(WorkspaceType)
  type: WorkspaceType; // PERSONAL should be blocked in controller/service

  @IsString()
  @MaxLength(80)
  name: string;

  @IsString()
  @MaxLength(80)
  slug: string; // validate/slugify server-side too
}
