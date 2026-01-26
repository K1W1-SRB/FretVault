// src/components/note-editor/note-editor.tsx
"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { notesApi } from "@/lib/notes-api";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";

import { mdComponents } from "../note-editor/utils/markdown-components";
import {
  normalizeMd,
  insertAtPos,
  replaceRange,
} from "../note-editor/utils/markdown";
import {
  ensureSix,
  findChordBlockAtPos,
  FingerValue,
  serializeChordBlock,
  StringValue,
  ChordDiagram,
} from "../note-editor/blocks/chords";
import {
  DEFAULT_TIME as DEFAULT_TAB_TIME,
  DEFAULT_TUNING as DEFAULT_TAB_TUNING,
  findTabBlockAtPos,
  serializeTabBlock,
  TabBlockData,
} from "../note-editor/blocks/tab";
import {
  DEFAULT_BARS as DEFAULT_PROG_BARS,
  DEFAULT_KEY as DEFAULT_PROG_KEY,
  findProgressionBlockAtPos,
  ProgressionBlockPreview,
  serializeProgressionBlock,
} from "../note-editor/blocks/progression";
import { OptionSelect } from "./ui/option-select";

type TabRow = (number | null)[];
type TabGrid = TabRow[];

function parseTuningString(
  tuning: string | undefined,
  fallback: string,
): string[] {
  const raw = (tuning ?? fallback).split(",").map((s) => s.trim());
  const cleaned = raw.filter(Boolean);
  return cleaned.length ? cleaned : fallback.split(",").map((s) => s.trim());
}

function buildEmptyGrid(rows: number, columns: number): TabGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => null),
  );
}

function asciiToGrid(
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

function gridToAscii(grid: TabGrid, strings: string[], columns: number) {
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

export function NoteEditor({ activeSlug }: { activeSlug: string | null }) {
  const qc = useQueryClient();
  const { selectedWorkspaceId } = useSelectedWorkspace();

  const noteQuery = useQuery({
    queryKey: ["note", selectedWorkspaceId, activeSlug],
    queryFn: () =>
      notesApi.getBySlug(selectedWorkspaceId as string, activeSlug as string),
    enabled: !!selectedWorkspaceId && !!activeSlug,
  });

  const [draft, setDraft] = React.useState("");
  const [dirty, setDirty] = React.useState(false);

  const taRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [menu, setMenu] = React.useState<null | {
    x: number;
    y: number;
    pos: number;
    hasChordBlock: boolean;
    hasTabBlock: boolean;
    hasProgBlock: boolean;
  }>(null);

  const [chordModal, setChordModal] = React.useState<null | {
    mode: "insert" | "edit";
    pos: number;
    range?: { start: number; end: number };
    name: string;
    strings: StringValue[];
    fingers: FingerValue[];
    includeFingers: boolean;
  }>(null);

  const [tabModal, setTabModal] = React.useState<null | {
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
  }>(null);

  const [progModal, setProgModal] = React.useState<null | {
    mode: "insert" | "edit";
    pos: number;
    range?: { start: number; end: number };
    key: string;
    bars: string;
    chords: string[];
    chordInput: string;
  }>(null);

  React.useEffect(() => {
    if (noteQuery.data) {
      setDraft(normalizeMd(noteQuery.data.contentMd ?? ""));
      setDirty(false);
      return;
    }
    if (selectedWorkspaceId || activeSlug) {
      setDraft("");
      setDirty(false);
    }
  }, [noteQuery.data?.id, selectedWorkspaceId, activeSlug]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkspaceId) return;
      if (!noteQuery.data) return;

      return notesApi.update(selectedWorkspaceId, noteQuery.data.id, {
        contentMd: draft,
      });
    },
    onSuccess: async (updated) => {
      if (!updated) return;

      qc.setQueryData(["note", selectedWorkspaceId, activeSlug], updated);

      await qc.invalidateQueries({
        queryKey: ["notes", selectedWorkspaceId],
      });

      setDirty(false);
    },
  });

  function openContextMenu(e: React.MouseEvent) {
    e.preventDefault();

    const el = taRef.current;
    if (!el) return;

    const pos = el.selectionStart ?? 0;
    const chord = findChordBlockAtPos(draft, pos);
    const tab = findTabBlockAtPos(draft, pos);
    const prog = findProgressionBlockAtPos(draft, pos);

    setMenu({
      x: e.clientX,
      y: e.clientY,
      pos,
      hasChordBlock: !!chord,
      hasTabBlock: !!tab,
      hasProgBlock: !!prog,
    });
  }

  function closeContextMenu() {
    setMenu(null);
  }

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

  function withSelection(
    handler: (args: {
      start: number;
      end: number;
      value: string;
    }) => { text: string; selectStart: number; selectEnd: number },
  ) {
    const el = taRef.current;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = draft;

    const result = handler({ start, end, value });
    setDraft(result.text);
    setDirty(true);

    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = result.selectStart;
      el.selectionEnd = result.selectEnd;
    });
  }

  function wrapSelection(prefix: string, suffix: string, placeholder: string) {
    withSelection(({ start, end, value }) => {
      const selected = value.slice(start, end);
      const content = selected || placeholder;
      const insert = `${prefix}${content}${suffix}`;
      const text = replaceRange(value, start, end, insert);
      const selectStart = start + prefix.length;
      const selectEnd = selectStart + content.length;
      return { text, selectStart, selectEnd };
    });
  }

  function prefixLines(prefix: string) {
    withSelection(({ start, end, value }) => {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEndRaw = value.indexOf("\n", end);
      const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
      const block = value.slice(lineStart, lineEnd);
      const lines = block.split("\n").map((l) => `${prefix}${l}`);
      const insert = lines.join("\n");
      const text = replaceRange(value, lineStart, lineEnd, insert);
      const selectStart = start + prefix.length;
      const selectEnd = end + prefix.length * lines.length;
      return { text, selectStart, selectEnd };
    });
  }

  function insertLink() {
    withSelection(({ start, end, value }) => {
      const selected = value.slice(start, end) || "link text";
      const url = "https://";
      const insert = `[${selected}](${url})`;
      const text = replaceRange(value, start, end, insert);
      const selectStart = start + selected.length + 3;
      const selectEnd = selectStart + url.length;
      return { text, selectStart, selectEnd };
    });
  }

  function insertCodeBlock() {
    withSelection(({ start, end, value }) => {
      const insert = "```\n\n```";
      const text = replaceRange(value, start, end, insert);
      const selectStart = start + 4;
      const selectEnd = start + 4;
      return { text, selectStart, selectEnd };
    });
  }

  function insertProgressionBlock() {
    const el = taRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    openInsertProgression(pos);
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

  function addProgChord() {
    setProgModal((m) => {
      if (!m) return m;
      const raw = m.chordInput.trim();
      if (!raw) return { ...m, chordInput: "" };
      const parts = raw
        .split(/[,\s]+/g)
        .map((p) => p.trim())
        .filter(Boolean);
      const next = [...m.chords, ...parts];
      return { ...m, chords: next, chordInput: "" };
    });
  }

  function removeProgChord(idx: number) {
    setProgModal((m) => {
      if (!m) return m;
      const next = m.chords.slice();
      next.splice(idx, 1);
      return { ...m, chords: next };
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

  const fretOptions = React.useMemo(() => {
    const nums = Array.from({ length: 25 }).map((_, i) => String(i)); // 0..24
    return ["x", ...nums];
  }, []);

  const fingerOptions = React.useMemo(() => ["x", "1", "2", "3", "4"], []);

  const FRET_CYCLE = [
    null,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
  ] as const;

  function toggleTabCell(r: number, c: number) {
    setTabModal((m) => {
      if (!m) return m;
      const grid = m.grid.map((row) => [...row]);
      const cur = grid[r]?.[c];
      if (cur === undefined) return m;

      const curIndex =
        typeof cur === "number" &&
        Number.isInteger(cur) &&
        cur >= 0 &&
        cur <= 17
          ? cur + 1
          : 0;
      const next = FRET_CYCLE[(curIndex + 1) % FRET_CYCLE.length];
      grid[r][c] = next;
      return { ...m, grid };
    });
  }

  function updateTabColumns(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const nextColumns = Math.max(8, Math.min(128, Math.floor(parsed)));
    setTabModal((m) => {
      if (!m) return m;
      const grid = m.grid.map((row) => {
        const clone = [...row];
        if (clone.length < nextColumns) {
          return [
            ...clone,
            ...Array.from({ length: nextColumns - clone.length }, () => null),
          ];
        }
        clone.length = nextColumns;
        return clone;
      });
      return { ...m, columns: nextColumns, grid };
    });
  }

  function updateTabStrings(raw: string) {
    const nextStrings = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!nextStrings.length) return;

    setTabModal((m) => {
      if (!m) return m;
      const columns = m.columns;
      const nextGrid = buildEmptyGrid(nextStrings.length, columns);
      const copyRows = Math.min(m.grid.length, nextStrings.length);
      for (let r = 0; r < copyRows; r++) {
        for (let c = 0; c < columns; c++) {
          nextGrid[r][c] = m.grid[r]?.[c] ?? null;
        }
      }
      return { ...m, strings: nextStrings, grid: nextGrid };
    });
  }

  if (!activeSlug) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Pick a note from the left.
      </div>
    );
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a workspace.
      </div>
    );
  }

  if (noteQuery.isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading note...</div>
    );
  }

  if (noteQuery.isError || !noteQuery.data) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Failed to load note.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" onClick={closeContextMenu}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {noteQuery.data.title || "Untitled"}
          </div>
          <div className="text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : "Up to date"}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="write" className="h-full">
          <div className="border-b px-3 py-2">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="write" className="m-0 h-[calc(100%-48px)] p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => prefixLines("# ")}
                >
                  H1
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => prefixLines("## ")}
                >
                  H2
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => prefixLines("### ")}
                >
                  H3
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => wrapSelection("**", "**", "bold text")}
                >
                  Bold
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => wrapSelection("*", "*", "italic text")}
                >
                  Italic
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => wrapSelection("`", "`", "code")}
                >
                  Code
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={insertCodeBlock}
                >
                  Code block
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={insertLink}
                >
                  Link
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => prefixLines("> ")}
                >
                  Quote
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => prefixLines("- ")}
                >
                  Bulleted
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => prefixLines("1. ")}
                >
                  Numbered
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openInsertChord(taRef.current?.selectionStart ?? 0)}
                >
                  Chord block
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openInsertTab(taRef.current?.selectionStart ?? 0)}
                >
                  Tab block
                </Button>
                <Button type="button" size="sm" onClick={insertProgressionBlock}>
                  Progression
                </Button>
              </div>
            </div>

            <Textarea
              ref={taRef as any}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDirty(true);
              }}
              onContextMenu={openContextMenu}
              className="h-full resize-none font-mono"
              placeholder="Write markdown... Right-click to insert/edit chord or tab blocks."
            />

            {menu && (
              <div
                className="fixed z-50 w-56 rounded border bg-background p-1 shadow"
                style={{ left: menu.x, top: menu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => openInsertChord(menu.pos)}
                >
                  Insert chord block
                </button>

                <button
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  disabled={!menu.hasChordBlock}
                  onClick={() => openEditChord(menu.pos)}
                >
                  Edit chord block
                </button>

                <button
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => openInsertTab(menu.pos)}
                >
                  Insert tab block
                </button>

                <button
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  disabled={!menu.hasTabBlock}
                  onClick={() => openEditTab(menu.pos)}
                >
                  Edit tab block
                </button>

                <button
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => openInsertProgression(menu.pos)}
                >
                  Insert progression block
                </button>

                <button
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  disabled={!menu.hasProgBlock}
                  onClick={() => openEditProgression(menu.pos)}
                >
                  Edit progression block
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="preview"
            className="m-0 h-[calc(100%-48px)] overflow-auto p-4"
          >
            <div className="prose max-w-none">
              <ReactMarkdown components={mdComponents}>
                {normalizeMd(draft) || "_Nothing to preview._"}
              </ReactMarkdown>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {chordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setChordModal(null)}
        >
          <div
            className="w-full max-w-lg rounded border bg-background p-4 shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium">
              {chordModal.mode === "insert" ? "Insert chord" : "Edit chord"}
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">Name</div>
                <Input
                  value={chordModal.name}
                  onChange={(e) =>
                    setChordModal((m) =>
                      m ? { ...m, name: e.target.value } : m,
                    )
                  }
                  placeholder="Dm7"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">
                  Strings (low E → high E)
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {chordModal.strings.map((v, idx) => (
                    <div key={`s-${idx}`} className="grid gap-1">
                      <div className="text-[10px] text-muted-foreground text-center">
                        {["E", "A", "D", "G", "B", "e"][idx]}
                      </div>
                      <OptionSelect
                        value={String(v)}
                        options={fretOptions}
                        onChange={(val) => {
                          const parsed: StringValue =
                            val === "x" ? "x" : Number(val);
                          setChordModal((m) => {
                            if (!m) return m;
                            const next = m.strings.slice();
                            next[idx] = parsed;
                            return { ...m, strings: next };
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="text-xs text-muted-foreground">
                    Finger numbers (optional)
                  </div>
                  <button
                    className="text-xs underline"
                    onClick={() =>
                      setChordModal((m) =>
                        m ? { ...m, includeFingers: !m.includeFingers } : m,
                      )
                    }
                  >
                    {chordModal.includeFingers ? "Disable" : "Enable"}
                  </button>
                </div>

                {chordModal.includeFingers && (
                  <div className="grid grid-cols-6 gap-2">
                    {chordModal.fingers.map((v, idx) => (
                      <div key={`f-${idx}`} className="grid gap-1">
                        <div className="text-[10px] text-muted-foreground text-center">
                          {["E", "A", "D", "G", "B", "e"][idx]}
                        </div>
                        <OptionSelect
                          value={String(v)}
                          options={fingerOptions}
                          onChange={(val) => {
                            const parsed: FingerValue =
                              val === "x" ? "x" : Number(val);
                            setChordModal((m) => {
                              if (!m) return m;
                              const next = m.fingers.slice();
                              next[idx] = parsed;
                              return { ...m, fingers: next };
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2">
                  Preview:
                </div>
                <div className="rounded border p-3 inline-block">
                  <ChordDiagram
                    name={chordModal.name || "Chord"}
                    strings={chordModal.strings}
                    fingers={
                      chordModal.includeFingers ? chordModal.fingers : undefined
                    }
                    className="text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setChordModal(null)}>
                Cancel
              </Button>
              <Button onClick={applyChordModal}>Apply</Button>
            </div>
          </div>
        </div>
      )}

      {tabModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setTabModal(null)}
        >
          <div
            className="w-full max-w-2xl rounded border bg-background p-4 shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium">
              {tabModal.mode === "insert" ? "Insert tab" : "Edit tab"}
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={tabModal.name}
                  onChange={(e) =>
                    setTabModal((m) => (m ? { ...m, name: e.target.value } : m))
                  }
                  placeholder="Verse riff"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    value={tabModal.time}
                    onChange={(e) =>
                      setTabModal((m) =>
                        m ? { ...m, time: e.target.value } : m,
                      )
                    }
                    placeholder={DEFAULT_TAB_TIME}
                  />
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">BPM</Label>
                  <Input
                    value={tabModal.bpm}
                    onChange={(e) =>
                      setTabModal((m) =>
                        m ? { ...m, bpm: e.target.value } : m,
                      )
                    }
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Capo</Label>
                  <Input
                    value={tabModal.capo}
                    onChange={(e) =>
                      setTabModal((m) =>
                        m ? { ...m, capo: e.target.value } : m,
                      )
                    }
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Tuning</Label>
                  <Input
                    value={tabModal.strings.join(",")}
                    onChange={(e) => updateTabStrings(e.target.value)}
                    placeholder={DEFAULT_TAB_TUNING}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Columns
                  </Label>
                  <Input
                    type="number"
                    min={8}
                    max={128}
                    value={tabModal.columns}
                    onChange={(e) => updateTabColumns(e.target.value)}
                  />
                </div>

                <div className="grid gap-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">
                    Quick actions
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setTabModal((m) =>
                          m
                            ? {
                                ...m,
                                grid: buildEmptyGrid(
                                  m.strings.length,
                                  m.columns,
                                ),
                              }
                            : m,
                        )
                      }
                    >
                      Clear grid
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-auto rounded-xl border border-border bg-background/70 shadow-inner">
                <table className="border-collapse select-none w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground text-xs font-medium">
                        String
                      </th>
                      {Array.from({ length: tabModal.columns }, (_, i) => (
                        <th
                          key={i}
                          className="px-1 text-[10px] text-muted-foreground"
                        >
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tabModal.strings.map((s, r) => (
                      <tr key={r}>
                        <td className="px-3 py-2 text-sm text-foreground font-medium">
                          {s}
                        </td>
                        {Array.from({ length: tabModal.columns }, (_, c) => (
                          <td key={c} className="p-0.5">
                            <button
                              onClick={() => toggleTabCell(r, c)}
                              className={`w-8 h-8 rounded-md border border-border text-sm font-semibold grid place-items-center transition-colors
                                ${
                                  tabModal.grid[r][c] !== null
                                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                                    : "bg-muted hover:bg-muted/70"
                                }
                              `}
                              title={`Row ${r + 1}, Col ${c + 1}`}
                            >
                              {tabModal.grid[r][c] ?? ""}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">
                  ASCII Preview
                </Label>
                <Textarea
                  value={gridToAscii(
                    tabModal.grid,
                    tabModal.strings,
                    tabModal.columns,
                  )}
                  readOnly
                  rows={6}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTabModal(null)}>
                Cancel
              </Button>
              <Button onClick={applyTabModal}>Apply</Button>
            </div>
          </div>
        </div>
      )}

      {progModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setProgModal(null)}
        >
          <div
            className="w-full max-w-2xl rounded border bg-background p-4 shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium">
              {progModal.mode === "insert"
                ? "Insert progression"
                : "Edit progression"}
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Key</Label>
                  <Input
                    value={progModal.key}
                    onChange={(e) =>
                      setProgModal((m) =>
                        m ? { ...m, key: e.target.value } : m,
                      )
                    }
                    placeholder={DEFAULT_PROG_KEY}
                  />
                </div>

                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Bars
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={progModal.bars}
                    onChange={(e) =>
                      setProgModal((m) =>
                        m ? { ...m, bars: e.target.value } : m,
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Chords / Roman Numerals
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={progModal.chordInput}
                    onChange={(e) =>
                      setProgModal((m) =>
                        m ? { ...m, chordInput: e.target.value } : m,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addProgChord();
                      }
                    }}
                    placeholder="I V vi IV or C G Am F"
                    className="min-w-[240px] flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={addProgChord}>
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {progModal.chords.length ? (
                    progModal.chords.map((ch, idx) => (
                      <span
                        key={`${ch}-${idx}`}
                        className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                      >
                        {ch}
                        <button
                          type="button"
                          className="rounded-full px-1 hover:bg-muted"
                          onClick={() => removeProgChord(idx)}
                          aria-label={`Remove ${ch}`}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Add chords to build the progression.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">
                  Preview
                </Label>
                <ProgressionBlockPreview
                  data={{
                    key: progModal.key,
                    bars: Number(progModal.bars) || DEFAULT_PROG_BARS,
                    chords: progModal.chords,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setProgModal(null)}>
                Cancel
              </Button>
              <Button onClick={applyProgModal}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
