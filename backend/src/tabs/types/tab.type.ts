export interface TabType {
  id: number;
  songId: number;
  title: string;
  tuning?: string;
  tempo?: number;
  timeSigTop?: number;
  timeSigBot?: number;
  capo?: number;
  currentRev?: number;
  createdAt: Date;
  updatedAt: Date;
}
