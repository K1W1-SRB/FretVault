import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspace.controller';
import { PrismaService } from 'prisma/prisma.service';
import { WorkspacesService } from './workspace.service';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, PrismaService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
