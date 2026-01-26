export type TabBlockData = {
  name?: string;
  tuning?: string;
  bpm?: number;
  time?: string;
  capo?: number;
  columns?: number;
  tab?: string;
};

export const DEFAULT_TUNING = "E4,B3,G3,D3,A2,E2";
export const DEFAULT_TIME = "4/4";

export function toNumber(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeTabData(data: any): TabBlockData {
  return {
    name: typeof data?.name === "string" ? data.name : undefined,
    tuning: typeof data?.tuning === "string" ? data.tuning : undefined,
    time: typeof data?.time === "string" ? data.time : undefined,
    bpm: toNumber(data?.bpm),
    capo: toNumber(data?.capo),
    columns: toNumber(data?.columns),
    tab: typeof data?.tab === "string" ? data.tab : undefined,
  };
}
