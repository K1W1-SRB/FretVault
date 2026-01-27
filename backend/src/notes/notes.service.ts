import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ListNotesQuery } from './dto/list-notes.query';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { ResolveLinksDto } from './dto/resolve-links.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 220);
  }

  private extractWikiLinks(markdown: string) {
    // Matches [[slug]] and [[slug|alias]]
    const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

    const links: Array<{ toSlug: string; alias?: string; raw: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = re.exec(markdown)) !== null) {
      const rawTarget = (match[1] ?? '').trim();
      if (!rawTarget) continue;

      const alias = match[2]?.trim() || undefined;

      // Your rule: links are slugs. So normalize to slug form.
      const toSlug = this.slugify(rawTarget);
      if (!toSlug) continue;

      links.push({ toSlug, alias, raw: match[0] });
    }

    // de-dupe by toSlug
    const map = new Map<
      string,
      { toSlug: string; alias?: string; raw: string }
    >();
    for (const l of links) if (!map.has(l.toSlug)) map.set(l.toSlug, l);
    return [...map.values()];
  }

  private parseBlockPayload(body: string) {
    // super simple "key: value" parser; enough for v1
    const obj: Record<string, any> = {};
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf(':');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      obj[key] = value;
    }
    return obj;
  }

  private extractNoteBlocks(markdown: string) {
    const re = /^```(chord|prog)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;

    const blocks: Array<{ type: 'chord' | 'prog'; data: any; order: number }> =
      [];
    let match: RegExpExecArray | null;
    let order = 0;

    while ((match = re.exec(markdown)) !== null) {
      const type = match[1] as 'chord' | 'prog';
      const body = match[2] ?? '';
      const data = this.parseBlockPayload(body);
      blocks.push({ type, data, order: order++ });
    }

    return blocks;
  }

  private canWrite(role: WorkspaceRole) {
    return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
  }

  private canDelete(role: WorkspaceRole) {
    return role === 'OWNER' || role === 'ADMIN';
  }

  private async membership(workspaceId: string, userId: number) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!m) throw new ForbiddenException('Not a workspace member');
    return m;
  }

  private async touchWorkspace(workspaceId: string) {
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });
  }

  private async generateUniqueSlug(workspaceId: string, base: string) {
    const clean = this.slugify(base);
    if (!clean) throw new BadRequestException('Invalid slug/title');

    // Fast path: try base, then base-2, base-3...
    // (Avoids throwing ConflictException for normal UX)
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? clean : `${clean}-${i + 1}`;
      const exists = await this.prisma.note.findFirst({
        where: { workspaceId, slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new ConflictException('Could not generate unique slug');
  }

  private async syncDerivedForNote(
    noteId: string,
    workspaceId: string,
    markdown: string,
  ) {
    const links = this.extractWikiLinks(markdown);
    const blocks = this.extractNoteBlocks(markdown);

    const targets = links.length
      ? await this.prisma.note.findMany({
          where: { workspaceId, slug: { in: links.map((l) => l.toSlug) } },
          select: { id: true, slug: true },
        })
      : [];

    const slugToId = new Map(targets.map((t) => [t.slug, t.id]));

    await this.prisma.$transaction([
      this.prisma.noteLink.deleteMany({ where: { fromNoteId: noteId } }),
      ...(links.length
        ? [
            this.prisma.noteLink.createMany({
              data: links.map((l) => ({
                fromNoteId: noteId,
                toNoteId: slugToId.get(l.toSlug) ?? null,
                toSlug: l.toSlug,
                alias: l.alias ?? null,
                raw: l.raw,
              })),
            }),
          ]
        : []),

      this.prisma.noteBlock.deleteMany({ where: { noteId } }),
      ...(blocks.length
        ? [
            this.prisma.noteBlock.createMany({
              data: blocks.map((b) => ({
                noteId,
                type: b.type,
                data: b.data,
                order: b.order,
              })),
            }),
          ]
        : []),
    ]);
  }

  private async resolveIncomingForNewNote(
    workspaceId: string,
    newNoteId: string,
    newSlug: string,
  ) {
    const candidates = await this.prisma.noteLink.findMany({
      where: {
        toSlug: newSlug,
        toNoteId: null,
        from: { workspaceId },
      },
      select: { id: true },
    });

    if (!candidates.length) return;

    await this.prisma.noteLink.updateMany({
      where: { id: { in: candidates.map((c) => c.id) } },
      data: { toNoteId: newNoteId },
    });
  }

  async create(workspaceId: string, userId: number, dto: CreateNoteDto) {
    const { role } = await this.membership(workspaceId, userId);
    if (!this.canWrite(role)) throw new ForbiddenException('No write access');

    const wantedSlug = dto.slug?.trim() ? dto.slug : dto.title;
    const slug = await this.generateUniqueSlug(workspaceId, wantedSlug);

    const note = await this.prisma.note.create({
      data: {
        workspaceId,
        title: dto.title.trim(),
        slug,
        contentMd: dto.contentMd ?? '',
        visibility: dto.visibility ?? 'PRIVATE',
        frontmatter: dto.frontmatter ?? undefined,
        createdById: userId,
        updatedById: userId,
        ...(dto.tags?.length
          ? {
              tags: {
                create: dto.tags.map((name) => ({
                  tag: {
                    connectOrCreate: {
                      where: {
                        workspaceId_name: { workspaceId, name: name.trim() },
                      },
                      create: { workspaceId, name: name.trim() },
                    },
                  },
                })),
              },
            }
          : {}),
      },
      include: {
        tags: { include: { tag: true } },
        blocks: true,
        outgoing: true,
        incoming: true,
      },
    });

    await this.syncDerivedForNote(note.id, workspaceId, note.contentMd);
    await this.resolveIncomingForNewNote(workspaceId, note.id, note.slug);
    await this.touchWorkspace(workspaceId);
    return this.prisma.note.findFirst({
      where: { id: note.id, workspaceId },
      include: {
        tags: { include: { tag: true } },
        blocks: true,
        outgoing: true,
        incoming: true,
      },
    });
  }

  async findAll(workspaceId: string, userId: number, query: ListNotesQuery) {
    await this.membership(workspaceId, userId);

    const sortField = query.sort ?? 'updatedAt';
    const sortOrder = query.order ?? 'desc';

    const where: Prisma.NoteWhereInput = {
      workspaceId,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { contentMd: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.tag
        ? {
            tags: { some: { tag: { name: query.tag } } },
          }
        : {}),
    };

    return this.prisma.note.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      include: { tags: { include: { tag: true } } },
      take: 50,
    });
  }

  async findOne(workspaceId: string, noteId: string, userId: number) {
    await this.membership(workspaceId, userId);

    const note = await this.prisma.note.findFirst({
      where: { id: noteId, workspaceId },
      include: {
        tags: { include: { tag: true } },
        blocks: true,
        outgoing: true,
        incoming: true,
      },
    });

    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async findBySlug(workspaceId: string, slug: string, userId: number) {
    await this.membership(workspaceId, userId);

    const note = await this.prisma.note.findFirst({
      where: { workspaceId, slug },
      include: {
        tags: { include: { tag: true } },
        blocks: true,
        outgoing: true,
        incoming: true,
      },
    });

    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async resolveLinks(
    workspaceId: string,
    userId: number,
    dto: ResolveLinksDto,
  ) {
    await this.membership(workspaceId, userId);

    const raw = Array.isArray(dto?.slugs) ? dto.slugs : [];
    const cleaned = raw
      .map((slug) => (typeof slug === 'string' ? slug.trim() : ''))
      .filter(Boolean);
    const unique = [...new Set(cleaned)];

    if (!unique.length) return { results: {} };

    const notes = await this.prisma.note.findMany({
      where: { workspaceId, slug: { in: unique } },
      select: { id: true, title: true, slug: true },
    });

    const map = new Map(notes.map((n) => [n.slug, n]));
    const results: Record<string, { id: string; title: string; slug: string } | null> =
      {};

    for (const slug of unique) {
      results[slug] = map.get(slug) ?? null;
    }

    return { results };
  }

  async update(
    workspaceId: string,
    noteId: string,
    userId: number,
    dto: UpdateNoteDto,
  ) {
    const { role } = await this.membership(workspaceId, userId);
    if (!this.canWrite(role)) throw new ForbiddenException('No write access');

    const existing = await this.prisma.note.findFirst({
      where: { id: noteId, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Note not found');

    if (dto.slug !== undefined) {
      throw new BadRequestException('Slug cannot be changed once created');
    }

    const tagUpdate =
      dto.tags === undefined
        ? undefined
        : {
            tags: {
              deleteMany: {},
              create: dto.tags.map((name) => ({
                tag: {
                  connectOrCreate: {
                    where: {
                      workspaceId_name: { workspaceId, name: name.trim() },
                    },
                    create: { workspaceId, name: name.trim() },
                  },
                },
              })),
            },
          };

    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.contentMd !== undefined ? { contentMd: dto.contentMd } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.frontmatter !== undefined
          ? { frontmatter: dto.frontmatter }
          : {}),
        updatedById: userId,
        ...(tagUpdate ?? {}),
      },
      include: {
        tags: { include: { tag: true } },
        blocks: true,
        outgoing: true,
        incoming: true,
      },
    });

    if (dto.contentMd !== undefined) {
      await this.syncDerivedForNote(updated.id, workspaceId, updated.contentMd);
    }

    await this.touchWorkspace(workspaceId);
    return updated;
  }

  async remove(workspaceId: string, noteId: string, userId: number) {
    const { role } = await this.membership(workspaceId, userId);
    if (!this.canDelete(role)) throw new ForbiddenException('No delete access');

    const existing = await this.prisma.note.findFirst({
      where: { id: noteId, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Note not found');

    await this.prisma.note.delete({ where: { id: noteId } });
    await this.touchWorkspace(workspaceId);

    return { ok: true };
  }
}
