import { Prisma } from '@prisma/client';

export interface TabRevisionType {
  id: number;
  tabId: number;
  number: number;
  message: string | null;
  score: Prisma.JsonValue; // canonical tab JSON
  createdBy: number;
  createdAt: Date;
}
