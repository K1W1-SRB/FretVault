export type StringValue = number | "x"; // 0=open, x=muted, >0 fretted
export type FingerValue = number | "x"; // x means “no finger label”, >0 shows label

export function ensureSix<T>(arr: T[] | null, fallback: T): T[] {
  if (!arr || arr.length !== 6)
    return Array.from({ length: 6 }).map(() => fallback);
  return arr;
}
