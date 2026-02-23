import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PerformanceProjectService } from './performance-projects.service';
import { User } from 'src/auth/user.decorator';
import { ExportPerformanceProjectMp4Dto } from './dto/export-performance-project-mp4.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('/performance/projects')
export class PerformanceProjectsTimelineController {
  constructor(private readonly projectService: PerformanceProjectService) {}

  @Get(':projectId')
  findOne(@Param('projectId') projectId: string, @User('id') userId: number) {
    return this.projectService.findOneTimeline(projectId, userId);
  }

  @Post(':projectId/export-mp4')
  @UseInterceptors(FileInterceptor('coverImage'))
  async exportMp4(
    @Param('projectId') projectId: string,
    @User('id') userId: number,
    @Body() dto: ExportPerformanceProjectMp4Dto,
    @UploadedFile() coverImage: { buffer: Buffer; mimetype?: string } | null,
    @Res() res: Response,
  ) {
    const result = await this.projectService.exportMp4(
      projectId,
      userId,
      dto,
      coverImage ?? undefined,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', result.buffer.length.toString());
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.send(result.buffer);
  }
}
