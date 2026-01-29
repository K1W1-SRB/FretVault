import { parsePracticeBlockBody } from "./parse";
import { PracticeBlockData } from "./types";

export function findPracticeBlockAtPos(
  md: string,
  pos: number,
): null | {
  start: number;
  end: number;
  bodyStart: number;
  bodyEnd: number;
  body: string;
  data: PracticeBlockData;
} {
  const openRe = /```practice[ \t]*\n/g;
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
  const data = parsePracticeBlockBody(body);

  return {
    start,
    end: endWithNl,
    bodyStart,
    bodyEnd,
    body,
    data,
  };
}
