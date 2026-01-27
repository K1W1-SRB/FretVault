import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ListNotesQuery } from './dto/list-notes.query';
import { ResolveLinksDto } from './dto/resolve-links.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('workspaces/:workspaceId/notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  create(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notes.create(workspaceId, req.user.id, dto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Query() query: ListNotesQuery,
  ) {
    return this.notes.findAll(workspaceId, req.user.id, query);
  }

  @Get('by-slug/:slug')
  findBySlug(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('slug') slug: string,
  ) {
    return this.notes.findBySlug(workspaceId, slug, req.user.id);
  }

  @Post('resolve-links')
  resolveLinks(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ResolveLinksDto,
  ) {
    return this.notes.resolveLinks(workspaceId, req.user.id, dto);
  }

  @Get(':noteId')
  findOne(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.notes.findOne(workspaceId, noteId, req.user.id);
  }

  @Patch(':noteId')
  update(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(workspaceId, noteId, req.user.id, dto);
  }

  @Delete(':noteId')
  remove(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.notes.remove(workspaceId, noteId, req.user.id);
  }
}
