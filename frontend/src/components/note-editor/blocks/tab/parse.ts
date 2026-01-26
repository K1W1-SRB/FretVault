import { DEFAULT_TIME, DEFAULT_TUNING, TabBlockData, toNumber } from "./types";

function parseHeaderLine(line: string, out: Record<string, unknown>) {
  const idx = line.indexOf(":");
  if (idx === -1) return;

  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim();

  if (!key) return;

  if (key === "bpm" || key === "capo" || key === "columns") {
    out[key] = toNumber(val);
    return;
  }

  out[key] = val;
}

export function parseTabBlockBody(rawBody: string): TabBlockData {
  const raw = String(rawBody ?? "").replace(/\r\n/g, "\n");

  const lines = raw.split("\n");
  const sepIdx = lines.findIndex((l) => l.trim() === "--");

  const headerLines = sepIdx === -1 ? lines : lines.slice(0, sepIdx);
  const tabLines = sepIdx === -1 ? [] : lines.slice(sepIdx + 1);

  const headerObj: Record<string, unknown> = {};
  for (const l of headerLines) {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    parseHeaderLine(trimmed, headerObj);
  }

  const name = typeof headerObj.name === "string" ? headerObj.name : undefined;
  const tuning =
    typeof headerObj.tuning === "string" ? headerObj.tuning : DEFAULT_TUNING;
  const time =
    typeof headerObj.time === "string" ? headerObj.time : DEFAULT_TIME;

  const tab = tabLines.join("\n").replace(/\n$/, "");

  return {
    name,
    tuning,
    time,
    bpm: typeof headerObj.bpm === "number" ? headerObj.bpm : undefined,
    capo: typeof headerObj.capo === "number" ? headerObj.capo : undefined,
    columns:
      typeof headerObj.columns === "number" ? headerObj.columns : undefined,
    tab: tab || undefined,
  };
}
