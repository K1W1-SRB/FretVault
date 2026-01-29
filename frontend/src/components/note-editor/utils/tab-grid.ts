import type { TabGrid } from "../types";

export function parseTuningString(
  tuning: string | undefined,
  fallback: string,
): string[] {
  const raw = (tuning ?? fallback).split(",").map((s) => s.trim());
  const cleaned = raw.filter(Boolean);
  return cleaned.length ? cleaned : fallback.split(",").map((s) => s.trim());
}

export function buildEmptyGrid(rows: number, columns: number): TabGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => null),
  );
}

export function asciiToGrid(
  tabText: string,
  fallbackStrings: string[],
  fallbackColumns: number,
) {
  const rawLines = String(tabText ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length);

  if (!rawLines.length) {
    return {
      strings: fallbackStrings,
      columns: fallbackColumns,
      grid: buildEmptyGrid(fallbackStrings.length, fallbackColumns),
    };
  }

  const parsed = rawLines.map((line, idx) => {
    const first = line.indexOf("|");
    const last = line.lastIndexOf("|");
    let label = fallbackStrings[idx] ?? `String ${idx + 1}`;
    let body = line;
    if (first !== -1) {
      label = line.slice(0, first).trim() || label;
      body =
        last !== -1 && last > first
          ? line.slice(first + 1, last)
          : line.slice(first + 1);
    }
    return { label, body };
  });

  const columns = Math.max(
    fallbackColumns,
    ...parsed.map((p) => p.body.length),
  );

  const strings = parsed.map((p) => p.label);
  const grid = buildEmptyGrid(strings.length, columns);

  for (let r = 0; r < parsed.length; r++) {
    const body = parsed[r].body;
    for (let c = 0; c < columns; c++) {
      const ch = body[c];
      if (!ch) continue;
      if (ch === "-") continue;
      const n = Number(ch);
      if (Number.isFinite(n)) grid[r][c] = n;
    }
  }

  return { strings, columns, grid };
}

export function gridToAscii(grid: TabGrid, strings: string[], columns: number) {
  const label = (s: string) => s.padEnd(3, " ");
  const lines: string[] = [];
  for (let r = 0; r < strings.length; r++) {
    let line = `${label(strings[r])}|`;
    for (let c = 0; c < columns; c++) {
      const f = grid[r]?.[c];
      line += typeof f === "number" ? String(f) : "-";
    }
    line += "|";
    lines.push(line);
  }
  return lines.join("\n");
}
