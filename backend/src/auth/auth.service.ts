// auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthUser } from './types/auth-user.type';
import { AccountType, User } from '@prisma/client';
import { WorkspacesService } from 'src/workspace/workspace.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  private toAuthUser(user: User): AuthUser {
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

    await this.workspacesService.ensurePersonalWorkspace(user.id);

    return this.toAuthUser(user);
  }

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    const data: { name?: string; avatar?: string | null } = {};

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Name cannot be empty');
      }
      data.name = trimmed;
    }

    if (dto.avatar !== undefined) {
      data.avatar = dto.avatar;
    }

    if (Object.keys(data).length === 0) {
      const existing = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!existing) throw new NotFoundException('User not found');
      return this.toAuthUser(existing);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.toAuthUser(user);
  }
}
