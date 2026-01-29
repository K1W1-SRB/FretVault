import * as React from "react";

import { insertAtPos, replaceRange } from "../utils/markdown";
import {
  ensureSix,
  findChordBlockAtPos,
  serializeChordBlock,
} from "../blocks/chords";
import type { FingerValue, StringValue } from "../blocks/chords";
import {
  DEFAULT_TIME as DEFAULT_TAB_TIME,
  DEFAULT_TUNING as DEFAULT_TAB_TUNING,
  findTabBlockAtPos,
  serializeTabBlock,
  TabBlockData,
} from "../blocks/tab";
import {
  DEFAULT_BARS as DEFAULT_PROG_BARS,
  DEFAULT_KEY as DEFAULT_PROG_KEY,
  findProgressionBlockAtPos,
  serializeProgressionBlock,
} from "../blocks/progression";
import {
  asciiToGrid,
  buildEmptyGrid,
  gridToAscii,
  parseTuningString,
} from "../utils/tab-grid";
import type {
  ChordModalState,
  ProgressionModalState,
  TabModalState,
} from "../types";

type BlockModalArgs = {
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  closeContextMenu: () => void;
};

export function useBlockModals({
  draft,
  setDraft,
  setDirty,
  taRef,
  closeContextMenu,
}: BlockModalArgs) {
  const [chordModal, setChordModal] = React.useState<ChordModalState | null>(
    null,
  );
  const [tabModal, setTabModal] = React.useState<TabModalState | null>(null);
  const [progModal, setProgModal] =
    React.useState<ProgressionModalState | null>(null);

  function openInsertChord(pos: number) {
    closeContextMenu();
    setChordModal({
      mode: "insert",
      pos,
      name: "",
      strings: ["x", "x", "x", "x", "x", "x"],
      fingers: ["x", "x", "x", "x", "x", "x"],
      includeFingers: false,
    });
  }

  function openInsertTab(pos: number) {
    closeContextMenu();
    const strings = parseTuningString(DEFAULT_TAB_TUNING, DEFAULT_TAB_TUNING);
    const columns = 32;
    setTabModal({
      mode: "insert",
      pos,
      name: "",
      strings,
      time: DEFAULT_TAB_TIME,
      bpm: "",
      capo: "",
      columns,
      grid: buildEmptyGrid(strings.length, columns),
    });
  }

  function openInsertProgression(pos: number) {
    closeContextMenu();
    setProgModal({
      mode: "insert",
      pos,
      key: DEFAULT_PROG_KEY,
      bars: String(DEFAULT_PROG_BARS),
      chords: ["I", "V", "vi", "IV"],
      chordInput: "",
    });
  }

  function openEditChord(pos: number) {
    closeContextMenu();
    const chord = findChordBlockAtPos(draft, pos);
    if (!chord) return;

    const strings = ensureSix(chord.data.strings ?? null, "x" as StringValue);
    const fingers = ensureSix(chord.data.fingers ?? null, "x" as FingerValue);

    setChordModal({
      mode: "edit",
      pos,
      range: { start: chord.start, end: chord.end },
      name: chord.data.name ?? "",
      strings,
      fingers,
      includeFingers: (chord.data.fingers?.length ?? 0) === 6,
    });
  }

  function openEditTab(pos: number) {
    closeContextMenu();
    const tab = findTabBlockAtPos(draft, pos);
    if (!tab) return;

    const fallbackStrings = parseTuningString(
      tab.data.tuning,
      DEFAULT_TAB_TUNING,
    );
    const fallbackColumns = tab.data.columns ?? 32;
    const parsed = asciiToGrid(
      tab.data.tab ?? "",
      fallbackStrings,
      fallbackColumns,
    );

    setTabModal({
      mode: "edit",
      pos,
      range: { start: tab.start, end: tab.end },
      name: tab.data.name ?? "",
      strings: parsed.strings.length ? parsed.strings : fallbackStrings,
      time: tab.data.time ?? DEFAULT_TAB_TIME,
      bpm: typeof tab.data.bpm === "number" ? String(tab.data.bpm) : "",
      capo: typeof tab.data.capo === "number" ? String(tab.data.capo) : "",
      columns: parsed.columns,
      grid: parsed.grid,
    });
  }

  function openEditProgression(pos: number) {
    closeContextMenu();
    const prog = findProgressionBlockAtPos(draft, pos);
    if (!prog) return;

    setProgModal({
      mode: "edit",
      pos,
      range: { start: prog.start, end: prog.end },
      key: prog.data.key ?? DEFAULT_PROG_KEY,
      bars:
        typeof prog.data.bars === "number"
          ? String(prog.data.bars)
          : String(DEFAULT_PROG_BARS),
      chords: prog.data.chords ?? [],
      chordInput: "",
    });
  }

  function applyChordModal() {
    if (!chordModal) return;

    const block = serializeChordBlock({
      name: chordModal.name.trim(),
      strings: chordModal.strings,
      fingers: chordModal.includeFingers ? chordModal.fingers : undefined,
    });

    setDraft((prev) => {
      if (chordModal.mode === "insert") {
        return insertAtPos(prev, chordModal.pos, block);
      }
      if (!chordModal.range) return prev;
      return replaceRange(
        prev,
        chordModal.range.start,
        chordModal.range.end,
        block,
      );
    });

    setDirty(true);
    setChordModal(null);

    requestAnimationFrame(() => {
      taRef.current?.focus();
    });
  }

  function applyTabModal() {
    if (!tabModal) return;

    const toNumber = (raw: string) => {
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };

    const ascii = gridToAscii(
      tabModal.grid,
      tabModal.strings,
      tabModal.columns,
    );

    const data: TabBlockData = {
      name: tabModal.name.trim() || undefined,
      tuning: tabModal.strings.join(",") || DEFAULT_TAB_TUNING,
      time: tabModal.time.trim() || DEFAULT_TAB_TIME,
      bpm: tabModal.bpm.trim() ? toNumber(tabModal.bpm.trim()) : undefined,
      capo: tabModal.capo.trim() ? toNumber(tabModal.capo.trim()) : undefined,
      columns: tabModal.columns,
      tab: ascii.trim() ? ascii : undefined,
    };

    const block = serializeTabBlock(data);

    setDraft((prev) => {
      if (tabModal.mode === "insert") {
        return insertAtPos(prev, tabModal.pos, block);
      }
      if (!tabModal.range) return prev;
      return replaceRange(
        prev,
        tabModal.range.start,
        tabModal.range.end,
        block,
      );
    });

    setDirty(true);
    setTabModal(null);

    requestAnimationFrame(() => {
      taRef.current?.focus();
    });
  }

  function applyProgModal() {
    if (!progModal) return;

    const barsNum = Number(progModal.bars);
    const bars =
      Number.isFinite(barsNum) && barsNum > 0
        ? Math.floor(barsNum)
        : DEFAULT_PROG_BARS;

    const block = serializeProgressionBlock({
      key: progModal.key.trim() || DEFAULT_PROG_KEY,
      bars,
      chords: progModal.chords,
    });

    setDraft((prev) => {
      if (progModal.mode === "insert") {
        return insertAtPos(prev, progModal.pos, block);
      }
      if (!progModal.range) return prev;
      return replaceRange(
        prev,
        progModal.range.start,
        progModal.range.end,
        block,
      );
    });

    setDirty(true);
    setProgModal(null);

    requestAnimationFrame(() => {
      taRef.current?.focus();
    });
  }

  return {
    chordModal,
    setChordModal,
    tabModal,
    setTabModal,
    progModal,
    setProgModal,
    openInsertChord,
    openInsertTab,
    openInsertProgression,
    openEditChord,
    openEditTab,
    openEditProgression,
    applyChordModal,
    applyTabModal,
    applyProgModal,
  };
}
