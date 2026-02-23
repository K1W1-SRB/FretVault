import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { User } from 'src/auth/user.decorator';
import { AssetsService } from './assets.service';
import { BulkDownloadUrlsDto } from './dto/bulk-download-urls.dto';
import { FinalizeAssetDto } from './dto/finalize-asset.dto';
import { PresignAssetDto } from './dto/presign-asset.dto';

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post('presign')
  presign(@Body() dto: PresignAssetDto, @User('id') userId: number) {
    return this.assets.presign(dto, userId);
  }

  @Post(':assetId/finalize')
  finalize(
    @Param('assetId') assetId: string,
    @Body() dto: FinalizeAssetDto,
    @User('id') userId: number,
  ) {
    return this.assets.finalize(assetId, dto, userId);
  }

  @Post('download-urls')
  downloadUrls(@Body() dto: BulkDownloadUrlsDto, @User('id') userId: number) {
    return this.assets.getDownloadUrls(dto, userId);
  }

  @Get(':assetId/download-url')
  downloadUrl(@Param('assetId') assetId: string, @User('id') userId: number) {
    return this.assets.getDownloadUrl(assetId, userId);
  }
}
