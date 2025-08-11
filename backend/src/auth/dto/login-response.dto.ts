import { UserSafeDto } from './user-safe.dto';

export class LoginResponseDto extends UserSafeDto {
  access_token!: string;
}
