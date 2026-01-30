import { IsInt, IsOptional, IsString, IsObject } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateRevisionDto {
  @IsInt()
  tabId: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsObject()
  score: Prisma.InputJsonValue; // canonical tab JSON from your editor
}
