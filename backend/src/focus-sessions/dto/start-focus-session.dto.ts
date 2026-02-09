import { IsString } from 'class-validator';

export class StartFocusSessionDto {
  @IsString()
  targetId: string;
}
