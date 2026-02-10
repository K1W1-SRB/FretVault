// assets/dto/presign-asset.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PresignAssetDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  contentType!: string;

  @IsString()
  fileExt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1024 * 1024 * 200) // 200MB cap (tune it)
  byteSizeEstimate?: number;
}
