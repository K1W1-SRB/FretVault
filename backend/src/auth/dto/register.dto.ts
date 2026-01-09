import { AccountType } from '@prisma/client';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  name: string;

  @IsString()
  avatar: string;
  @IsString()
  accountType: AccountType;

  @IsString()
  @MinLength(8)
  password!: string;
}
