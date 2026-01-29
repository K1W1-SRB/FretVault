import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SongType } from './types/song.type';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSongDto, ownerId: number): Promise<SongType> {
    return this.prisma.song.create({ data: { ...dto, ownerId } });
  }

  async findAll(ownerId: number): Promise<SongType[]> {
    return this.prisma.song.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublic(): Promise<SongType[]> {
    return this.prisma.song.findMany({
      where: { visibility: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, ownerId: number): Promise<SongType> {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException(`Song with id ${id} not found`);

    // Allow access if song is public or owned by user
    if (song.visibility !== 'PUBLIC' && song.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You do not have permission to view this song',
      );
    }

    return song;
  }

  async update(
    id: number,
    dto: UpdateSongDto,
    ownerId: number,
  ): Promise<SongType> {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException(`Song with id ${id} not found`);

    if (song.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot edit another user’s song');
    }

    return this.prisma.song.update({ where: { id }, data: dto });
  }

  async remove(id: number, ownerId: number): Promise<SongType> {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException(`Song with id ${id} not found`);

    if (song.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot delete another user’s song');
    }

    return this.prisma.song.delete({ where: { id } });
  }
}
