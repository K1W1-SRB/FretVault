import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { User } from 'src/auth/user.decorator';
import { FocusSessionsService } from './focus-sessions.service';
import { StartFocusSessionDto } from './dto/start-focus-session.dto';
import { EndFocusSessionDto } from './dto/end-focus-session.dto';
import { ListFocusSessionsQuery } from './dto/list-focus-sessions.query';

@UseGuards(JwtAuthGuard)
@Controller('focus-sessions')
export class FocusSessionsController {
  constructor(private readonly focusSessions: FocusSessionsService) {}

  @Post('start')
  start(@User('id') userId: number, @Body() dto: StartFocusSessionDto) {
    return this.focusSessions.start(userId, dto);
  }

  @Post(':id/end')
  end(
    @User('id') userId: number,
    @Param('id') id: string,
    @Body() dto: EndFocusSessionDto,
  ) {
    return this.focusSessions.end(userId, id, dto);
  }

  @Get()
  list(@User('id') userId: number, @Query() query: ListFocusSessionsQuery) {
    return this.focusSessions.list(userId, query);
  }
}
