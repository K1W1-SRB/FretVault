import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { R2StorageService } from 'src/storage/r2-storage.service';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, PrismaService, R2StorageService],
})
export class AssetsModule {}
