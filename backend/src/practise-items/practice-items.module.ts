import { Module } from '@nestjs/common';
import { PracticeItemsController } from './practice-items.controller';
import { PracticeItemsService } from './practice-items.service';
import { PrismaService } from 'prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [PracticeItemsController],
  providers: [PracticeItemsService, PrismaService, AuthService, JwtService],
  exports: [PracticeItemsService],
})
export class PracticeItemsModule {}
