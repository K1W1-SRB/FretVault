import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';
import { TabRevision } from '@prisma/client';
import { CreateRevisionDto } from './dto/create-revision.dto';
export type TabRevisionType = TabRevision;

@Injectable()
export class TabRevisionsService {
  constructor(private prisma: PrismaService) {}

  // 🆕 Create new revision
  async create(
    dto: CreateRevisionDto,
    ownerId: number,
  ): Promise<TabRevisionType> {
    const tab = await this.prisma.tab.findUnique({
      where: { id: dto.tabId },
      include: { song: true },
    });

    if (!tab) throw new NotFoundException('Tab not found');
    if (tab.song.ownerId !== ownerId)
      throw new ForbiddenException('You do not own this tab');

    // Determine next revision number
    const latest = await this.prisma.tabRevision.findFirst({
      where: { tabId: dto.tabId },
      orderBy: { number: 'desc' },
    });
    const nextNumber = latest ? latest.number + 1 : 1;

    // Save revision
    const revision = await this.prisma.tabRevision.create({
      data: {
        tabId: dto.tabId,
        number: nextNumber,
        message: dto.message ?? null,
        score: dto.score,
        createdBy: ownerId,
      },
    });

    // Update currentRev on Tab
    await this.prisma.tab.update({
      where: { id: dto.tabId },
      data: { currentRev: revision.id },
    });

    return revision;
  }

  // 📜 Get all revisions for a tab
  async findAllByTab(
    tabId: number,
    ownerId: number,
  ): Promise<TabRevisionType[]> {
    const tab = await this.prisma.tab.findUnique({
      where: { id: tabId },
      include: { song: true },
    });
    if (!tab) throw new NotFoundException('Tab not found');
    if (tab.song.ownerId !== ownerId)
      throw new ForbiddenException('You do not have access to this tab');

    return this.prisma.tabRevision.findMany({
      where: { tabId },
      orderBy: { number: 'desc' },
    });
  }

  // 🔍 Get a single revision
  async findOne(id: number, ownerId: number): Promise<TabRevisionType> {
    const rev = await this.prisma.tabRevision.findUnique({
      where: { id },
      include: { tab: { include: { song: true } } },
    });
    if (!rev) throw new NotFoundException('Revision not found');
    if (rev.tab.song.ownerId !== ownerId)
      throw new ForbiddenException('You do not have access to this revision');

    return rev;
  }

  // ♻️ Restore (optional): revert Tab to previous revision
  async restore(id: number, ownerId: number): Promise<TabRevisionType> {
    const rev = await this.prisma.tabRevision.findUnique({
      where: { id },
      include: { tab: { include: { song: true } } },
    });
    if (!rev) throw new NotFoundException('Revision not found');
    if (rev.tab.song.ownerId !== ownerId)
      throw new ForbiddenException('You do not own this tab');

    await this.prisma.tab.update({
      where: { id: rev.tabId },
      data: { currentRev: rev.id },
    });

    return rev;
  }
}
