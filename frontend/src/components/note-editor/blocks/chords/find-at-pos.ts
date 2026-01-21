// src/components/note-editor/blocks/chord/find-at-pos.ts
import { FingerValue, StringValue } from "./types";
import {
  parseBlockPayload,
  parseCsvLineToFingerValues,
  parseCsvLineToStringValues,
  shapeToStrings,
} from "./parse";

export function findChordBlockAtPos(
  md: string,
  pos: number,
): null | {
  start: number;
  end: number;
  bodyStart: number;
  bodyEnd: number;
  body: string;
  data: {
    name?: string;
    strings?: StringValue[];
    fingers?: FingerValue[];
    shape?: string;
  };
} {
  const openRe = /```chord[ \t]*\n/g;
  let openMatch: RegExpExecArray | null = null;

  while (true) {
    const m = openRe.exec(md);
    if (!m) break;
    if (m.index <= pos) openMatch = m;
    else break;
  }
  if (!openMatch) return null;

  const start = openMatch.index;
  const bodyStart = openRe.lastIndex;

  const closeIdx = md.indexOf("\n```", bodyStart);
  if (closeIdx === -1) return null;

  const end = closeIdx + "\n```".length;
  const endWithNl = md[end] === "\n" ? end + 1 : end;

  if (pos < start || pos > endWithNl) return null;

  const bodyEnd = closeIdx;
  const body = md.slice(bodyStart, bodyEnd).replace(/\n$/, "");
  const parsed = parseBlockPayload(body);

  const strings =
    parseCsvLineToStringValues(parsed.strings) ??
    shapeToStrings(parsed.shape) ??
    null;

  const fingers = parseCsvLineToFingerValues(parsed.fingers);

  return {
    start,
    end: endWithNl,
    bodyStart,
    bodyEnd,
    body,
    data: {
      name: parsed.name,
      strings: strings ?? undefined,
      fingers: fingers ?? undefined,
      shape: parsed.shape,
    },
  };
}
