import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { PerformanceClipsService } from './performance-clips.service';
import { CreatePerformanceClipDto } from './dto/create-performance-clip.dto';
import { UpdatePerformanceClipDto } from './dto/update-performance-clip.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('/performance')
export class PerformanceClipsController {
  constructor(private readonly clipsService: PerformanceClipsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('tracks/:trackId/clips')
  create(
    @Param('trackId') trackId: string,
    @Body() dto: CreatePerformanceClipDto,
  ) {
    return this.clipsService.create(trackId, dto);
  }

  @Patch('clips/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePerformanceClipDto) {
    return this.clipsService.update(id, dto);
  }

  @Delete('clips/:id')
  delete(@Param('id') id: string) {
    return this.clipsService.delete(id);
  }
}
