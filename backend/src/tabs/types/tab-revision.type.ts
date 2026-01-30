import { Prisma } from '@prisma/client';

export interface TabRevisionType {
  id: number;
  tabId: number;
  number: number;
  message?: string;
  score: Prisma.JsonValue; // canonical JSON structure
  createdBy: number;
  createdAt: Date;
}
