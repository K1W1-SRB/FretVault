import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePerformanceClipDto } from './dto/create-performance-clip.dto';
import { UpdatePerformanceClipDto } from './dto/update-performance-clip.dto';

@Injectable()
export class PerformanceClipsService {
  constructor(private prisma: PrismaService) {}

  async create(trackId: string, dto: CreatePerformanceClipDto) {
    const track = await this.prisma.performanceTrack.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.workspaceId !== track.workspaceId) {
      throw new ForbiddenException('Asset is not in workspace');
    }
    if (asset.status !== AssetStatus.VERIFIED) {
      throw new ForbiddenException('Asset is not ready for use');
    }

    return this.prisma.performanceClip.create({
      data: {
        workspaceId: track.workspaceId,
        projectId: track.projectId,
        trackId: track.id,
        assetId: dto.assetId,
        startMs: dto.startMs,
        durationMs: dto.durationMs,
        ...(dto.offsetInAssetMs !== undefined
          ? { offsetInAssetMs: dto.offsetInAssetMs }
          : {}),
      },
    });
  }

  async update(clipId: string, dto: UpdatePerformanceClipDto) {
    const clip = await this.prisma.performanceClip.findUnique({
      where: { id: clipId },
    });

    if (!clip) {
      throw new NotFoundException('Clip not found');
    }

    return this.prisma.performanceClip.update({
      where: { id: clipId },
      data: { ...dto },
    });
  }

  async delete(clipId: string) {
    const clip = await this.prisma.performanceClip.findUnique({
      where: { id: clipId },
    });

    if (!clip) {
      throw new NotFoundException('Clip not found');
    }

    return this.prisma.performanceClip.delete({
      where: { id: clipId },
    });
  }
}
