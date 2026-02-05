import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { FocusSessionsController } from './focus-sessions.controller';
import { FocusSessionsService } from './focus-sessions.service';

@Module({
  imports: [AuthModule],
  controllers: [FocusSessionsController],
  providers: [FocusSessionsService, PrismaService, JwtService],
  exports: [FocusSessionsService],
})
export class FocusSessionsModule {}
