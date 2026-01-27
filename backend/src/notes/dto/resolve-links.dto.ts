import { IsArray, IsString, MaxLength } from 'class-validator';

export class ResolveLinksDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(220, { each: true })
  slugs: string[];
}
