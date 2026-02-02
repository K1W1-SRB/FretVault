import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreatePracticeItemDto } from 'src/practise-items/dto/create-practice-item.dto';

export class CreatePracticePlanDto {
  @IsString()
  name: string;

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
  @Type(() => CreatePracticeItemDto)
  items?: CreatePracticeItemDto[];
}
