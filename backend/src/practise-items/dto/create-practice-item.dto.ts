import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { PracticeTargetType } from '@prisma/client';
import { PracticeCategory } from '../types/practice-item.types';

export class CreatePracticeItemDto {
  @IsString()
  title: string;

  @IsEnum(PracticeCategory)
  category: PracticeCategory;

  @IsInt()
  @IsPositive()
  duration: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  planId: number;

  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  @IsEnum(PracticeTargetType)
  targetType?: PracticeTargetType;

  @IsOptional()
  @IsString()
  targetRefId?: string;
}
