import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guards';
import { User } from 'src/auth/user.decorator';
import { StatsService } from './stats.service';
import { StatsOverviewQuery } from './dto/stats-overview.query';
import { TargetStatsQuery } from './dto/target-stats.query';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('overview')
  overview(@User('id') userId: number, @Query() query: StatsOverviewQuery) {
    return this.stats.overview(userId, query);
  }

  @Get('targets/:targetId')
  targetStats(
    @User('id') userId: number,
    @Param('targetId') targetId: string,
    @Query() query: TargetStatsQuery,
  ) {
    return this.stats.targetStats(userId, targetId, query);
  }
}
