export type PracticeEmbeddedBlock = {
  type: string;
  name: string;
};

export type PracticeStep = {
  raw?: string;
  text?: string;
  duration?: string;
  checked?: boolean;
  block?: PracticeEmbeddedBlock;
};

export type PracticeBlockData = {
  goal?: string;
  duration?: string;
  planId?: string;
  steps: PracticeStep[];
};
