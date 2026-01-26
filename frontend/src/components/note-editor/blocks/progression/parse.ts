import { DEFAULT_BARS, DEFAULT_KEY, ProgressionBlockData, toNumber } from "./types";

function parseHeaderLine(line: string, out: Record<string, unknown>) {
  const idx = line.indexOf(":");
  if (idx === -1) return;

  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim();
  if (!key) return;

  if (key === "bars") {
    out[key] = toNumber(val);
    return;
  }

  if (key === "chords") {
    out[key] = val;
    return;
  }

  out[key] = val;
}

export function parseProgressionBlockBody(rawBody: string): ProgressionBlockData {
  const raw = String(rawBody ?? "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  const headerObj: Record<string, unknown> = {};
  for (const l of lines) {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    parseHeaderLine(trimmed, headerObj);
  }

  const key = typeof headerObj.key === "string" ? headerObj.key : DEFAULT_KEY;
  const bars =
    typeof headerObj.bars === "number" ? headerObj.bars : DEFAULT_BARS;

  const chordRaw = typeof headerObj.chords === "string" ? headerObj.chords : "";
  const chords = chordRaw
    .split(/[,\s]+/g)
    .map((c) => c.trim())
    .filter(Boolean);

  return {
    key,
    bars,
    chords: chords.length ? chords : undefined,
  };
}
