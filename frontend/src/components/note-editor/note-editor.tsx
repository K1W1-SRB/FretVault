"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { notesApi } from "@/lib/notes-api";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";

import { ChordModal } from "../note-editor/components/chord-modal";
import { NoteEditorContextMenu } from "../note-editor/components/note-editor-context-menu";
import { NoteEditorHeader } from "../note-editor/components/note-editor-header";
import { NoteEditorLinkSuggestions } from "../note-editor/components/note-editor-link-suggestions";
import { NoteEditorToolbar } from "../note-editor/components/note-editor-toolbar";
import { PracticeModal } from "../note-editor/components/practice-modal";
import { ProgressionModal } from "../note-editor/components/progression-modal";
import { TabModal } from "../note-editor/components/tab-modal";
import { createMdComponents } from "../note-editor/utils/markdown-components";
import {
  extractInternalLinkSlugs,
  remarkInternalLinks,
} from "../note-editor/utils/internal-links";
import {
  normalizeMd,
  replaceRange,
} from "../note-editor/utils/markdown";
import { findChordBlockAtPos } from "../note-editor/blocks/chords";
import { findTabBlockAtPos } from "../note-editor/blocks/tab";
import { findProgressionBlockAtPos } from "../note-editor/blocks/progression";
import { findPracticeBlockAtPos } from "../note-editor/blocks/practice";
import { fetchPracticePlans } from "../note-editor/blocks/practice/sync";
import { useLinkSuggestions } from "../note-editor/hooks/use-link-suggestions";
import { useBlockModals } from "../note-editor/hooks/use-block-modals";
import { usePracticeModal } from "../note-editor/hooks/use-practice-modal";
import type {
  ContextMenuState,
} from "../note-editor/types";

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

  const [menu, setMenu] = React.useState<ContextMenuState | null>(null);
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">(
    "write",
  );
  const closeContextMenu = React.useCallback(() => setMenu(null), []);

  const {
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
  } = useBlockModals({
    draft,
    setDraft,
    setDirty,
    taRef,
    closeContextMenu,
  });

  const notesListQuery = useQuery({
    queryKey: ["notes", selectedWorkspaceId, { q: "" }],
    queryFn: () => notesApi.list(selectedWorkspaceId as string, undefined),
    enabled: !!selectedWorkspaceId,
  });

  const practicePlansQuery = useQuery({
    queryKey: ["practice-plans"],
    queryFn: fetchPracticePlans,
  });

  const practicePlans = React.useMemo(
    () => practicePlansQuery.data ?? [],
    [practicePlansQuery.data],
  );

  const {
    practiceModal,
    setPracticeModal,
    practiceSyncing,
    practicePlanLoading,
    openInsertPractice,
    openEditPractice,
    handlePracticePlanSelect,
    applyPracticeModal,
  } = usePracticeModal({
    draft,
    setDraft,
    setDirty,
    taRef,
    practicePlans,
    noteTitle: noteQuery.data?.title,
    noteSlug: noteQuery.data?.slug,
    selectedWorkspaceId,
    qc,
    closeContextMenu,
  });

  const {
    linkContext,
    noteSuggestions,
    activeSuggestion,
    setActiveSuggestion,
    updateLinkState,
    applySuggestion,
  } = useLinkSuggestions({
    draft,
    setDraft,
    setDirty,
    taRef,
    notes: notesListQuery.data ?? [],
  });

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
    const practice = findPracticeBlockAtPos(draft, pos);

    setMenu({
      x: e.clientX,
      y: e.clientY,
      pos,
      hasChordBlock: !!chord,
      hasTabBlock: !!tab,
      hasProgBlock: !!prog,
      hasPracticeBlock: !!practice,
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
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "write" | "preview")}
          className="flex h-full flex-col overflow-hidden"
        >
          <NoteEditorHeader
            title={noteQuery.data.title || "Untitled"}
            dirty={dirty}
            isSaving={saveMutation.isPending}
            onSave={() => saveMutation.mutate()}
          />

          <TabsContent value="write" className="m-0 flex-1 overflow-hidden p-3">
            <div className="flex h-full flex-col">
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
                onInsertPracticeBlock={() =>
                  openInsertPractice(taRef.current?.selectionStart ?? 0)
                }
              />

              <div className="relative flex-1 overflow-hidden">
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
                      updateLinkState(draft, null);
                      return;
                    }
                  }}
                  onContextMenu={openContextMenu}
                  className="h-full resize-none overflow-auto font-mono field-sizing-fixed"
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
                onInsertPractice={openInsertPractice}
                onEditPractice={openEditPractice}
              />
            )}
          </TabsContent>

          <TabsContent
            value="preview"
            className="m-0 flex-1 overflow-auto p-4"
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

      {practiceModal && (
        <PracticeModal
          value={practiceModal}
          onChange={setPracticeModal}
          onClose={() => setPracticeModal(null)}
          onApply={applyPracticeModal}
          plans={practicePlans}
          isSyncing={practiceSyncing || practicePlanLoading}
          onSelectPlan={handlePracticePlanSelect}
        />
      )}
    </div>
  );
}
