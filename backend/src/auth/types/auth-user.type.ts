// Narrow type the service uses after validation (no password).
// Keep this in sync with UserSafeDto.
export type AuthUser = {
  id: string | number; // match your Prisma schema
  email: string;
  name: string;
  accountType: string;
  avatar: string | null;
};
