import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePracticePlanDto } from './dto/create-practice-plan.dto';
import { PracticePlan } from '@prisma/client';
export type PracticePlanType = PracticePlan;
import { PrismaService } from 'prisma/prisma.service';
import { UpdatePracticePlanDto } from './dto/update-practice-plan.dto';

@Injectable()
export class PracticePlansService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreatePracticePlanDto,
    ownerId: number,
  ): Promise<PracticePlanType> {
    const items = dto.items ?? [];
    const plan = await this.prisma.practicePlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId,
        workspaceId: dto.workspaceId ?? undefined,
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

    const UpdatedPracticePlan = await this.prisma.practicePlan.update({
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

    return UpdatedPracticePlan;
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
