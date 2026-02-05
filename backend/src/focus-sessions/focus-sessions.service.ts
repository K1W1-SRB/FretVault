import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FocusMetricType, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { EndFocusSessionDto } from './dto/end-focus-session.dto';
import { ListFocusSessionsQuery } from './dto/list-focus-sessions.query';
import { StartFocusSessionDto } from './dto/start-focus-session.dto';

@Injectable()
export class FocusSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async membership(workspaceId: string, userId: number) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true },
    });
    if (!m) throw new ForbiddenException('Not a workspace member');
  }

  private parseDateRange(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    if (from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    const toDate = to ? new Date(to) : undefined;
    if (to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }
    if (fromDate && toDate && toDate < fromDate) {
      throw new BadRequestException('Invalid date range');
    }
    return { fromDate, toDate };
  }

  async start(userId: number, dto: StartFocusSessionDto) {
    if (!dto?.targetId) throw new BadRequestException('Missing targetId');

    const target = await this.prisma.practiceTarget.findUnique({
      where: { id: dto.targetId },
      select: { id: true, workspaceId: true },
    });

    if (!target) throw new NotFoundException('Target not found');
    await this.membership(target.workspaceId, userId);

    const session = await this.prisma.focusSession.create({
      data: {
        userId: String(userId),
        workspaceId: target.workspaceId,
        targetId: target.id,
        startedAt: new Date(),
        metricType: FocusMetricType.NONE,
      },
      select: { id: true },
    });

    return { sessionId: session.id };
  }

  async end(userId: number, id: string, dto: EndFocusSessionDto) {
    const session = await this.prisma.focusSession.findUnique({
      where: { id },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== String(userId)) {
      throw new ForbiddenException('You cannot access this session');
    }
    if (session.endedAt) {
      throw new BadRequestException('Session already ended');
    }

    if (dto.metricValue !== undefined && dto.metricType === undefined) {
      if (session.metricType === FocusMetricType.NONE) {
        throw new BadRequestException('metricType required when metricValue set');
      }
    }

    const endedAt = new Date();
    const durationSec = Math.max(
      0,
      Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000),
    );

    const metricType = dto.metricType ?? session.metricType;
    const metricValue =
      metricType === FocusMetricType.NONE
        ? null
        : dto.metricValue ?? session.metricValue ?? null;

    return this.prisma.focusSession.update({
      where: { id },
      data: {
        endedAt,
        durationSec,
        metricType,
        metricValue,
        difficulty: dto.difficulty ?? session.difficulty,
        notes: dto.notes ?? session.notes,
      },
    });
  }

  async list(userId: number, query: ListFocusSessionsQuery) {
    const { fromDate, toDate } = this.parseDateRange(query.from, query.to);

    const where: Prisma.FocusSessionWhereInput = {
      userId: String(userId),
    };

    if (query.targetId) {
      const target = await this.prisma.practiceTarget.findUnique({
        where: { id: query.targetId },
        select: { workspaceId: true },
      });
      if (!target) throw new NotFoundException('Target not found');
      await this.membership(target.workspaceId, userId);
      where.targetId = query.targetId;
    }

    if (fromDate || toDate) {
      where.startedAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }

    return this.prisma.focusSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
    });
  }
}
