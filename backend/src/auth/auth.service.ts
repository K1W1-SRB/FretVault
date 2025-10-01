// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { AuthUser } from './types/auth-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private toAuthUser(user: any): AuthUser {
    const { id, email, firstName, lastName } = user;
    return { id, email, firstName, lastName };
  }

  async validateUser(email: string, pass: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      return this.toAuthUser(user);
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  // NEW: central place to create the access token + cookie settings
  issueAccessToken(user: AuthUser) {
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload); // expiresIn is set in JwtModule
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // set true on HTTPS
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 hour
      // domain: process.env.COOKIE_DOMAIN, // if you need cross-subdomain
    };
    return { accessToken, cookieOptions };
  }

  // Kept for register; no token here
  async register(dto: RegisterDto): Promise<AuthUser> {
    const { email, password, firstName, lastName } = dto;
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await this.prisma.user.create({
      data: { email, firstName, lastName, password: hashedPassword },
    });

    return this.toAuthUser(user);
  }
}
