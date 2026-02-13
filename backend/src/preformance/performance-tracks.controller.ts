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
import { PerformanceTracksService } from './performance-tracks.service';
import { CreatePerformanceTrackDto } from './dto/create-performance-track.dto';
import { UpdatePerformanceTrackDto } from './dto/update-performance-track.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('/workspaces/:workspaceId/tracks')
export class PerformanceTrackController {
  constructor(private readonly trackService: PerformanceTracksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreatePerformanceTrackDto,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.trackService.create(dto, workspaceId);
  }

  @Patch(':trackId')
  update(
    @Body() dto: UpdatePerformanceTrackDto,
    @Param('workspaceId') workspaceId: string,
    @Param('trackId') trackId: string,
  ) {
    return this.trackService.update(dto, workspaceId, trackId);
  }

  @Delete(':trackId')
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('trackId') trackId: string,
  ) {
    return this.trackService.delete(workspaceId, trackId);
  }
}
