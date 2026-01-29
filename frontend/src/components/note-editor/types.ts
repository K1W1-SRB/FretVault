import type { FingerValue, StringValue } from "./blocks/chords";
import type { PracticeStep } from "./blocks/practice";

export type TabRow = (number | null)[];
export type TabGrid = TabRow[];

export type LinkContext = {
  replaceStart: number;
  replaceEnd: number;
  query: string;
};

export type ContextMenuState = {
  x: number;
  y: number;
  pos: number;
  hasChordBlock: boolean;
  hasTabBlock: boolean;
  hasProgBlock: boolean;
  hasPracticeBlock: boolean;
};

export type ChordModalState = {
  mode: "insert" | "edit";
  pos: number;
  range?: { start: number; end: number };
  name: string;
  strings: StringValue[];
  fingers: FingerValue[];
  includeFingers: boolean;
};

export type TabModalState = {
  mode: "insert" | "edit";
  pos: number;
  range?: { start: number; end: number };
  name: string;
  strings: string[];
  time: string;
  bpm: string;
  capo: string;
  columns: number;
  grid: TabGrid;
};

export type ProgressionModalState = {
  mode: "insert" | "edit";
  pos: number;
  range?: { start: number; end: number };
  key: string;
  bars: string;
  chords: string[];
  chordInput: string;
};

export type PracticeModalState = {
  mode: "insert" | "edit";
  pos: number;
  range?: { start: number; end: number };
  goal: string;
  duration: string;
  planId: string;
  steps: PracticeStep[];
};

export type NoteSuggestion = {
  id: string | number;
  slug: string;
  title?: string | null;
};
