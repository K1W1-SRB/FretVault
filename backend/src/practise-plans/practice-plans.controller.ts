import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreatePracticePlanDto } from './dto/create-practice-plan.dto';
import { PracticePlan } from '@prisma/client';
export type PracticePlanType = PracticePlan;
import { User } from 'src/auth/user.decorator';
import { PracticePlansService } from './practice-plans.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { UpdatePracticePlanDto } from './dto/update-practice-plan.dto';

@Controller('practice-plans')
export class PracticePlansController {
  constructor(private readonly practicePlan: PracticePlansService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() dto: CreatePracticePlanDto,
    @User('id') ownerId: number,
  ): Promise<PracticePlanType> {
    return this.practicePlan.create(dto, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@User('id') ownerId: number) {
    return this.practicePlan.findAll(ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  find(@Param('id', ParseIntPipe) id: number, @User('id') ownerId: number) {
    return this.practicePlan.findOne(id, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @User('id') ownerId: number,
    @Body() dto: UpdatePracticePlanDto,
  ) {
    return this.practicePlan.update(id, ownerId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @User('id') ownerId: number) {
    return this.practicePlan.delete(id, ownerId);
  }
}
