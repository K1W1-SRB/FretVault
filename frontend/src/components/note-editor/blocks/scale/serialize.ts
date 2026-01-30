import {
  DEFAULT_SCALE_ROOT,
  DEFAULT_SCALE_TYPE,
  ScaleBlockData,
  normalizePositions,
} from "./types";

export function serializeScaleBlock(data: ScaleBlockData) {
  const lines: string[] = [];

  lines.push("```scale");

  const root = (data.root ?? DEFAULT_SCALE_ROOT).trim() || DEFAULT_SCALE_ROOT;
  const type = (data.type ?? DEFAULT_SCALE_TYPE).trim() || DEFAULT_SCALE_TYPE;

  lines.push(`root: ${root}`);
  lines.push(`type: ${type}`);

  const positions = normalizePositions(data.positions);
  if (positions.length) lines.push(`positions: ${positions.join(",")}`);

  if (data.showIntervals) {
    lines.push("intervals: on");
  }

  lines.push("```");
  lines.push("");

  return lines.join("\n");
}
