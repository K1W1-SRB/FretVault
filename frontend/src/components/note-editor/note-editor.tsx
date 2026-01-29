"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { notesApi } from "@/lib/notes-api";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";

import { ChordModal } from "../note-editor/components/chord-modal";
import { NoteEditorContextMenu } from "../note-editor/components/note-editor-context-menu";
import { NoteEditorHeader } from "../note-editor/components/note-editor-header";
import { NoteEditorLinkSuggestions } from "../note-editor/components/note-editor-link-suggestions";
import { NoteEditorToolbar } from "../note-editor/components/note-editor-toolbar";
import { ProgressionModal } from "../note-editor/components/progression-modal";
import { TabModal } from "../note-editor/components/tab-modal";
import { createMdComponents } from "../note-editor/utils/markdown-components";
import {
  extractInternalLinkSlugs,
  remarkInternalLinks,
} from "../note-editor/utils/internal-links";
import {
  normalizeMd,
  insertAtPos,
  replaceRange,
} from "../note-editor/utils/markdown";
import {
  ensureSix,
  findChordBlockAtPos,
  serializeChordBlock,
} from "../note-editor/blocks/chords";
import type { FingerValue, StringValue } from "../note-editor/blocks/chords";
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
  serializeProgressionBlock,
} from "../note-editor/blocks/progression";
import {
  asciiToGrid,
  buildEmptyGrid,
  gridToAscii,
  parseTuningString,
} from "../note-editor/utils/tab-grid";
import type {
  ChordModalState,
  ContextMenuState,
  LinkContext,
  ProgressionModalState,
  TabModalState,
} from "../note-editor/types";

function getLinkContext(value: string, cursor: number): LinkContext | null {
  if (!value) return null;
  const before = value.slice(0, cursor);
  const lastOpen = before.lastIndexOf("[[");
  if (lastOpen === -1) return null;

  const sinceOpen = before.slice(lastOpen + 2);
  const closeIndex = sinceOpen.indexOf("]]");
  if (closeIndex !== -1) return null;

  const aliasIdx = sinceOpen.indexOf("|");
  const slugPart = aliasIdx === -1 ? sinceOpen : sinceOpen.slice(0, aliasIdx);
  if (!/^[a-z0-9_-]*$/.test(slugPart)) return null;

  return {
    replaceStart: lastOpen + 2,
    replaceEnd: lastOpen + 2 + slugPart.length,
    query: slugPart,
  };
}

export function NoteEditor({
  activeSlug,
  onNavigateSlug,
}: {
  activeSlug: string | null;
  onNavigateSlug?: (slug: string) => void;
}) {
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
  const normalizedDraft = React.useMemo(() => normalizeMd(draft), [draft]);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);

  const taRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [linkContext, setLinkContext] = React.useState<LinkContext | null>(
    null,
  );
  const [activeSuggestion, setActiveSuggestion] = React.useState(0);

  const [menu, setMenu] = React.useState<ContextMenuState | null>(null);

  const [chordModal, setChordModal] = React.useState<ChordModalState | null>(
    null,
  );

  const [tabModal, setTabModal] = React.useState<TabModalState | null>(null);

  const [progModal, setProgModal] =
    React.useState<ProgressionModalState | null>(null);

  const notesListQuery = useQuery({
    queryKey: ["notes", selectedWorkspaceId, { q: "" }],
    queryFn: () => notesApi.list(selectedWorkspaceId as string, undefined),
    enabled: !!selectedWorkspaceId,
  });

  const noteSuggestions = React.useMemo(() => {
    const notes = notesListQuery.data ?? [];
    const query = linkContext?.query ?? "";
    if (!linkContext) return [];
    if (!notes.length) return [];
    const q = query.toLowerCase();
    const filtered = notes
      .filter((n) => n.slug)
      .filter((n) => !q || n.slug.toLowerCase().includes(q))
      .slice(0, 6);
    return filtered;
  }, [notesListQuery.data, linkContext]);

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

  const createNoteMutation = useMutation({
    mutationFn: async (slug: string) => {
      if (!selectedWorkspaceId) throw new Error("No workspace selected");
      const title = slug.trim();
      if (!title) throw new Error("Invalid slug");
      return notesApi.create(selectedWorkspaceId, {
        title,

        tags: [],
        contentMd: "",
      });
    },
    onSuccess: async (created) => {
      if (!selectedWorkspaceId || !created?.slug) return;
      await qc.invalidateQueries({ queryKey: ["notes", selectedWorkspaceId] });
      onNavigateSlug?.(created.slug);
    },
  });

  const internalLinkSlugs = React.useMemo(
    () => extractInternalLinkSlugs(normalizedDraft),
    [normalizedDraft],
  );

  const resolveLinksQuery = useQuery({
    queryKey: ["note-link-resolve", selectedWorkspaceId, internalLinkSlugs],
    queryFn: () =>
      notesApi.resolveLinks(selectedWorkspaceId as string, internalLinkSlugs),
    enabled: !!selectedWorkspaceId && internalLinkSlugs.length > 0,
  });

  const internalLinks = resolveLinksQuery.data?.results;

  const mdComponents = React.useMemo(
    () =>
      createMdComponents({
        onInternalNavigate: (slug) => {
          if (resolveLinksQuery.isSuccess && internalLinks?.[slug] === null) {
            if (!createNoteMutation.isPending) {
              createNoteMutation.mutate(slug);
            }
            return;
          }
          onNavigateSlug?.(slug);
        },
        internalLinks,
      }),
    [
      internalLinks,
      onNavigateSlug,
      resolveLinksQuery.isSuccess,
      createNoteMutation.isPending,
      createNoteMutation.mutate,
    ],
  );

  React.useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!rootRef.current || !rootRef.current.contains(target)) return;

      const anchor = target.closest("a");
      const text = target.textContent?.slice(0, 120) ?? "";
      const rawHref = anchor?.getAttribute("href") ?? "";

      if (!anchor) return;

      const isInternal = rawHref.startsWith("internal:");
      const isSlug =
        /^[a-z0-9_-]+$/.test(rawHref) &&
        !rawHref.startsWith("http://") &&
        !rawHref.startsWith("https://") &&
        !rawHref.startsWith("mailto:") &&
        !rawHref.startsWith("#") &&
        !rawHref.startsWith("/");

      const textSlug = !rawHref && /^[a-z0-9_-]+$/.test(text) ? text : null;

      if (!isInternal && !isSlug && !textSlug) return;

      event.preventDefault();
      event.stopPropagation();
      const slug = isInternal
        ? rawHref.slice("internal:".length)
        : isSlug
          ? rawHref
          : textSlug!;
      if (resolveLinksQuery.isSuccess && internalLinks?.[slug] === null) {
        if (!createNoteMutation.isPending) {
          createNoteMutation.mutate(slug);
        }
        return;
      }
      onNavigateSlug?.(slug);
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [
    onNavigateSlug,
    resolveLinksQuery.isSuccess,
    internalLinks,
    createNoteMutation.isPending,
    createNoteMutation.mutate,
  ]);

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
    handler: (args: { start: number; end: number; value: string }) => {
      text: string;
      selectStart: number;
      selectEnd: number;
    },
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

  function updateLinkState(value: string, cursor: number | null) {
    if (cursor === null) {
      setLinkContext(null);
      return;
    }
    const ctx = getLinkContext(value, cursor);
    setLinkContext(ctx);
    setActiveSuggestion(0);
  }

  function applySuggestion(slug: string) {
    if (!linkContext) return;
    const text = draft;
    const next = replaceRange(
      text,
      linkContext.replaceStart,
      linkContext.replaceEnd,
      slug,
    );
    setDraft(next);
    setDirty(true);
    const nextPos = linkContext.replaceStart + slug.length;
    requestAnimationFrame(() => {
      if (!taRef.current) return;
      taRef.current.focus();
      taRef.current.selectionStart = nextPos;
      taRef.current.selectionEnd = nextPos;
      updateLinkState(next, nextPos);
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
    <div
      className="flex h-full flex-col"
      onClick={closeContextMenu}
      ref={rootRef}
    >
      <NoteEditorHeader
        title={noteQuery.data.title || "Untitled"}
        dirty={dirty}
        isSaving={saveMutation.isPending}
        onSave={() => saveMutation.mutate()}
      />

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="write" className="h-full">
          <div className="border-b px-3 py-2">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="write" className="m-0 h-[calc(100%-48px)] p-3">
            <NoteEditorToolbar
              onPrefixLines={prefixLines}
              onWrapSelection={wrapSelection}
              onInsertCodeBlock={insertCodeBlock}
              onInsertLink={insertLink}
              onInsertChordBlock={() =>
                openInsertChord(taRef.current?.selectionStart ?? 0)
              }
              onInsertTabBlock={() =>
                openInsertTab(taRef.current?.selectionStart ?? 0)
              }
              onInsertProgressionBlock={insertProgressionBlock}
            />

            <div className="relative h-full">
              <Textarea
                ref={taRef as any}
                value={draft}
                onChange={(e) => {
                  const next = e.target.value;
                  setDraft(next);
                  setDirty(true);
                  updateLinkState(next, e.target.selectionStart);
                }}
                onClick={(e) =>
                  updateLinkState(
                    (e.target as HTMLTextAreaElement).value,
                    (e.target as HTMLTextAreaElement).selectionStart,
                  )
                }
                onKeyUp={(e) =>
                  updateLinkState(
                    (e.target as HTMLTextAreaElement).value,
                    (e.target as HTMLTextAreaElement).selectionStart,
                  )
                }
                onKeyDown={(e) => {
                  if (!linkContext || noteSuggestions.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveSuggestion((prev) =>
                      Math.min(prev + 1, noteSuggestions.length - 1),
                    );
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveSuggestion((prev) => Math.max(prev - 1, 0));
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    const chosen = noteSuggestions[activeSuggestion];
                    if (chosen?.slug) applySuggestion(chosen.slug);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setLinkContext(null);
                    return;
                  }
                }}
                onContextMenu={openContextMenu}
                className="h-full resize-none font-mono"
                placeholder="Write markdown... Right-click to insert/edit chord or tab blocks."
              />

              {linkContext && noteSuggestions.length > 0 && (
                <NoteEditorLinkSuggestions
                  suggestions={noteSuggestions}
                  activeIndex={activeSuggestion}
                  onSelect={applySuggestion}
                />
              )}
            </div>

            {menu && (
              <NoteEditorContextMenu
                menu={menu}
                onInsertChord={openInsertChord}
                onEditChord={openEditChord}
                onInsertTab={openInsertTab}
                onEditTab={openEditTab}
                onInsertProgression={openInsertProgression}
                onEditProgression={openEditProgression}
              />
            )}
          </TabsContent>

          <TabsContent
            value="preview"
            className="m-0 h-[calc(100%-48px)] overflow-auto p-4"
          >
            <div className="prose max-w-none" ref={previewRef}>
              <ReactMarkdown
                components={mdComponents}
                remarkPlugins={[remarkInternalLinks]}
              >
                {normalizedDraft || "_Nothing to preview._"}
              </ReactMarkdown>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {chordModal && (
        <ChordModal
          value={chordModal}
          onChange={setChordModal}
          onClose={() => setChordModal(null)}
          onApply={applyChordModal}
        />
      )}

      {tabModal && (
        <TabModal
          value={tabModal}
          onChange={setTabModal}
          onClose={() => setTabModal(null)}
          onApply={applyTabModal}
        />
      )}

      {progModal && (
        <ProgressionModal
          value={progModal}
          onChange={setProgModal}
          onClose={() => setProgModal(null)}
          onApply={applyProgModal}
        />
      )}
    </div>
  );
}
