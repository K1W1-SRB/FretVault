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

@Module({
  imports: [AuthModule, SongsModule, TabsModule, SongsModule],
  controllers: [AppController, RedocController, SongsController],
  providers: [
    AppService,
    SongsService,
    TabsService,
    SongsService,
    PrismaService,
  ],
})
export class AppModule {}
