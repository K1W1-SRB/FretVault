import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePracticePlanDto } from './dto/create-practice-plan.dto';
import { PracticePlan, PracticeTargetType } from '@prisma/client';
export type PracticePlanType = PracticePlan;
import { PrismaService } from 'prisma/prisma.service';
import { UpdatePracticePlanDto } from './dto/update-practice-plan.dto';
import { WorkspacesService } from 'src/workspace/workspace.service';

@Injectable()
export class PracticePlansService {
  constructor(
    private prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  private async membership(workspaceId: string, userId: number) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true },
    });
    if (!m) throw new ForbiddenException('Not a workspace member');
  }

  private async ensurePlanTarget(
    tx: PrismaService,
    planId: number,
    workspaceId: string,
    ownerId: number,
    title: string,
  ) {
    const existing = await tx.practiceTarget.findFirst({
      where: {
        workspaceId,
        refId: String(planId),
        type: PracticeTargetType.BLOCK,
      },
      select: { id: true },
    });
    if (existing) return;

    await tx.practiceTarget.create({
      data: {
        workspaceId,
        userId: String(ownerId),
        type: PracticeTargetType.BLOCK,
        refId: String(planId),
        title,
      },
    });
  }

  async create(
    dto: CreatePracticePlanDto,
    ownerId: number,
  ): Promise<PracticePlanType> {
    const items = dto.items ?? [];
    const workspaceId =
      dto.workspaceId ??
      (await this.workspacesService.ensurePersonalWorkspace(ownerId));
    await this.membership(workspaceId, ownerId);

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.practicePlan.create({
        data: {
          name: dto.name,
          description: dto.description,
          ownerId,
          workspaceId,
          sourceNoteSlug: dto.sourceNoteSlug ?? undefined,
          sourceNoteTitle: dto.sourceNoteTitle ?? undefined,
          ...(items.length
            ? {
                items: {
                  create: items.map((item) => ({
                    title: item.title,
                    category: item.category,
                    description: item.description,
                    duration: item.duration,
                    order: item.order,
                  })),
                },
              }
            : {}),
        },
        include: { items: true },
      });

      await this.ensurePlanTarget(
        tx as PrismaService,
        created.id,
        workspaceId,
        ownerId,
        created.name,
      );

      return created;
    });

    return plan;
  }

  async findAll(ownerId: number): Promise<PracticePlanType[]> {
    const plans = await this.prisma.practicePlan.findMany({
      where: { ownerId: ownerId },
      orderBy: { createdAt: 'desc' },
    });

    return plans;
  }

  async findOne(id: number, ownerId: number): Promise<PracticePlanType> {
    const practicePlan = await this.prisma.practicePlan.findUnique({
      where: { id },
    });

    if (practicePlan?.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot Access this resource');
    }

    if (!practicePlan)
      throw new NotFoundException(`practice with id ${id} not found`);

    return practicePlan;
  }

  async update(
    id: number,
    ownerId: number,
    dto: UpdatePracticePlanDto,
  ): Promise<PracticePlanType> {
    const practicePlan = await this.prisma.practicePlan.findUnique({
      where: { id },
    });

    if (practicePlan?.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot Access this resource');
    }

    if (!practicePlan)
      throw new NotFoundException(`practice with id ${id} not found`);

    if (dto.workspaceId !== undefined && dto.workspaceId !== null) {
      await this.membership(dto.workspaceId, ownerId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedPlan = await tx.practicePlan.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.workspaceId !== undefined
            ? { workspaceId: dto.workspaceId }
            : {}),
          ...(dto.sourceNoteSlug !== undefined
            ? { sourceNoteSlug: dto.sourceNoteSlug }
            : {}),
          ...(dto.sourceNoteTitle !== undefined
            ? { sourceNoteTitle: dto.sourceNoteTitle }
            : {}),
          ...(dto.items && {
            items: {
              deleteMany: {}, // remove old ones
              create: dto.items.map((item) => ({
                title: item.title,
                category: item.category,
                description: item.description,
                duration: item.duration,
                order: item.order,
              })),
            },
          }),
        },
        include: { items: true },
      });

      if (updatedPlan.workspaceId) {
        await this.ensurePlanTarget(
          tx as PrismaService,
          updatedPlan.id,
          updatedPlan.workspaceId,
          ownerId,
          updatedPlan.name,
        );
      }

      return updatedPlan;
    });

    return updated;
  }

  async delete(id: number, ownerId: number): Promise<PracticePlanType> {
    const practicePlan = await this.prisma.practicePlan.findUnique({
      where: { id },
    });

    if (practicePlan?.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot Access this resource');
    }

    if (!practicePlan)
      throw new NotFoundException(`practice with id ${id} not found`);

    return this.prisma.practicePlan.delete({
      where: { id },
    });
  }
}
