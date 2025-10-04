import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SongType } from './types/song.type';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { User } from 'src/auth/user.decorator';

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateSongDto, @User('id') ownerId: number) {
    return this.songsService.create(dto, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@User('id') ownerId: number) {
    return this.songsService.findAll(ownerId);
  }

  @Get('/public')
  findPublic() {
    return this.songsService.findPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @User('id') ownerId: number) {
    return this.songsService.findOne(id, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSongDto,
    @User('id') ownerId: number,
  ) {
    return this.songsService.update(id, dto, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @User('id') ownerId: number) {
    return this.songsService.remove(id, ownerId);
  }
}
