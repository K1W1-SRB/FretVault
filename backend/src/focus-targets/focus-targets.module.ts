import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { FocusTargetsController } from './focus-targets.controller';
import { FocusTargetsService } from './focus-targets.service';

@Module({
  imports: [AuthModule],
  controllers: [FocusTargetsController],
  providers: [FocusTargetsService, PrismaService, JwtService],
  exports: [FocusTargetsService],
})
export class FocusTargetsModule {}
