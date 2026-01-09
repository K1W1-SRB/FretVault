// auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { AuthUser } from './types/auth-user.type';
import { AccountType } from '@prisma/client';
import { WorkspacesService } from 'src/workspace/workspace.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  private toAuthUser(user: any): AuthUser {
    const { id, email, name, avatar, accountType } = user;
    return { id, email, name, avatar, accountType };
  }

  async validateUser(email: string, pass: string): Promise<AuthUser> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && (await bcrypt.compare(pass, user.password))) {
      return this.toAuthUser(user);
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  // central place to create the access token + cookie settings
  issueAccessToken(user: AuthUser) {
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload); // expiresIn is set in JwtModule
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 hour
    };
    return { accessToken, cookieOptions };
  }

  async register(dto: RegisterDto): Promise<AuthUser> {
    const email = dto.email.toLowerCase().trim();
    const name = dto.name.trim();
    const avatar = dto.avatar;
    const accountType = dto.accountType ?? AccountType.SOLO;

    // Optional but smart: fail fast with a clean error
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        accountType,
        avatar,
        password: hashedPassword,
      },
    });

    // ✅ Critical: every user must have a personal workspace
    await this.workspacesService.ensurePersonalWorkspace(user.id);

    return this.toAuthUser(user);
  }
}
