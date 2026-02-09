import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { User } from 'src/auth/user.decorator';
import { FocusTargetsService } from './focus-targets.service';
import { CreateFocusTargetDto } from './dto/create-focus-target.dto';
import { UpdateFocusTargetDto } from './dto/update-focus-target.dto';
import { ListFocusTargetsQuery } from './dto/list-focus-targets.query';

@UseGuards(JwtAuthGuard)
@Controller('focus-targets')
export class FocusTargetsController {
  constructor(private readonly focusTargets: FocusTargetsService) {}

  @Post()
  create(@User('id') userId: number, @Body() dto: CreateFocusTargetDto) {
    return this.focusTargets.create(userId, dto);
  }

  @Get()
  list(@User('id') userId: number, @Query() query: ListFocusTargetsQuery) {
    return this.focusTargets.list(userId, query);
  }

  @Get(':id')
  findOne(@User('id') userId: number, @Param('id') id: string) {
    return this.focusTargets.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @User('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateFocusTargetDto,
  ) {
    return this.focusTargets.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@User('id') userId: number, @Param('id') id: string) {
    return this.focusTargets.remove(userId, id);
  }
}
