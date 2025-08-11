import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AuthUser } from './types/auth-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private toAuthUser(user: any): AuthUser {
    // Prisma `user` type: adjust field names if different
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

  async login(user: AuthUser): Promise<LoginResponseDto> {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      ...user,
    };
  }

  async register(dto: RegisterDto): Promise<AuthUser> {
    const { email, password, firstName, lastName } = dto;
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
      },
    });

    return this.toAuthUser(user);
  }
}
