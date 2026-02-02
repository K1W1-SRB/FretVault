import { Module } from '@nestjs/common';
import { PracticeItemsController } from './practice-items.controller';
import { PracticeItemsService } from './practice-items.service';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PracticeItemsController],
  providers: [PracticeItemsService, PrismaService, JwtService],
  exports: [PracticeItemsService],
})
export class PracticeItemsModule {}
