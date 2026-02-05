import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FocusMetricType, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { StatsOverviewQuery } from './dto/stats-overview.query';
import { TargetStatsQuery } from './dto/target-stats.query';

const MOST_PRACTICED_LIMIT = 5;
const DEFAULT_TARGET_SESSIONS_LIMIT = 10;
const MAX_TARGET_SESSIONS_LIMIT = 100;

@Injectable()
export class StatsService {
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

  private toDateKeyUtc(date: Date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private addDaysUtc(date: Date, deltaDays: number) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + deltaDays,
      ),
    );
  }

  private computeDurationSec(session: {
    startedAt: Date;
    endedAt: Date | null;
    durationSec: number | null;
  }) {
    if (session.durationSec !== null && session.durationSec !== undefined) {
      return Math.max(0, session.durationSec);
    }
    if (!session.endedAt) return 0;
    return Math.max(
      0,
      Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000),
    );
  }

  private parseLimit(raw: string | undefined) {
    if (!raw) return DEFAULT_TARGET_SESSIONS_LIMIT;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('Invalid limit');
    }
    return Math.min(Math.max(parsed, 1), MAX_TARGET_SESSIONS_LIMIT);
  }

  async overview(userId: number, query: StatsOverviewQuery) {
    const { fromDate, toDate } = this.parseDateRange(query.from, query.to);

    const where: Prisma.FocusSessionWhereInput = {
      userId: String(userId),
      endedAt: { not: null },
    };

    if (fromDate || toDate) {
      where.startedAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }

    const sessions = await this.prisma.focusSession.findMany({
      where,
      select: {
        id: true,
        targetId: true,
        startedAt: true,
        endedAt: true,
        durationSec: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    let totalSec = 0;
    const targetAgg = new Map<
      string,
      { durationSec: number; sessionCount: number }
    >();
    const daySet = new Set<string>();

    for (const session of sessions) {
      const durationSec = this.computeDurationSec(session);
      totalSec += durationSec;

      const agg = targetAgg.get(session.targetId) ?? {
        durationSec: 0,
        sessionCount: 0,
      };
      agg.durationSec += durationSec;
      agg.sessionCount += 1;
      targetAgg.set(session.targetId, agg);

      const dayKey = this.toDateKeyUtc(session.endedAt ?? session.startedAt);
      daySet.add(dayKey);
    }

    const totalMinutes = Math.floor(totalSec / 60);

    let currentStreak = 0;
    const today = new Date();
    let cursor = this.addDaysUtc(today, 0);
    while (daySet.has(this.toDateKeyUtc(cursor))) {
      currentStreak += 1;
      cursor = this.addDaysUtc(cursor, -1);
    }

    const topTargets = [...targetAgg.entries()]
      .sort((a, b) => b[1].durationSec - a[1].durationSec)
      .slice(0, MOST_PRACTICED_LIMIT);

    const targetIds = topTargets.map(([id]) => id);
    const targets = targetIds.length
      ? await this.prisma.practiceTarget.findMany({
          where: { id: { in: targetIds } },
          select: { id: true, title: true, type: true, refId: true },
        })
      : [];
    const targetMap = new Map(targets.map((t) => [t.id, t]));

    const mostPracticedTargets = topTargets.map(([targetId, agg]) => ({
      targetId,
      title: targetMap.get(targetId)?.title ?? 'Unknown',
      type: targetMap.get(targetId)?.type ?? null,
      refId: targetMap.get(targetId)?.refId ?? null,
      totalMinutes: Math.floor(agg.durationSec / 60),
      sessionCount: agg.sessionCount,
    }));

    return {
      totalMinutes,
      sessionCount: sessions.length,
      currentStreak,
      mostPracticedTargets,
    };
  }

  async targetStats(userId: number, targetId: string, query: TargetStatsQuery) {
    const target = await this.prisma.practiceTarget.findUnique({
      where: { id: targetId },
      select: { id: true, workspaceId: true },
    });
    if (!target) throw new NotFoundException('Target not found');
    await this.membership(target.workspaceId, userId);

    const limit = this.parseLimit(query.limit);

    const lastSessions = await this.prisma.focusSession.findMany({
      where: {
        userId: String(userId),
        targetId,
        endedAt: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    const latestMetric = await this.prisma.focusSession.findFirst({
      where: {
        userId: String(userId),
        targetId,
        endedAt: { not: null },
        metricType: { not: FocusMetricType.NONE },
        metricValue: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      select: { metricType: true },
    });

    const trendMetricType = latestMetric?.metricType ?? FocusMetricType.NONE;
    let trend: Array<{ at: Date; value: number }> = [];

    if (trendMetricType !== FocusMetricType.NONE) {
      const trendSessions = await this.prisma.focusSession.findMany({
        where: {
          userId: String(userId),
          targetId,
          endedAt: { not: null },
          metricType: trendMetricType,
          metricValue: { not: null },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
      });
      trend = trendSessions
        .reverse()
        .map((s) => ({ at: s.endedAt ?? s.startedAt, value: s.metricValue! }));
    }

    const metricSessions = await this.prisma.focusSession.findMany({
      where: {
        userId: String(userId),
        targetId,
        endedAt: { not: null },
        metricType: { not: FocusMetricType.NONE },
        metricValue: { not: null },
      },
      select: { metricType: true, metricValue: true },
    });

    const personalBest: Record<string, number> = {};
    for (const session of metricSessions) {
      const key = session.metricType;
      const value = session.metricValue ?? 0;
      const current = personalBest[key];
      if (current === undefined || value > current) {
        personalBest[key] = value;
      }
    }

    return {
      targetId,
      lastSessions,
      trendMetricType,
      trend,
      personalBest,
    };
  }
}
