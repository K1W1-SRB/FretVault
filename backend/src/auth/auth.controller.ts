import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserSafeDto } from './dto/user-safe.dto';
import { JwtAuthGuard } from './jwt-auth.guards';
import * as authenticatedRequestType from './types/authenticated-request.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Return your own DTO shape (no token in body). Cookie holds the JWT.
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<UserSafeDto> {
    const user = await this.authService.validateUser(dto.email, dto.password);
    const { accessToken, cookieOptions } =
      this.authService.issueAccessToken(user);
    res.cookie('access_token', accessToken, cookieOptions);
    return user; // <- matches UserSafeDto
  }

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<UserSafeDto> {
    const user = await this.authService.register(dto);
    return user; // <- matches UserSafeDto
  }

  @Post('logout')
  async logout(
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<{ ok: true }> {
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
  async me(
    @Req() req: authenticatedRequestType.AuthenticatedRequest,
  ): Promise<UserSafeDto> {
    return req.user;
  }
}
