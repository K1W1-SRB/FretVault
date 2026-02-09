import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [AuthModule],
  controllers: [StatsController],
  providers: [StatsService, PrismaService, JwtService],
})
export class StatsModule {}
