import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePerformanceProjectDto } from './dto/create-performance-project.dto';
import { PerformanceProjectType } from './types/performanceProject.type';
import { UpdatePerformanceProjectDto } from './dto/update-performance-project.dto';

@Injectable()
export class PerformanceProjectService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePerformanceProjectDto, workspaceId: string) {
    return this.prisma.performanceProject.create({
      data: { ...dto, workspaceId },
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.performanceProject.findMany({
      where: {
        workspaceId: workspaceId,
      },
    });
  }

  async findOne(workspaceId: string, projectId: string) {
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    if (project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Performance project is not in workspace');
    }

    return project;
  }

  async findOneTimeline(projectId: string) {
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
      include: {
        tracks: {
          orderBy: { index: 'asc' },
          include: {
            clips: {
              orderBy: { startMs: 'asc' },
              include: {
                asset: {
                  select: {
                    id: true,
                    contentType: true,
                    byteSize: true,
                    durationMs: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    const { tracks, ...projectData } = project;

    return {
      project: projectData,
      tracks,
    };
  }

  async update(dto: UpdatePerformanceProjectDto, projectId, workspaceId) {
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    if (project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Performance Porject is not in workspace');
    }

    const updatedProject = await this.prisma.performanceProject.update({
      where: { id: projectId },
      data: { ...dto },
    });

    return updatedProject;
  }

  async delete(projectId, workspaceId) {
    const project = await this.prisma.performanceProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Performance project not found');
    }

    if (project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Performance Project is not in workspace');
    }

    return await this.prisma.performanceProject.delete({
      where: { id: projectId },
    });
  }
}
