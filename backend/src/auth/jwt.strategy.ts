import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from 'prisma/prisma.service';
import { UserSafeDto } from './dto/user-safe.dto';

type JwtPayload = { sub: number; email?: string };

function cookieExtractor(req: Request): string | null {
  const cookies = (req as unknown as { cookies?: Record<string, string> })
    .cookies;
  const token = cookies?.['access_token'];
  if (typeof token === 'string' && token.trim()) return token;
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<UserSafeDto | null> {
    return this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
        avatar: true,
      },
    });
  }
}
