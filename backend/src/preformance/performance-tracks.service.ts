import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePerformanceTrackDto } from './dto/create-performance-track.dto';
import { UpdatePerformanceTrackDto } from './dto/update-performance-track.dto';

@Injectable()
export class PerformanceTracksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePerformanceTrackDto, workspaceId: string) {
    return this.prisma.performanceTrack.create({
      data: { ...dto, workspaceId },
    });
  }

  async update(
    dto: UpdatePerformanceTrackDto,
    workspaceId: string,
    trackId: string,
  ) {
    const track = await this.prisma.performanceTrack.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.workspaceId !== workspaceId) {
      throw new ForbiddenException('track doest belong to workspace');
    }

    const updatedTrack = await this.prisma.performanceTrack.update({
      where: { id: trackId },
      data: { ...dto },
    });

    return updatedTrack;
  }

  async delete(trackId: string, workspaceId: string) {
    const track = await this.prisma.performanceTrack.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.workspaceId !== workspaceId) {
      throw new ForbiddenException('track is not in workspace');
    }

    return await this.prisma.performanceTrack.delete({
      where: { id: trackId },
    });
  }
}
