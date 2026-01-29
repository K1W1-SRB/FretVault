import { Request } from 'express';
import { UserSafeDto } from '../dto/user-safe.dto';

export interface AuthenticatedRequest extends Request {
  user: UserSafeDto;
}
