import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListNotesQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsIn(['updatedAt', 'createdAt', 'title'])
  sort?: 'updatedAt' | 'createdAt' | 'title';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
