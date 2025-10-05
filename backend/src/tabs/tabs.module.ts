// src/tabs/tabs.module.ts
import { Module } from '@nestjs/common';
import { TabsService } from './tabs.service';
import { TabsController } from './tabs.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [TabsController],
  providers: [TabsService, PrismaService],
  exports: [TabsService],
})
export class TabsModule {}
