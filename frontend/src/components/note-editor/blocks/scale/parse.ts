import {
  DEFAULT_SCALE_ROOT,
  DEFAULT_SCALE_TYPE,
  ScaleBlockData,
  normalizePositions,
} from "./types";

function parseHeaderLine(line: string, out: Record<string, string>) {
  const idx = line.indexOf(":");
  if (idx === -1) return;
  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim();
  if (!key) return;
  out[key.toLowerCase()] = val;
}

function parsePositions(raw?: string): number[] | undefined {
  if (!raw) return undefined;
  const nums = raw
    .split(/[,\s]+/g)
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.floor(n));
  return nums.length ? nums : undefined;
}

function parseBool(raw?: string): boolean | undefined {
  if (!raw) return undefined;
  const val = raw.trim().toLowerCase();
  if (["true", "yes", "on", "1"].includes(val)) return true;
  if (["false", "no", "off", "0"].includes(val)) return false;
  return undefined;
}

export function parseScaleBlockBody(rawBody: string): ScaleBlockData {
  const raw = String(rawBody ?? "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  const headerObj: Record<string, string> = {};
  for (const l of lines) {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    parseHeaderLine(trimmed, headerObj);
  }

  const root = headerObj.root || DEFAULT_SCALE_ROOT;
  const type = headerObj.type || DEFAULT_SCALE_TYPE;
  const positions = parsePositions(headerObj.positions || headerObj.position);
  const showIntervals =
    parseBool(headerObj.intervals) ?? parseBool(headerObj["show-intervals"]);

  return {
    root,
    type,
    positions: normalizePositions(positions),
    showIntervals,
  };
}
