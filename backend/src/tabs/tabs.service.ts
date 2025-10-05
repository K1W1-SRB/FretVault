import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTabDto } from './dto/create-tab.dto';
import { UpdateTabDto } from './dto/update-tab.dto';
import { Tab } from '@prisma/client';
export type TabType = Tab;
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TabsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTabDto, ownerId: number): Promise<TabType> {
    // Verify that the song exists and belongs to the user
    const song = await this.prisma.song.findUnique({
      where: { id: dto.songId },
    });
    if (!song) throw new NotFoundException('Song not found');
    if (song.ownerId !== ownerId)
      throw new ForbiddenException(
        'You cannot add tabs to another user’s song',
      );

    return this.prisma.tab.create({
      data: {
        songId: dto.songId,
        title: dto.title,
        tuning: dto.tuning ?? 'EADGBE', // 👈 fallback to default
        tempo: dto.tempo ?? null,
        timeSigTop: dto.timeSigTop ?? 4,
        timeSigBot: dto.timeSigBot ?? 4,
        capo: dto.capo ?? 0,
      },
    });
  }

  async findAllBySong(songId: number, ownerId: number): Promise<TabType[]> {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('Song not found');
    if (song.ownerId !== ownerId)
      throw new ForbiddenException('You do not have access to this song');

    return this.prisma.tab.findMany({
      where: { songId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, ownerId: number): Promise<TabType> {
    const tab = await this.prisma.tab.findUnique({
      where: { id },
      include: { song: true },
    });
    if (!tab) throw new NotFoundException('Tab not found');
    if (tab.song.ownerId !== ownerId)
      throw new ForbiddenException('You do not have access to this tab');
    return tab;
  }

  async update(
    id: number,
    dto: UpdateTabDto,
    ownerId: number,
  ): Promise<TabType> {
    const tab = await this.prisma.tab.findUnique({
      where: { id },
      include: { song: true },
    });
    if (!tab) throw new NotFoundException('Tab not found');
    if (tab.song.ownerId !== ownerId)
      throw new ForbiddenException('You cannot edit this tab');
    return this.prisma.tab.update({ where: { id }, data: dto });
  }

  async remove(id: number, ownerId: number): Promise<TabType> {
    const tab = await this.prisma.tab.findUnique({
      where: { id },
      include: { song: true },
    });
    if (!tab) throw new NotFoundException('Tab not found');
    if (tab.song.ownerId !== ownerId)
      throw new ForbiddenException('You cannot delete this tab');
    return this.prisma.tab.delete({ where: { id } });
  }
}
