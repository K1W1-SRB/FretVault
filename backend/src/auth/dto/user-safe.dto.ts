export class UserSafeDto {
  id!: string | number; // match your Prisma schema (likely string if cuid/uuid)
  email!: string;
  firstName!: string;
  lastName!: string;
}
