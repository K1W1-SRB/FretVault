export interface TabRevisionType {
  id: number;
  tabId: number;
  number: number;
  message: string | null;
  score: any; // canonical tab JSON
  createdBy: number;
  createdAt: Date;
}
