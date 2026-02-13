import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PerformanceProjectService } from './performance-projects.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { User } from 'src/auth/user.decorator';
import { CreatePerformanceProjectDto } from './dto/create-performance-project.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePerformanceProjectDto } from './dto/update-performance-project.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('/workspaces/:workspaceId/projects')
export class PerformanceProjectsController {
  constructor(private readonly projectService: PerformanceProjectService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreatePerformanceProjectDto,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.projectService.create(dto, workspaceId);
  }

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.projectService.findAll(workspaceId);
  }

  @Get(':projectId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectService.findOne(workspaceId, projectId);
  }

  @Patch(':projectId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdatePerformanceProjectDto,
  ) {
    return this.projectService.update(dto, workspaceId, projectId);
  }

  @Delete(':projectId')
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectService.delete(workspaceId, projectId);
  }
}
