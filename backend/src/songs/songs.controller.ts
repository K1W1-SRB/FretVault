import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SongType } from './types/song.type';
@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post()
  create(@Body() dto: CreateSongDto): Promise<SongType> {
    // TODO: Replace hardcoded ownerId with JWT user context
    const ownerId = 1;
    return this.songsService.create(dto, ownerId);
  }

  @Get()
  findAll(): Promise<SongType[]> {
    return this.songsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SongType> {
    return this.songsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSongDto,
  ): Promise<SongType> {
    return this.songsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<SongType> {
    return this.songsService.remove(id);
  }
}
