import { IsOptional, IsString } from 'class-validator';

export class ListFocusSessionsQuery {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  targetId?: string;
}
