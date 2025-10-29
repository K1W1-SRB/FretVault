import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePracticeItemDto } from './dto/create-practice-item.dto';
import { PracticeItem } from '@prisma/client';
import { UpdatePracticeItemDto } from './dto/update-practice-item.dto';
export type PracticeItemType = PracticeItem;
@Injectable()
export class PracticeItemsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreatePracticeItemDto,
    planId: number,
  ): Promise<PracticeItemType> {
    const item = await this.prisma.practiceItem.create({
      data: {
        ...dto,
        planId,
      },
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
