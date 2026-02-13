import { PartialType } from '@nestjs/swagger';
import { CreatePerformanceTrackDto } from './create-performance-track.dto';

export class UpdatePerformanceTrackDto extends PartialType(
  CreatePerformanceTrackDto,
) {}
