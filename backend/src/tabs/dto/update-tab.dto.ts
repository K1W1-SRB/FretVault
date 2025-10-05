import { PartialType } from '@nestjs/mapped-types';
import { CreateTabDto } from './create-tab.dto';

export class UpdateTabDto extends PartialType(CreateTabDto) {}
