export type ScaleBlockData = {
  root?: string;
  type?: string;
  positions?: number[];
  showIntervals?: boolean;
};

export const DEFAULT_SCALE_ROOT = "A";
export const DEFAULT_SCALE_TYPE = "minor pentatonic";

export function normalizePositions(positions?: number[]): number[] {
  const unique = new Set<number>();
  for (const raw of positions ?? []) {
    const n = Math.floor(Number(raw));
    if (Number.isFinite(n) && n > 0) unique.add(n);
  }
  const sorted = Array.from(unique).sort((a, b) => a - b);
  return sorted.length ? sorted : [1];
}
