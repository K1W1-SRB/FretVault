import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateFocusTargetDto } from './dto/create-focus-target.dto';
import { ListFocusTargetsQuery } from './dto/list-focus-targets.query';
import { UpdateFocusTargetDto } from './dto/update-focus-target.dto';

@Injectable()
export class FocusTargetsService {
  constructor(private readonly prisma: PrismaService) {}

  private async membership(workspaceId: string, userId: number) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true },
    });
    if (!m) throw new ForbiddenException('Not a workspace member');
  }

  async create(userId: number, dto: CreateFocusTargetDto) {
    if (!dto?.workspaceId) throw new BadRequestException('Missing workspaceId');
    if (!dto?.type) throw new BadRequestException('Missing type');
    if (!dto?.title?.trim()) throw new BadRequestException('Missing title');

    await this.membership(dto.workspaceId, userId);

    const target = await this.prisma.practiceTarget.create({
      data: {
        workspaceId: dto.workspaceId,
        userId: String(userId),
        type: dto.type,
        refId: dto.refId?.trim() ? dto.refId.trim() : null,
        title: dto.title.trim(),
      },
    });

    return target;
  }

  async list(userId: number, query: ListFocusTargetsQuery) {
    if (!query?.workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    await this.membership(query.workspaceId, userId);

    const where: Prisma.PracticeTargetWhereInput = {
      workspaceId: query.workspaceId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.refId ? { refId: query.refId } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    };

    return this.prisma.practiceTarget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: number, id: string) {
    const target = await this.prisma.practiceTarget.findUnique({
      where: { id },
    });
    if (!target) throw new NotFoundException('Target not found');
    await this.membership(target.workspaceId, userId);
    return target;
  }

  async update(userId: number, id: string, dto: UpdateFocusTargetDto) {
    const target = await this.prisma.practiceTarget.findUnique({
      where: { id },
      select: { id: true, workspaceId: true },
    });
    if (!target) throw new NotFoundException('Target not found');
    await this.membership(target.workspaceId, userId);

    return this.prisma.practiceTarget.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.refId !== undefined
          ? { refId: dto.refId?.trim() ? dto.refId.trim() : null }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      },
    });
  }

  async remove(userId: number, id: string) {
    const target = await this.prisma.practiceTarget.findUnique({
      where: { id },
      select: { id: true, workspaceId: true },
    });
    if (!target) throw new NotFoundException('Target not found');
    await this.membership(target.workspaceId, userId);

    const sessionsCount = await this.prisma.focusSession.count({
      where: { targetId: id },
    });
    if (sessionsCount > 0) {
      throw new BadRequestException('Cannot delete target with sessions');
    }

    await this.prisma.practiceTarget.delete({ where: { id } });
    return { ok: true };
  }
}
