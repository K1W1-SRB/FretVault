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

export function normalizeTabData(data: unknown): TabBlockData {
  const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  return {
    name: typeof obj?.name === "string" ? obj.name : undefined,
    tuning: typeof obj?.tuning === "string" ? obj.tuning : undefined,
    time: typeof obj?.time === "string" ? obj.time : undefined,
    bpm: toNumber(obj?.bpm),
    capo: toNumber(obj?.capo),
    columns: toNumber(obj?.columns),
    tab: typeof obj?.tab === "string" ? obj.tab : undefined,
  };
}
