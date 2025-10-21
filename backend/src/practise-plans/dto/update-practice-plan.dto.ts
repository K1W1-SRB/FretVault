import { IsOptional, IsString } from 'class-validator';

// update-plan.dto.ts
export class UpdatePracticePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
