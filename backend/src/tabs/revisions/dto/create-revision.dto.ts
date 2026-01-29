import { IsInt, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateRevisionDto {
  @IsInt()
  tabId: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsObject()
  score: any; // canonical tab JSON from your editor
}
