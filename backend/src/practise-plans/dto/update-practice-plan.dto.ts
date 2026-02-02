import { PracticeItem } from '@prisma/client';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

// update-plan.dto.ts
export class UpdatePracticePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  sourceNoteSlug?: string;

  @IsOptional()
  @IsString()
  sourceNoteTitle?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  items?: PracticeItem[];
}
