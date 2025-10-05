import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TabsService } from './tabs.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { User } from 'src/auth/user.decorator';
import { CreateTabDto } from './dto/create-tab.dto';
import { UpdateTabDto } from './dto/update-tab.dto';
import { Tab } from '@prisma/client';
export type TabType = Tab;

@Controller('tabs')
@UseGuards(JwtAuthGuard)
export class TabsController {
  constructor(private readonly tabsService: TabsService) {}

  @Post()
  create(
    @Body() dto: CreateTabDto,
    @User('id') ownerId: number,
  ): Promise<TabType> {
    return this.tabsService.create(dto, ownerId);
  }

  @Get('song/:songId')
  findAllBySong(
    @Param('songId', ParseIntPipe) songId: number,
    @User('id') ownerId: number,
  ): Promise<TabType[]> {
    return this.tabsService.findAllBySong(songId, ownerId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @User('id') ownerId: number) {
    return this.tabsService.findOne(id, ownerId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTabDto,
    @User('id') ownerId: number,
  ) {
    return this.tabsService.update(id, dto, ownerId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @User('id') ownerId: number) {
    return this.tabsService.remove(id, ownerId);
  }
}
