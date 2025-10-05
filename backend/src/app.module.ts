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

@Module({
  imports: [AuthModule, SongsModule, TabsModule, SongsModule],
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
  ],
})
export class AppModule {}
