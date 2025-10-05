import { Visibility } from '@prisma/client';

export interface SongType {
  id: number;
  title: string;
  artist: string | null;
  ownerId: number;
  visibility: Visibility;
  tempo: number | null;
  key: string | null;
  capo: number | null;
  timeSigTop: number | null;
  timeSigBot: number | null;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}
