export interface TabRevisionType {
  id: number;
  tabId: number;
  number: number;
  message?: string;
  score: any; // canonical JSON structure
  createdBy: number;
  createdAt: Date;
}
