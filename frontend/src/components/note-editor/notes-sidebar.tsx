"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Search,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { notesApi } from "@/lib/notes-api";
import { NoteListItem } from "@/app/dashboard/notebook/types";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";
import { WorkspaceSwitcher } from "../workspace-switcher";

type GroupMode = "tag" | "flat";

function getAllTagLabels(note: NoteListItem): string[] {
  const rawTags = note.tags;
  if (!Array.isArray(rawTags)) return [];

  const labels = rawTags
    .map((t) => {
      if (typeof t === "string") return t.trim();
      if (t && typeof t === "object") {
        const obj = t as Record<string, unknown>;
        const nestedTag =
          obj.tag && typeof obj.tag === "object"
            ? (obj.tag as Record<string, unknown>)
            : null;

        const v =
          (typeof nestedTag?.name === "string" &&
            (nestedTag.name as string)) ||
          (typeof obj.name === "string" && (obj.name as string)) ||
          (typeof obj.label === "string" && (obj.label as string)) ||
          (typeof obj.title === "string" && (obj.title as string)) ||
          (typeof obj.value === "string" && (obj.value as string));
        return typeof v === "string" ? v.trim() : "";
      }
      return "";
    })
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of labels) {
    const k = l.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return out;
}

export function NotesSidebar({
  activeSlug,
  onSelectSlug,
}: {
  activeSlug: string | null;
  onSelectSlug: (slug: string) => void;
}) {
  const qc = useQueryClient();
  const [q, setQ] = React.useState("");
  const [groupMode, setGroupMode] = React.useState<GroupMode>("tag");
  const { selectedWorkspaceId } = useSelectedWorkspace();

  const [isCreating, setIsCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const titleInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!isCreating) return;
    const t = window.setTimeout(() => titleInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isCreating]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkspaceId) throw new Error("No workspace selected");
      const title = newTitle.trim();
      if (!title) throw new Error("Title is required");

      return notesApi.create(selectedWorkspaceId, {
        title,
        tags: [],
        contentMd: "",
      });
    },
    onSuccess: async (created) => {
      if (!selectedWorkspaceId) return;

      await qc.invalidateQueries({ queryKey: ["notes", selectedWorkspaceId] });

      if (created?.slug) onSelectSlug(created.slug);

      setNewTitle("");
      setIsCreating(false);
    },
  });

  const notesQuery = useQuery({
    queryKey: ["notes", selectedWorkspaceId, { q }],
    queryFn: () => notesApi.list(selectedWorkspaceId!, q.trim() || undefined),
    enabled: !!selectedWorkspaceId,
  });

  const notes = React.useMemo(
    () => (notesQuery.data ?? []) as NoteListItem[],
    [notesQuery.data],
  );

  const grouped = React.useMemo(() => {
    if (groupMode === "flat") {
      const sorted = [...notes].sort((a, b) =>
        (a.title || "Untitled").localeCompare(
          b.title || "Untitled",
          undefined,
          {
            sensitivity: "base",
          },
        ),
      );
      return new Map<string, NoteListItem[]>([["Notes", sorted]]);
    }

    const map = new Map<string, NoteListItem[]>();

    for (const n of notes) {
      const labels = getAllTagLabels(n);

      if (labels.length === 0) {
        if (!map.has("Untagged")) map.set("Untagged", []);
        map.get("Untagged")!.push(n);
        continue;
      }

      for (const tag of labels) {
        if (!map.has(tag)) map.set(tag, []);
        map.get(tag)!.push(n);
      }
    }

    const sortedEntries = [...map.entries()]
      .map(
        ([k, arr]) =>
          [
            k,
            arr
              .slice()
              .sort((a, b) =>
                (a.title || "Untitled").localeCompare(
                  b.title || "Untitled",
                  undefined,
                  { sensitivity: "base" },
                ),
              ),
          ] as const,
      )
      .sort(([a], [b]) => {
        // Keep Untagged at the bottom
        if (a === "Untagged" && b !== "Untagged") return 1;
        if (b === "Untagged" && a !== "Untagged") return -1;
        return a.localeCompare(b, undefined, { sensitivity: "base" });
      });

    return new Map(sortedEntries);
  }, [notes, groupMode]);

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setCollapsed((prev) => {
      let changed = false;
      const next: Record<string, boolean> = { ...prev };

      for (const key of grouped.keys()) {
        if (next[key] === undefined) {
          next[key] = false;
          changed = true;
        }
      }

      for (const key of Object.keys(next)) {
        if (!grouped.has(key)) {
          delete next[key];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [grouped]);

  function toggleGroup(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function submitCreate() {
    if (createMutation.isPending) return;
    createMutation.mutate();
  }

  function cancelCreate() {
    setIsCreating(false);
    setNewTitle("");
    createMutation.reset();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative z-10 space-y-2 p-3">
        <WorkspaceSwitcher />

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes..."
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2 p-2">
          {!isCreating ? (
            <button
              type="button"
              onClick={() => {
                setNewTitle("");
                createMutation.reset();
                setIsCreating(true);
              }}
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              )}
              disabled={!selectedWorkspaceId}
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-muted-foreground">New note…</span>
            </button>
          ) : (
            <div
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              )}
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <input
                ref={titleInputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New note…"
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                disabled={createMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCreate();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelCreate();
                  }
                }}
                onBlur={() => {
                  if (!newTitle.trim()) cancelCreate();
                }}
              />
            </div>
          )}

          <Button
            type="button"
            size="sm"
            variant={groupMode === "tag" ? "secondary" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => setGroupMode("tag")}
          >
            Folders
          </Button>
          <Button
            type="button"
            size="sm"
            variant={groupMode === "flat" ? "secondary" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => setGroupMode("flat")}
          >
            Flat
          </Button>
        </div>
      </div>

      <Separator />

      <ScrollArea className="relative z-0 flex-1">
        <div className="p-2">
          {notesQuery.isLoading && (
            <div className="space-y-2 p-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}

          {notesQuery.isError && (
            <div className="p-3 text-sm text-muted-foreground">
              Failed to load notes.
            </div>
          )}

          {!notesQuery.isLoading && notes.length === 0 && (
            <div className="p-2">
              {/* Empty state: still allow creating immediately */}
              {!isCreating ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewTitle("");
                    createMutation.reset();
                    setIsCreating(true);
                  }}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                  )}
                  disabled={!selectedWorkspaceId}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">
                    New note…
                  </span>
                </button>
              ) : (
                <div
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                  )}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <input
                    ref={titleInputRef}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="New note…"
                    className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                    disabled={createMutation.isPending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitCreate();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelCreate();
                      }
                    }}
                    onBlur={() => {
                      if (!newTitle.trim()) cancelCreate();
                    }}
                  />
                </div>
              )}

              {createMutation.isError && (
                <div className="px-2 pt-1 text-xs text-destructive">
                  {(createMutation.error as Error)?.message ||
                    "Failed to create note."}
                </div>
              )}

              <div className="px-2 pt-2 text-sm text-muted-foreground">
                No notes yet.
              </div>
            </div>
          )}

          {!notesQuery.isLoading &&
            notes.length > 0 &&
            [...grouped.entries()].map(([groupKey, items]) => {
              const isCollapsed = !!collapsed[groupKey];
              const showFolderUI = groupMode !== "flat";
              const isUntagged = groupKey === "Untagged";
              const showCreateRow = showFolderUI && isUntagged && !isCollapsed;

              return (
                <div key={groupKey} className="mb-1">
                  {showFolderUI && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupKey)}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                      )}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate font-medium">{groupKey}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {items.length}
                      </span>
                    </button>
                  )}

                  {(!showFolderUI || !isCollapsed) && (
                    <div className={cn(showFolderUI && "ml-5", "mt-1")}>
                      {/* Create row inside Untagged */}
                      {showCreateRow && (
                        <>
                          {createMutation.isError && (
                            <div className="px-2 pt-1 text-xs text-destructive">
                              {(createMutation.error as Error)?.message ||
                                "Failed to create note."}
                            </div>
                          )}
                        </>
                      )}

                      {/* Notes */}
                      {items.map((n) => {
                        const isActive = activeSlug === n.slug;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => onSelectSlug(n.slug)}
                            className={cn(
                              "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                              "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                              isActive && "bg-muted",
                            )}
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">
                              {n.title || "Untitled"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
