// src/components/note-editor/note-editor.tsx
"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
import { Select } from "../ui/select";
import { OptionSelect } from "./ui/option-select";

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

    setMenu({
      x: e.clientX,
      y: e.clientY,
      pos,
      hasChordBlock: !!chord,
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

  const fretOptions = React.useMemo(() => {
    const nums = Array.from({ length: 25 }).map((_, i) => String(i)); // 0..24
    return ["x", ...nums];
  }, []);

  const fingerOptions = React.useMemo(() => ["x", "1", "2", "3", "4"], []);

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
            <Textarea
              ref={taRef as any}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDirty(true);
              }}
              onContextMenu={openContextMenu}
              className="h-full resize-none font-mono"
              placeholder="Write markdown... Right-click to insert/edit chord blocks."
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
    </div>
  );
}
