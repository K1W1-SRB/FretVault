import { IsString, IsOptional, IsInt, IsJSON } from 'class-validator';

export class CreateRevisionDto {
  @IsInt()
  tabId: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsJSON()
  score: any;
}
