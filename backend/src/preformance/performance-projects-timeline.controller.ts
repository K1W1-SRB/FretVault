import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PerformanceProjectService } from './performance-projects.service';

@UseGuards(AuthGuard('jwt'))
@Controller('/performance/projects')
export class PerformanceProjectsTimelineController {
  constructor(private readonly projectService: PerformanceProjectService) {}

  @Get(':projectId')
  findOne(@Param('projectId') projectId: string) {
    return this.projectService.findOneTimeline(projectId);
  }
}
