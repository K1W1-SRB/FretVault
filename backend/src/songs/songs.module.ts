import { Module } from '@nestjs/common';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { PrismaService } from 'prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [SongsController],
  providers: [SongsService, PrismaService, AuthService, JwtService],
  exports: [SongsService],
})
export class SongsModule {}
