import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_BARS,
  DEFAULT_KEY,
  ProgressionBlockData,
} from "./types";

const MAJOR_SCALES: Record<string, string[]> = {
  C: ["C", "D", "E", "F", "G", "A", "B"],
  "G": ["G", "A", "B", "C", "D", "E", "F#"],
  "D": ["D", "E", "F#", "G", "A", "B", "C#"],
  "A": ["A", "B", "C#", "D", "E", "F#", "G#"],
  "E": ["E", "F#", "G#", "A", "B", "C#", "D#"],
  "B": ["B", "C#", "D#", "E", "F#", "G#", "A#"],
  "F#": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
  "C#": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"],
  "F": ["F", "G", "A", "Bb", "C", "D", "E"],
  "Bb": ["Bb", "C", "D", "Eb", "F", "G", "A"],
  "Eb": ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
  "Ab": ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
  "Db": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
  "Gb": ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"],
  "Cb": ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"],
};

function slugifyChord(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function isRomanToken(token: string) {
  return /^[ivIV]+(°|dim)?$/.test(token.trim());
}

function romanToDegree(roman: string) {
  const upper = roman.toUpperCase();
  switch (upper) {
    case "I":
      return 1;
    case "II":
      return 2;
    case "III":
      return 3;
    case "IV":
      return 4;
    case "V":
      return 5;
    case "VI":
      return 6;
    case "VII":
      return 7;
    default:
      return null;
  }
}

function romanToChordName(token: string, key: string) {
  if (!isRomanToken(token)) return null;
  const match = token.match(/^([ivIV]+)(°|dim)?$/);
  if (!match) return null;

  const degree = romanToDegree(match[1]);
  if (!degree) return null;

  const scale = MAJOR_SCALES[key] ?? null;
  if (!scale) return null;

  const base = scale[degree - 1];
  const isMinor = match[1] === match[1].toLowerCase();
  const isDim = Boolean(match[2]);
  const suffix = isDim ? "dim" : isMinor ? "m" : "";
  return `${base}${suffix}`;
}

function buildBarSeparators(total: number, bars: number) {
  if (!bars || total <= 1) return new Set<number>();
  const perBar = Math.max(1, Math.ceil(total / bars));
  const out = new Set<number>();
  for (let i = perBar - 1; i < total - 1; i += perBar) out.add(i);
  return out;
}

export function ProgressionBlockPreview({ data }: { data: ProgressionBlockData }) {
  const key = (data.key ?? DEFAULT_KEY).trim() || DEFAULT_KEY;
  const bars =
    typeof data.bars === "number" && Number.isFinite(data.bars)
      ? data.bars
      : DEFAULT_BARS;
  const chords = (data.chords ?? []).filter(Boolean);

  const defaultRoman = React.useMemo(
    () => chords.length > 0 && chords.every(isRomanToken),
    [chords],
  );
  const [showRoman, setShowRoman] = React.useState(defaultRoman);

  const separators = React.useMemo(
    () => buildBarSeparators(chords.length, bars),
    [chords.length, bars],
  );

  return (
    <div className="mb-3 rounded border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{key}</Badge>
          <Badge variant="outline">{bars} bars</Badge>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowRoman((v) => !v)}
        >
          {showRoman ? "Show chords" : "Show roman"}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chords.length ? (
          chords.map((token, idx) => {
            const roman = isRomanToken(token);
            const chordName = roman ? romanToChordName(token, key) : token;
            const display = showRoman && roman ? token : chordName ?? token;
            const linkTarget = chordName ?? token;
            const anchor = slugifyChord(linkTarget);

            return (
              <React.Fragment key={`${token}-${idx}`}>
                <a
                  href={anchor ? `#chord-${anchor}` : undefined}
                  className="rounded border px-2 py-1 text-sm hover:bg-muted"
                >
                  {display}
                </a>
                {separators.has(idx) ? (
                  <span className="text-muted-foreground">|</span>
                ) : null}
              </React.Fragment>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground">
            No chords in this progression yet.
          </div>
        )}
      </div>
    </div>
  );
}
