export type ProgressionBlockData = {
  key?: string;
  bars?: number;
  chords?: string[];
};

export const DEFAULT_KEY = "C";
export const DEFAULT_BARS = 4;

export function toNumber(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}
