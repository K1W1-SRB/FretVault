export function normalizeMd(input: string) {
  let s = input ?? "";

  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      s = JSON.parse(s);
    } catch {
      s = s.slice(1, -1);
    }
  }

  s = s.replace(/\\n/g, "\n");
  return s;
}

export function replaceRange(
  s: string,
  start: number,
  end: number,
  insert: string,
) {
  return s.slice(0, start) + insert + s.slice(end);
}

export function insertAtPos(md: string, pos: number, insert: string) {
  const before = md.slice(0, pos);
  const after = md.slice(pos);

  const needsLeadingNl = before.length > 0 && !before.endsWith("\n\n");
  const leading = needsLeadingNl ? (before.endsWith("\n") ? "\n" : "\n\n") : "";

  const needsTrailingNl = after.length > 0 && !after.startsWith("\n");
  const trailing = needsTrailingNl ? "\n" : "";

  return before + leading + insert + trailing + after;
}
