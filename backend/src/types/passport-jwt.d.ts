declare module 'passport-jwt' {
  import { Request } from 'express';

  export interface StrategyOptions {
    jwtFromRequest: (req: Request) => string | null;
    secretOrKey: string;
    ignoreExpiration?: boolean;
  }

  export class Strategy {
    constructor(
      options: StrategyOptions,
      verify?: (
        payload: unknown,
        done: (err: unknown, user?: unknown, info?: unknown) => void,
      ) => void,
    );
  }
}
