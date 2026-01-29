import { Module } from '@nestjs/common';
import { PracticePlansController } from './practice-plans.controller';
import { PracticePlansService } from './practice-plans.service';
import { PrismaService } from 'prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PracticePlansController],
  providers: [PracticePlansService, PrismaService, JwtService],
  exports: [PracticePlansService],
})
export class PracticePlansModule {}
