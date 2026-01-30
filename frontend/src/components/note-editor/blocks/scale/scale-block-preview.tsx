import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SCALE_ROOT,
  DEFAULT_SCALE_TYPE,
  ScaleBlockData,
  normalizePositions,
} from "./types";
import { ScaleDiagram, ScaleNote } from "./scale-diagram";

type ScaleDefinition = {
  name: string;
  intervals: number[];
  labels: string[];
  aliases: string[];
};

const SCALE_DEFINITIONS: ScaleDefinition[] = [
  {
    name: "Major",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    labels: ["1", "2", "3", "4", "5", "6", "7"],
    aliases: ["major", "ionian", "major scale"],
  },
  {
    name: "Natural minor",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    labels: ["1", "2", "b3", "4", "5", "b6", "b7"],
    aliases: ["minor", "natural minor", "aeolian", "minor scale"],
  },
  {
    name: "Minor pentatonic",
    intervals: [0, 3, 5, 7, 10],
    labels: ["1", "b3", "4", "5", "b7"],
    aliases: ["minor pentatonic", "pentatonic minor", "min pentatonic"],
  },
  {
    name: "Major pentatonic",
    intervals: [0, 2, 4, 7, 9],
    labels: ["1", "2", "3", "5", "6"],
    aliases: ["major pentatonic", "pentatonic major", "maj pentatonic"],
  },
  {
    name: "Dorian",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    labels: ["1", "2", "b3", "4", "5", "6", "b7"],
    aliases: ["dorian"],
  },
  {
    name: "Mixolydian",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    labels: ["1", "2", "3", "4", "5", "6", "b7"],
    aliases: ["mixolydian"],
  },
  {
    name: "Phrygian",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    labels: ["1", "b2", "b3", "4", "5", "b6", "b7"],
    aliases: ["phrygian"],
  },
  {
    name: "Lydian",
    intervals: [0, 2, 4, 6, 7, 9, 11],
    labels: ["1", "2", "3", "#4", "5", "6", "7"],
    aliases: ["lydian"],
  },
  {
    name: "Locrian",
    intervals: [0, 1, 3, 5, 6, 8, 10],
    labels: ["1", "b2", "b3", "4", "b5", "b6", "b7"],
    aliases: ["locrian"],
  },
];

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  "B#": 0,
};

const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"];

function normalizeType(raw: string) {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

function findScaleDefinition(type: string): ScaleDefinition | null {
  const normalized = normalizeType(type);
  for (const def of SCALE_DEFINITIONS) {
    if (def.aliases.includes(normalized)) return def;
  }
  return null;
}

function parseRootSemitone(root: string): number | null {
  const trimmed = root.trim();
  const match = trimmed.match(/^([A-Ga-g])\s*([#b])?$/);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = match[2] ?? "";
  const key = `${letter}${accidental}` as keyof typeof NOTE_TO_SEMITONE;
  const val = NOTE_TO_SEMITONE[key];
  return typeof val === "number" ? val : null;
}

function positionStartFret(
  rootFret: number,
  intervals: number[],
  position: number,
) {
  const safePos = Math.max(1, Math.floor(position));
  const idx = safePos - 1;
  const octave = Math.floor(idx / intervals.length);
  const offset = intervals[idx % intervals.length] ?? 0;
  return rootFret + offset + octave * 12;
}

function buildScaleNotes({
  rootSemitone,
  intervals,
  labels,
  startFret,
  fretsToShow,
}: {
  rootSemitone: number;
  intervals: number[];
  labels: string[];
  startFret: number;
  fretsToShow: number;
}): ScaleNote[] {
  const intervalSet = new Set<number>(intervals);
  const labelByInterval = new Map<number, string>();
  intervals.forEach((i, idx) => labelByInterval.set(i, labels[idx] ?? ""));

  const tuningSemis = STANDARD_TUNING.map(
    (note) => NOTE_TO_SEMITONE[note],
  );

  const notes: ScaleNote[] = [];
  const endFret = startFret + fretsToShow - 1;

  for (let stringIndex = 0; stringIndex < tuningSemis.length; stringIndex += 1) {
    const openSemi = tuningSemis[stringIndex];
    for (let fret = startFret; fret <= endFret; fret += 1) {
      const semitone = (openSemi + fret) % 12;
      const interval = (semitone - rootSemitone + 12) % 12;
      if (!intervalSet.has(interval)) continue;
      notes.push({
        stringIndex,
        fret,
        isRoot: semitone === rootSemitone,
        label: labelByInterval.get(interval),
      });
    }
  }

  return notes;
}

export function ScaleBlockPreview({
  data,
  showToggle = true,
}: {
  data: ScaleBlockData;
  showToggle?: boolean;
}) {
  const root = (data.root ?? DEFAULT_SCALE_ROOT).trim() || DEFAULT_SCALE_ROOT;
  const type = (data.type ?? DEFAULT_SCALE_TYPE).trim() || DEFAULT_SCALE_TYPE;
  const positions = normalizePositions(data.positions);

  const def = React.useMemo(() => findScaleDefinition(type), [type]);
  const rootSemitone = React.useMemo(() => parseRootSemitone(root), [root]);

  const [showIntervals, setShowIntervals] = React.useState(
    Boolean(data.showIntervals),
  );

  React.useEffect(() => {
    setShowIntervals(Boolean(data.showIntervals));
  }, [data.showIntervals]);

  if (!def) {
    return (
      <div className="mb-3 rounded border bg-muted/40 p-3 text-sm">
        Unknown scale type: <span className="font-medium">{type}</span>
      </div>
    );
  }

  if (rootSemitone === null) {
    return (
      <div className="mb-3 rounded border bg-muted/40 p-3 text-sm">
        Unknown root: <span className="font-medium">{root}</span>
      </div>
    );
  }

  const rootFret =
    (rootSemitone - NOTE_TO_SEMITONE["E"] + 12) % 12;
  const fretsToShow = def.intervals.length <= 5 ? 4 : 5;

  return (
    <div className="mb-3 rounded border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{root}</Badge>
          <Badge variant="outline">{def.name}</Badge>
          <Badge variant="outline">
            {positions.length} position{positions.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {showToggle ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowIntervals((v) => !v)}
          >
            {showIntervals ? "Hide intervals" : "Show intervals"}
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {positions.map((pos) => {
          const startFret = Math.max(
            1,
            positionStartFret(rootFret, def.intervals, pos),
          );
          const notes = buildScaleNotes({
            rootSemitone,
            intervals: def.intervals,
            labels: def.labels,
            startFret,
            fretsToShow,
          });

          return (
            <div key={`scale-pos-${pos}`} className="rounded border p-2">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Position {pos}</span>
                <span>
                  Frets {startFret}-{startFret + fretsToShow - 1}
                </span>
              </div>
              <ScaleDiagram
                notes={notes}
                startFret={startFret}
                fretsToShow={fretsToShow}
                showIntervals={showIntervals}
                className="text-foreground"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
