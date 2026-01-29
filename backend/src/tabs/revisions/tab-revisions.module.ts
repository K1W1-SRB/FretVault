import { Module } from '@nestjs/common';

import { TabRevisionsService } from './tab-revisions.service';
import { TabRevisionsController } from './tab-revisions.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [TabRevisionsController],
  providers: [TabRevisionsService, PrismaService],
})
export class TabRevisionsModule {}
