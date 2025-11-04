export enum PracticeCategory {
  WARMUP = 'WARMUP',
  CHORDS = 'CHORDS',
  SCALES = 'SCALES',
  SONGS = 'SONGS',
  THEORY = 'THEORY',
  EAR_TRAINING = 'EAR_TRAINING',
  COOL_DOWN = 'COOL_DOWN',
}

export interface PracticeItem {
  id: number;
  title: string;
  category: PracticeCategory;
  duration: number; // seconds
  description?: string;
  order: number;
  planId: number;
  createdAt: Date;
}

export interface PracticePlan {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  items: PracticeItem[];
}
