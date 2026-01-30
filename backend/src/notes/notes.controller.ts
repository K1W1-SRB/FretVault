import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ListNotesQuery } from './dto/list-notes.query';
import { ResolveLinksDto } from './dto/resolve-links.dto';
import { User } from 'src/auth/user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('workspaces/:workspaceId/notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  create(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notes.create(workspaceId, userId, dto);
  }

  @Get()
  findAll(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Query() query: ListNotesQuery,
  ) {
    return this.notes.findAll(workspaceId, userId, query);
  }

  @Get('by-slug/:slug')
  findBySlug(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Param('slug') slug: string,
  ) {
    return this.notes.findBySlug(workspaceId, slug, userId);
  }

  @Post('resolve-links')
  resolveLinks(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ResolveLinksDto,
  ) {
    return this.notes.resolveLinks(workspaceId, userId, dto);
  }

  @Get(':noteId')
  findOne(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.notes.findOne(workspaceId, noteId, userId);
  }

  @Patch(':noteId')
  update(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(workspaceId, noteId, userId, dto);
  }

  @Delete(':noteId')
  remove(
    @User('id') userId: number,
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.notes.remove(workspaceId, noteId, userId);
  }
}
