import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedocController } from './redoc/redoc.controller';
import { AuthModule } from './auth/auth.module';
import { SongsService } from './songs/songs.service';
import { SongsModule } from './songs/songs.module';
import { TabsService } from './tabs/tabs.service';
import { TabsModule } from './tabs/tabs.module';

@Module({
  imports: [AuthModule, SongsModule, TabsModule],
  controllers: [AppController, RedocController],
  providers: [AppService, SongsService, TabsService],
})
export class AppModule {}
