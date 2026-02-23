import { Module } from '@nestjs/common';
import { PerformanceClipsController } from './performance-clips.controller';
import { PerformanceClipsService } from './performance-clips.service';
import { PerformanceProjectsController } from './performance-projects.controller';
import { PerformanceProjectsTimelineController } from './performance-projects-timeline.controller';
import { PerformanceProjectService } from './performance-projects.service';
import { PrismaService } from 'prisma/prisma.service';
import { PerformanceTrackController } from './performance-tracks.controller';
import { PerformanceTracksService } from './performance-tracks.service';
import { R2StorageService } from 'src/storage/r2-storage.service';

@Module({
  controllers: [
    PerformanceProjectsController,
    PerformanceProjectsTimelineController,
    PerformanceTrackController,
    PerformanceClipsController,
  ],
  providers: [
    PerformanceProjectService,
    PerformanceClipsService,
    PerformanceTracksService,
    PrismaService,
    R2StorageService,
  ],
})
export class ProjectsModule {}
