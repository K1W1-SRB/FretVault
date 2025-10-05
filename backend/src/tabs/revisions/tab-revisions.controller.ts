import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TabRevisionsService } from './tab-revisions.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { User } from 'src/auth/user.decorator';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { TabRevision } from '@prisma/client';
export type TabRevisionType = TabRevision;

@Controller('tab-revisions')
@UseGuards(JwtAuthGuard)
export class TabRevisionsController {
  constructor(private readonly revisionsService: TabRevisionsService) {}

  @Post()
  create(
    @Body() dto: CreateRevisionDto,
    @User('id') ownerId: number,
  ): Promise<TabRevisionType> {
    return this.revisionsService.create(dto, ownerId);
  }

  @Get('tab/:tabId')
  findAllByTab(
    @Param('tabId', ParseIntPipe) tabId: number,
    @User('id') ownerId: number,
  ): Promise<TabRevisionType[]> {
    return this.revisionsService.findAllByTab(tabId, ownerId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @User('id') ownerId: number,
  ): Promise<TabRevisionType> {
    return this.revisionsService.findOne(id, ownerId);
  }

  // optional: revert to an older version
  @Post(':id/restore')
  restore(
    @Param('id', ParseIntPipe) id: number,
    @User('id') ownerId: number,
  ): Promise<TabRevisionType> {
    return this.revisionsService.restore(id, ownerId);
  }
}
