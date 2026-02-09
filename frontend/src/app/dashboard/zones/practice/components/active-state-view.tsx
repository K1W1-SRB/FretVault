"use client";

import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Loader2, Square } from "lucide-react";
import type { Components } from "react-markdown";
import type { NoteContent, SongContent, SongTab, TabRevision } from "../types";

type ActiveStateViewProps = {
  loadingLinked: boolean;
  linkedNote: NoteContent | null;
  linkedSong: SongContent | null;
  linkedTabs: SongTab[];
  selectedTabId: number | null;
  onSelectTabId: (id: number) => void;
  selectedTab: SongTab | null;
  selectedTabAscii: string | null;
  selectedTabRevision: TabRevision | null;
  loadingTab: boolean;
  onOpenTab: (tabId: number) => void;
  mdComponents: Components;
  elapsedLabel: string;
  targetTitle: string;
  metricLabel: string;
  onEnd: () => void;
  canEnd: boolean;
};

export function ActiveStateView({
  loadingLinked,
  linkedNote,
  linkedSong,
  linkedTabs,
  selectedTabId,
  onSelectTabId,
  selectedTab,
  selectedTabAscii,
  selectedTabRevision,
  loadingTab,
  onOpenTab,
  mdComponents,
  elapsedLabel,
  targetTitle,
  metricLabel,
  onEnd,
  canEnd,
}: ActiveStateViewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="min-h-[50vh] rounded-xl border bg-background/60 p-4">
        {loadingLinked ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading linked content...
          </div>
        ) : linkedNote ? (
          <div className="prose max-w-none">
            <h2 className="mb-2 text-2xl font-semibold">{linkedNote.title}</h2>
            <ReactMarkdown components={mdComponents}>
              {linkedNote.contentMd || "_No note content yet._"}
            </ReactMarkdown>
          </div>
        ) : linkedSong ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">{linkedSong.title}</h2>
              <p className="text-sm text-muted-foreground">
                {linkedSong.artist ?? "Unknown artist"}{" "}
                {linkedSong.key ? `- ${linkedSong.key}` : ""}{" "}
                {linkedSong.tempo ? `- ${linkedSong.tempo} BPM` : ""}
              </p>
            </div>

            <div className="rounded-xl border border-dashed bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Pick a tab to practice</p>
              {linkedTabs.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {linkedTabs.map((tab) => {
                    const isSelected = tab.id === selectedTabId;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onSelectTabId(tab.id)}
                        className={`rounded-lg border p-3 text-left transition ${
                          isSelected
                            ? "border-foreground/70 bg-foreground/5 shadow-sm"
                            : "border-border/60 hover:border-foreground/40"
                        }`}
                      >
                        <div className="text-sm font-medium">{tab.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {tab.tuning} {tab.tempo ? `- ${tab.tempo} BPM` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">
                  No tabs saved for this song yet.
                </div>
              )}
            </div>

            {selectedTab ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{selectedTab.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedTab.tuning}{" "}
                      {selectedTab.tempo ? `- ${selectedTab.tempo} BPM` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpenTab(selectedTab.id)}
                  >
                    Open tab
                  </Button>
                </div>

                {loadingTab ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading tab...
                  </div>
                ) : selectedTabAscii ? (
                  <pre className="whitespace-pre rounded-xl border border-border bg-black/80 text-green-300 p-4 overflow-auto">
                    {selectedTabAscii}
                  </pre>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {selectedTabRevision
                      ? "No ASCII available for this revision."
                      : "No tab revisions yet."}
                  </div>
                )}
              </div>
            ) : linkedTabs.length ? (
              <div className="text-sm text-muted-foreground">
                Select a tab to load it here.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No linked note or song for this practice item.
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-4">
        <div className="w-full rounded-xl border bg-background/60 p-4 text-right">
          <div className="text-4xl font-semibold tracking-tight">{elapsedLabel}</div>
          <div className="mt-2 text-sm font-medium">{targetTitle}</div>
          <div className="text-xs text-muted-foreground">Metric: {metricLabel}</div>
        </div>
        <Button
          size="lg"
          variant="destructive"
          onClick={onEnd}
          disabled={!canEnd}
          className="h-12 px-8 text-base"
        >
          <Square className="mr-2 h-4 w-4" />
          End Session
        </Button>
      </div>
    </div>
  );
}
