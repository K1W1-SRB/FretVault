import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedocController } from './redoc/redoc.controller';
import { AuthModule } from './auth/auth.module';
import { SongsService } from './songs/songs.service';
import { SongsModule } from './songs/songs.module';
import { TabsService } from './tabs/tabs.service';
import { TabsModule } from './tabs/tabs.module';
import { SongsController } from './songs/songs.controller';
import { PrismaService } from 'prisma/prisma.service';
import { TabRevisionsService } from './tabs/revisions/tab-revisions.service';
import { TabRevisionsController } from './tabs/revisions/tab-revisions.controller';
import { PracticePlansModule } from './practise-plans/practice-plans.module';
import { PracticeItemsModule } from './practise-items/practice-items.module';
import { PracticePlansService } from './practise-plans/practice-plans.service';
import { PracticeItemsService } from './practise-items/practice-items.service';

@Module({
  imports: [
    AuthModule,
    SongsModule,
    TabsModule,
    SongsModule,
    PracticePlansModule,
    PracticeItemsModule,
  ],
  controllers: [
    AppController,
    RedocController,
    SongsController,
    TabRevisionsController,
  ],
  providers: [
    AppService,
    SongsService,
    TabsService,
    SongsService,
    PrismaService,
    TabRevisionsService,
    PracticePlansService,
    PracticeItemsService,
  ],
})
export class AppModule {}
