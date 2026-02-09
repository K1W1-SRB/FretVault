export type PracticePlan = {
  id: number;
  name: string;
  description?: string | null;
  workspaceId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PracticeItem = {
  id: number;
  title: string;
  category: string;
  duration: number;
  order: number;
  description: string | null;
  targetType?: "NOTE" | "SONG" | null;
  targetRefId?: string | null;
};

export type NoteContent = {
  id: string;
  title: string;
  contentMd: string;
};

export type SongContent = {
  id: number;
  title: string;
  artist: string | null;
  tempo: number | null;
  key: string | null;
  timeSigTop: number | null;
  timeSigBot: number | null;
};

export type SongTab = {
  id: number;
  songId: number;
  title: string;
  tuning: string;
  tempo: number | null;
  timeSigTop: number | null;
  timeSigBot: number | null;
  capo: number | null;
};

export type TabRevision = {
  id: number;
  number: number;
  score: TabScore;
  createdAt: string;
};

export type TabScore = {
  version: number;
  tuning: string[];
  capo?: number | null;
  tempo?: number | null;
  timeSignature?: [number, number] | null;
  measures: {
    index: number;
    beatsPerMeasure: number;
    subdivisions: number;
    events: {
      time: string;
      notes: {
        string: number;
        fret: number;
        duration?: string;
        tech?: string[];
      }[];
    }[];
  }[];
};

export type FocusTarget = {
  id: string;
  type: string;
  refId: string | null;
  title: string;
  workspaceId: string;
};

export type FocusSession = {
  id: string;
  targetId: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  metricType: string;
  metricValue: number | null;
  difficulty: string | null;
  notes: string | null;
};

export type StatsOverview = {
  totalMinutes: number;
  sessionCount: number;
  currentStreak: number;
  mostPracticedTargets: Array<{
    targetId: string;
    title: string;
    type: string | null;
    refId: string | null;
    totalMinutes: number;
    sessionCount: number;
  }>;
};

export type TargetStats = {
  targetId: string;
  lastSessions: FocusSession[];
  trendMetricType: string;
  trend: Array<{ at: string; value: number }>;
  personalBest: Record<string, number>;
};
