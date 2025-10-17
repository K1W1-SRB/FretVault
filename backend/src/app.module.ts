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
import { PractisePlansService } from './practise-plans/practice-plans.service';
import { PractisePlansModule } from './practise-plans/practice-plans.module';
import { PractiseItemsService } from './practise-items/practise-items.service';
import { PractiseItemsModule } from './practise-items/practise-items.module';

@Module({
  imports: [
    AuthModule,
    SongsModule,
    TabsModule,
    SongsModule,
    PractisePlansModule,
    PractiseItemsModule,
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
    PractisePlansService,
    PractiseItemsService,
  ],
})
export class AppModule {}
