import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { AccountType, WorkspaceRole, WorkspaceType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 80);
  }

  async ensurePersonalWorkspace(userId: number) {
    // One personal workspace per user
    const existing = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspace: { type: 'PERSONAL' } },
      select: { workspaceId: true },
    });

    if (existing) return existing.workspaceId;

    const slug = `personal-${userId}`; // stable, unique, boring on purpose

    const ws = await this.prisma.workspace.create({
      data: {
        type: 'PERSONAL',
        name: 'Personal',
        slug,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      select: { id: true },
    });

    return ws.id;
  }

  async listMine(userId: number) {
    return this.prisma.workspaceMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            type: true,
            name: true,
            slug: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { members: true } },
          },
        },
      },
    });
  }

  async getWorkspace(workspaceId: string, userId: number) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!membership) throw new ForbiddenException('Not a workspace member');

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        members: {
          orderBy: { joinedAt: 'asc' },
          select: {
            role: true,
            joinedAt: true,
            user: {
              select: { id: true, email: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');
    return { membership, workspace };
  }

  async createWorkspace(userId: number, dto: CreateWorkspaceDto) {
    if (dto.type === 'PERSONAL') {
      throw new BadRequestException(
        'PERSONAL workspaces are created automatically',
      );
    }

    // Enforce entitlement: only BAND accounts can create BAND workspaces
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.type === 'BAND' && user.accountType !== AccountType.BAND) {
      throw new ForbiddenException(
        'Upgrade required to create band workspaces',
      );
    }

    const slug = this.slugify(dto.slug);

    try {
      return await this.prisma.workspace.create({
        data: {
          type: dto.type,
          name: dto.name.trim(),
          slug,
          members: { create: { userId, role: WorkspaceRole.OWNER } },
        },
        select: {
          id: true,
          type: true,
          name: true,
          slug: true,
          createdAt: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException('Workspace slug already exists');
      throw e;
    }
  }

  async addMember(workspaceId: string, actorUserId: number, dto: AddMemberDto) {
    // actor must be admin/owner
    const actor = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
      select: { role: true },
    });
    if (!actor) throw new ForbiddenException('Not a workspace member');
    if (!(actor.role === 'OWNER' || actor.role === 'ADMIN')) {
      throw new ForbiddenException('No permission to add members');
    }

    const userToAdd = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true },
    });
    if (!userToAdd)
      throw new NotFoundException('User with that email not found');

    try {
      return await this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: userToAdd.id,
          role: dto.role ?? WorkspaceRole.MEMBER,
        },
        select: {
          role: true,
          joinedAt: true,
          user: { select: { id: true, email: true, name: true, avatar: true } },
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException('User is already a member');
      throw e;
    }
  }

  async removeMember(
    workspaceId: string,
    actorUserId: number,
    removeUserId: number,
  ) {
    const actor = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
      select: { role: true },
    });
    if (!actor) throw new ForbiddenException('Not a workspace member');
    if (!(actor.role === 'OWNER' || actor.role === 'ADMIN')) {
      throw new ForbiddenException('No permission to remove members');
    }

    // Prevent removing yourself if you’re the only owner (basic sanity)
    const owners = await this.prisma.workspaceMember.count({
      where: { workspaceId, role: 'OWNER' },
    });

    const target = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: removeUserId } },
      select: { role: true },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER' && owners <= 1) {
      throw new BadRequestException('Cannot remove the last owner');
    }

    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: removeUserId } },
    });

    return { ok: true };
  }
}
