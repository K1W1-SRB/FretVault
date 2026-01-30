"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { notesApi } from "@/lib/notes-api";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      if (typeof t === "string") return t.trim();
      if (t && typeof t === "object") {
        const obj = t as Record<string, unknown>;
        const nestedTag =
          obj.tag && typeof obj.tag === "object"
            ? (obj.tag as Record<string, unknown>)
            : null;

        const v =
          (typeof nestedTag?.name === "string" && (nestedTag.name as string)) ||
          (typeof obj.name === "string" && (obj.name as string)) ||
          (typeof obj.label === "string" && (obj.label as string)) ||
          (typeof obj.title === "string" && (obj.title as string)) ||
          (typeof obj.value === "string" && (obj.value as string));
        return typeof v === "string" ? v.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

export function NoteTopbar({
  activeSlug,
  onDeleted,
}: {
  activeSlug: string | null;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const { selectedWorkspaceId } = useSelectedWorkspace();

  const noteQuery = useQuery({
    queryKey: ["note", selectedWorkspaceId, activeSlug],
    queryFn: () =>
      notesApi.getBySlug(selectedWorkspaceId as string, activeSlug as string),
    enabled: !!selectedWorkspaceId && !!activeSlug,
  });

  const note = noteQuery.data;

  const [tagInput, setTagInput] = React.useState("");
  const [tagsDraft, setTagsDraft] = React.useState<string[]>([]);
  const [tagsDirty, setTagsDirty] = React.useState(false);

  React.useEffect(() => {
    if (!note) {
      setTagsDraft([]);
      setTagsDirty(false);
      return;
    }
    setTagsDraft(normalizeTags(note.tags));
    setTagsDirty(false);
  }, [note]);

  const saveTagsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkspaceId) return;
      if (!noteQuery.data) return;
      return notesApi.update(selectedWorkspaceId, noteQuery.data.id, {
        tags: tagsDraft,
      });
    },
    onSuccess: async (updated) => {
      if (!updated) return;
      qc.setQueryData(["note", selectedWorkspaceId, activeSlug], updated);
      await qc.invalidateQueries({ queryKey: ["notes", selectedWorkspaceId] });
      setTagsDirty(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkspaceId) return;
      if (!note) return;

      return notesApi.remove(selectedWorkspaceId, note.id);
    },
    onSuccess: async () => {
      if (!selectedWorkspaceId) return;

      qc.removeQueries({ queryKey: ["note", selectedWorkspaceId, activeSlug] });
      await qc.invalidateQueries({ queryKey: ["notes", selectedWorkspaceId] });

      onDeleted();
    },
  });

  function addTagFromInput() {
    const next = tagInput.trim();
    if (!next) return;
    if (tagsDraft.some((t) => t.toLowerCase() === next.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTagsDraft((prev) => [...prev, next]);
    setTagInput("");
    setTagsDirty(true);
  }

  function removeTag(tag: string) {
    setTagsDraft((prev) => prev.filter((t) => t !== tag));
    setTagsDirty(true);
  }

  return (
    <div className="flex items-center justify-between border-b px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-sm font-medium">Notes</div>
        <Separator orientation="vertical" className="h-5" />

        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">
            {activeSlug ? `Selected: ${activeSlug}` : "Select a note"}
          </div>

          {activeSlug && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {tagsDraft.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="rounded-full p-0.5 hover:bg-muted"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTagFromInput();
                  }
                }}
                placeholder="Add tag…"
                className="h-7 w-36 text-xs"
                disabled={!activeSlug || noteQuery.isLoading}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
                onClick={addTagFromInput}
                disabled={!tagInput.trim() || !activeSlug}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => saveTagsMutation.mutate()}
          disabled={!activeSlug || !tagsDirty || saveTagsMutation.isPending}
        >
          {saveTagsMutation.isPending ? "Saving…" : "Save tags"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={!activeSlug}
            >
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Duplicate (later)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
