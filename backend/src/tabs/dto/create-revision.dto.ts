import { IsString, IsOptional, IsInt, IsJSON } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateRevisionDto {
  @IsInt()
  tabId: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsJSON()
  score: Prisma.InputJsonValue;
}
