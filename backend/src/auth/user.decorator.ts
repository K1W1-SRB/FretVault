import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserSafeDto } from './dto/user-safe.dto';
import { AuthenticatedRequest } from './types/authenticated-request.type';

export const User = createParamDecorator<
  keyof UserSafeDto | undefined,
  UserSafeDto | UserSafeDto[keyof UserSafeDto] | undefined
>((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  const user = request.user;
  return data ? user?.[data] : user;
});
