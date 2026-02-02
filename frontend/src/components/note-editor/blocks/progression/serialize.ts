import { DEFAULT_BARS, DEFAULT_KEY, ProgressionBlockData } from "./types";

export function serializeProgressionBlock(data: ProgressionBlockData) {
  const lines: string[] = [];

  lines.push("```prog");

  const key = (data.key ?? DEFAULT_KEY).trim() || DEFAULT_KEY;
  lines.push(`key: ${key}`);

  const bars =
    typeof data.bars === "number" && Number.isFinite(data.bars)
      ? data.bars
      : DEFAULT_BARS;
  lines.push(`bars: ${bars}`);

  const chords = (data.chords ?? []).filter(Boolean);
  if (chords.length) lines.push(`chords: ${chords.join(" ")}`);

  lines.push("```");
  lines.push("");

  return lines.join("\n");
}
