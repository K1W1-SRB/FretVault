import { FingerValue, StringValue } from "./types";

export function parseBlockPayload(body: string) {
  const obj: Record<string, any> = {};
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    obj[key] = value;
  }
  return obj;
}

export function parseCsvLineToStringValues(
  line?: string,
): StringValue[] | null {
  if (!line) return null;
  const parts = line
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!parts.length) return null;

  return parts.map((p) => {
    if (p.toLowerCase() === "x") return "x";
    const n = Number(p);
    return Number.isFinite(n) ? n : "x";
  });
}

export function parseCsvLineToFingerValues(
  line?: string,
): FingerValue[] | null {
  return parseCsvLineToStringValues(line) as FingerValue[] | null;
}

export function shapeToStrings(shape?: string): StringValue[] | null {
  if (!shape) return null;
  const s = shape.trim();
  if (!s) return null;

  const out: StringValue[] = [];
  for (const ch of s) {
    if (ch.toLowerCase() === "x") out.push("x");
    else if (ch >= "0" && ch <= "9") out.push(Number(ch));
  }

  return out.length === 6 ? out : null;
}
