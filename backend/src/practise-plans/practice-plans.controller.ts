import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';

@Controller('practice-plans')
export class PracticePlansController {
  constructor(prisma: PrismaService, auth: AuthService) {}

  @Post()
  create(@Body() dto) {}
}
