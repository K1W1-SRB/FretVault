import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreatePracticeItemDto } from 'src/practise-items/dto/create-practice-item.dto';

export class CreatePracticePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePracticeItemDto)
  items: CreatePracticeItemDto[];
}
