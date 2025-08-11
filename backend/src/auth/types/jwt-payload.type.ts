export type JwtPayload = {
  sub: string | number; // user id type
  email: string;
  iat?: number;
  exp?: number;
};
