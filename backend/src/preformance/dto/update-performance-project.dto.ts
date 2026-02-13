import { PartialType } from '@nestjs/swagger';
import { CreatePerformanceProjectDto } from './create-performance-project.dto';

export class UpdatePerformanceProjectDto extends PartialType(
  CreatePerformanceProjectDto,
) {}
