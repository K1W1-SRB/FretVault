import { DEFAULT_TIME, DEFAULT_TUNING, TabBlockData } from "./types";

export function serializeTabBlock(data: TabBlockData) {
  const lines: string[] = [];

  lines.push("```tab");

  const name = (data.name ?? "").trim();
  if (name) lines.push(`name: ${name}`);

  const tuning = (data.tuning ?? DEFAULT_TUNING).trim() || DEFAULT_TUNING;
  lines.push(`tuning: ${tuning}`);

  if (typeof data.bpm === "number" && Number.isFinite(data.bpm)) {
    lines.push(`bpm: ${data.bpm}`);
  }

  const time = (data.time ?? DEFAULT_TIME).trim() || DEFAULT_TIME;
  lines.push(`time: ${time}`);

  if (typeof data.capo === "number" && Number.isFinite(data.capo)) {
    lines.push(`capo: ${data.capo}`);
  }

  if (typeof data.columns === "number" && Number.isFinite(data.columns)) {
    lines.push(`columns: ${data.columns}`);
  }

  lines.push("--");

  const tab = String(data.tab ?? "").replace(/\n$/, "");
  if (tab) lines.push(tab);

  lines.push("```");
  lines.push("");

  return lines.join("\n");
}
