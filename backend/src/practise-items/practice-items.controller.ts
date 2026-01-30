import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreatePracticeItemDto } from './dto/create-practice-item.dto';
import { PracticeItemsService } from './practice-items.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { UpdatePracticeItemDto } from './dto/update-practice-item.dto';

@Controller('practice-items')
export class PracticeItemsController {
  constructor(private readonly practiceItem: PracticeItemsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('/plans/:planId')
  create(
    @Body() dto: CreatePracticeItemDto,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return this.practiceItem.create(dto, planId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/plans/:planId')
  findAll(@Param('planId', ParseIntPipe) planId: number) {
    return this.practiceItem.findAllByPlan(planId);
  }

  @Get('/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.practiceItem.findOne(id);
  }

  @Put('/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePracticeItemDto,
  ) {
    return this.practiceItem.update(id, dto);
  }

  @Delete('/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.practiceItem.remove(id);
  }
}
