// src/components/note-editor/blocks/chord/serialize.ts
import { ensureSix, FingerValue, StringValue } from "./types";

export function serializeChordBlock(data: {
  name: string;
  strings: StringValue[];
  fingers?: FingerValue[];
}) {
  const name = (data.name ?? "").trim();
  const strings = ensureSix(data.strings, "x" as StringValue);
  const fingers = data.fingers
    ? ensureSix(data.fingers, "x" as FingerValue)
    : null;

  const stringsLine = strings.map(String).join(",");
  const lines = ["```chord", `name: ${name}`, `strings: ${stringsLine}`];

  if (fingers) {
    const fingersLine = fingers.map(String).join(",");
    lines.push(`fingers: ${fingersLine}`);
  }

  lines.push("```", "");
  return lines.join("\n");
}
