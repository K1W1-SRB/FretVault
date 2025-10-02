import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SongType } from './types/song.type';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSongDto, ownerId: number): Promise<SongType> {
    return this.prisma.song.create({
      data: {
        ...dto,
        ownerId,
      },
    });
  }

  async findAll(): Promise<SongType[]> {
    return this.prisma.song.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<SongType> {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException(`Song with id ${id} not found`);
    return song;
  }

  async update(id: number, dto: UpdateSongDto): Promise<SongType> {
    return this.prisma.song.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number): Promise<SongType> {
    return this.prisma.song.delete({ where: { id } });
  }
}
