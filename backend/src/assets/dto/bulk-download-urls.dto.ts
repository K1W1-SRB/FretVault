import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BulkDownloadUrlsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  assetIds: string[];
}
