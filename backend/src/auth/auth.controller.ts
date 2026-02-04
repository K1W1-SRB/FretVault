import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserSafeDto } from './dto/user-safe.dto';
import { JwtAuthGuard } from './jwt-auth.guards';
import type { AuthenticatedRequest } from './types/authenticated-request.type';
import { User } from './user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<UserSafeDto> {
    const user = await this.authService.validateUser(dto.email, dto.password);
    const { accessToken, cookieOptions } =
      this.authService.issueAccessToken(user);
    res.cookie('access_token', accessToken, cookieOptions);
    return user;
  }

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<UserSafeDto> {
    const user = await this.authService.register(dto);
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: express.Response): { ok: true } {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest): UserSafeDto {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(
    @User('id') userId: number,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserSafeDto> {
    return this.authService.updateProfile(userId, dto);
  }
}
