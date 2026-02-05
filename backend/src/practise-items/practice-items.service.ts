import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePracticeItemDto } from './dto/create-practice-item.dto';
import { PracticeItem, PracticeTargetType } from '@prisma/client';
import { UpdatePracticeItemDto } from './dto/update-practice-item.dto';
export type PracticeItemType = PracticeItem;
@Injectable()
export class PracticeItemsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreatePracticeItemDto,
    planId: number,
  ): Promise<PracticeItemType> {
    const item = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.practicePlan.findUnique({
        where: { id: planId },
        select: { id: true, name: true, ownerId: true, workspaceId: true },
      });
      if (!plan) throw new NotFoundException('Practice plan not found');

      const created = await tx.practiceItem.create({
        data: {
          ...dto,
          planId,
        },
      });

      if (plan.workspaceId) {
        const existingTarget = await tx.practiceTarget.findFirst({
          where: {
            workspaceId: plan.workspaceId,
            refId: String(plan.id),
            type: PracticeTargetType.BLOCK,
          },
          select: { id: true },
        });

        if (!existingTarget) {
          await tx.practiceTarget.create({
            data: {
              workspaceId: plan.workspaceId,
              userId: String(plan.ownerId),
              type: PracticeTargetType.BLOCK,
              refId: String(plan.id),
              title: plan.name,
            },
          });
        }
      }

      return created;
    });

    return item;
  }

  async findAllByPlan(planId: number) {
    return this.prisma.practiceItem.findMany({
      where: { planId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.practiceItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Practice item not found');
    return item;
  }

  async update(id: number, dto: UpdatePracticeItemDto) {
    return this.prisma.practiceItem.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    return this.prisma.practiceItem.delete({ where: { id } });
  }
}
