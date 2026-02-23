import {
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";
import {
  Circle,
  Copy,
  Clock3,
  MoveHorizontal,
  Play,
  Repeat,
  Scissors,
  Square,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TransportTimeDisplayMode = "timecode" | "bars";
export type TransportCountInBars = 0 | 1 | 2;
export type TimelineClipTool = "move" | "cut" | "duplicate" | "delete";
export type TransportClipRegion = {
  id: string;
  trackId: string;
  trackName: string;
  startMs: number;
  durationMs: number;
  color: string;
};

type TransportTimelineProps = {
  tempo: number;
  onTempoChange: (value: number) => void;
  playbackState: "stopped" | "playing" | "paused";
  playbackLoading: boolean;
  playheadMs: number;
  durationMs: number;
  timeDisplayMode: TransportTimeDisplayMode;
  onTimeDisplayModeChange: (mode: TransportTimeDisplayMode) => void;
  metronomeEnabled: boolean;
  onMetronomeToggle: () => void;
  countInBars: TransportCountInBars;
  onCountInBarsChange: (bars: TransportCountInBars) => void;
  countInActive: boolean;
  loopEnabled: boolean;
  loopStartMs: number;
  loopEndMs: number;
  onLoopEnabledChange: (enabled: boolean) => void;
  onLoopStartMsChange: (value: number) => void;
  onLoopEndMsChange: (value: number) => void;
  isRecording: boolean;
  onRecordToggle: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (ms: number) => void;
  clipRegions: TransportClipRegion[];
  clipTool: TimelineClipTool;
  onClipToolChange: (tool: TimelineClipTool) => void;
  onClipMove: (clipId: string, startMs: number) => void;
  onClipCut: (clipId: string, cutAtMs: number) => void;
  onClipDuplicate: (clipId: string) => void;
  onClipDelete: (clipId: string) => void;
  clipInteractionDisabled?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTimecode(ms: number) {
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function formatBarsBeats(ms: number, tempo: number) {
  const beatMs = 60000 / Math.max(1, tempo);
  const barMs = beatMs * 4;
  const safeMs = Math.max(0, ms);
  const bar = Math.floor(safeMs / barMs) + 1;
  const beatInBar = Math.floor((safeMs % barMs) / beatMs) + 1;
  return `${bar}:${beatInBar}`;
}

function formatSeconds(ms: number, fractionDigits = 2) {
  return (ms / 1000).toFixed(fractionDigits);
}

export function TransportTimeline({
  tempo,
  onTempoChange,
  playbackState,
  playbackLoading,
  playheadMs,
  durationMs,
  timeDisplayMode,
  onTimeDisplayModeChange,
  metronomeEnabled,
  onMetronomeToggle,
  countInBars,
  onCountInBarsChange,
  countInActive,
  loopEnabled,
  loopStartMs,
  loopEndMs,
  onLoopEnabledChange,
  onLoopStartMsChange,
  onLoopEndMsChange,
  isRecording,
  onRecordToggle,
  onPlayPause,
  onStop,
  onSeek,
  clipRegions,
  clipTool,
  onClipToolChange,
  onClipMove,
  onClipCut,
  onClipDuplicate,
  onClipDelete,
  clipInteractionDisabled = false,
}: TransportTimelineProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<{
    clipId: string;
    pointerId: number;
    startClientX: number;
    startMs: number;
    clipDurationMs: number;
  } | null>(null);
  const [dragPreviewStartMs, setDragPreviewStartMs] = useState<number | null>(
    null,
  );

  const safeDuration = Math.max(1000, durationMs);
  const safePlayhead = clamp(playheadMs, 0, safeDuration);
  const beatMs = 60000 / Math.max(1, tempo);
  const totalBeats = Math.max(1, Math.ceil(safeDuration / beatMs));
  const beatStep = Math.max(1, Math.ceil(totalBeats / 320));

  const displayValue =
    timeDisplayMode === "timecode"
      ? formatTimecode(safePlayhead)
      : formatBarsBeats(safePlayhead, tempo);

  const loopStart = clamp(Math.min(loopStartMs, loopEndMs), 0, safeDuration);
  const loopEnd = clamp(
    Math.max(loopEndMs, loopStartMs + 100),
    100,
    safeDuration,
  );
  const loopLeftPct = (loopStart / safeDuration) * 100;
  const loopWidthPct = ((loopEnd - loopStart) / safeDuration) * 100;
  const playheadPct = (safePlayhead / safeDuration) * 100;
  const laneIds = Array.from(new Set(clipRegions.map((clip) => clip.trackId)));
  const laneByTrackId = new Map(
    laneIds.map((trackId, index) => [trackId, index]),
  );
  const laneCount = Math.max(1, laneIds.length);
  const laneHeight = 16;
  const timelineHeight = Math.max(76, laneCount * laneHeight + 28);

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    if (event.pointerId !== dragState.pointerId) return;
    const bounds = timelineRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;

    const deltaX = event.clientX - dragState.startClientX;
    const deltaMs = (deltaX / bounds.width) * safeDuration;
    const maxStartMs = Math.max(0, safeDuration - dragState.clipDurationMs);
    const nextStartMs = clamp(dragState.startMs + deltaMs, 0, maxStartMs);
    setDragPreviewStartMs(Math.round(nextStartMs));
  };

  const finishDrag = () => {
    if (!dragState) return;
    const nextStartMs =
      dragPreviewStartMs != null ? dragPreviewStartMs : dragState.startMs;
    const originalStartMs = Math.round(dragState.startMs);

    setDragState(null);
    setDragPreviewStartMs(null);

    if (Math.round(nextStartMs) === originalStartMs) return;
    onClipMove(dragState.clipId, Math.max(0, Math.round(nextStartMs)));
  };

  return (
    <div className="top-0 z-30 mb-5 space-y-3 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="lg"
          className="h-11 min-w-24 gap-2 text-base"
          onClick={onPlayPause}
          disabled={playbackLoading}
        >
          <Play className="h-5 w-5" />
          {playbackState === "playing"
            ? "Pause"
            : playbackState === "paused"
              ? "Resume"
              : "Play"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant={isRecording ? "destructive" : "outline"}
          className="h-11 min-w-24 gap-2 text-base"
          onClick={onRecordToggle}
          disabled={playbackLoading}
        >
          <Circle className="h-5 w-5" />
          {isRecording ? "Recording" : "Record"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-11 min-w-24 gap-2 text-base"
          onClick={onStop}
          disabled={playbackState === "stopped" && !countInActive}
        >
          <Square className="h-5 w-5" />
          Stop
        </Button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="rounded-md border border-border/70 bg-background px-3 py-2 font-mono text-sm">
            {displayValue}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-background p-1">
            <Button
              type="button"
              size="sm"
              variant={timeDisplayMode === "bars" ? "default" : "ghost"}
              className="h-7 px-2"
              onClick={() => onTimeDisplayModeChange("bars")}
            >
              Bars
            </Button>
            <Button
              type="button"
              size="sm"
              variant={timeDisplayMode === "timecode" ? "default" : "ghost"}
              className="h-7 px-2"
              onClick={() => onTimeDisplayModeChange("timecode")}
            >
              Time
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-background p-1">
            <Button
              type="button"
              size="sm"
              variant={clipTool === "move" ? "default" : "ghost"}
              className="h-7 gap-1 px-2"
              onClick={() => onClipToolChange("move")}
              disabled={clipInteractionDisabled}
            >
              <MoveHorizontal className="h-3.5 w-3.5" />
              Move
            </Button>
            <Button
              type="button"
              size="sm"
              variant={clipTool === "cut" ? "default" : "ghost"}
              className="h-7 gap-1 px-2"
              onClick={() => onClipToolChange("cut")}
              disabled={clipInteractionDisabled}
            >
              <Scissors className="h-3.5 w-3.5" />
              Cut
            </Button>
            <Button
              type="button"
              size="sm"
              variant={clipTool === "duplicate" ? "default" : "ghost"}
              className="h-7 gap-1 px-2"
              onClick={() => onClipToolChange("duplicate")}
              disabled={clipInteractionDisabled}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button
              type="button"
              size="sm"
              variant={clipTool === "delete" ? "default" : "ghost"}
              className="h-7 gap-1 px-2"
              onClick={() => onClipToolChange("delete")}
              disabled={clipInteractionDisabled}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[auto_auto_auto_auto_1fr]">
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2">
          <span className="text-xs uppercase text-muted-foreground">Tempo</span>
          <Input
            type="number"
            min={40}
            max={260}
            value={tempo}
            onChange={(event) => onTempoChange(Number(event.target.value || 0))}
            className="h-8 w-20 text-sm"
          />
          <span className="text-xs text-muted-foreground">BPM</span>
        </div>

        <Button
          type="button"
          variant={metronomeEnabled ? "default" : "outline"}
          className="h-10 gap-2"
          onClick={onMetronomeToggle}
        >
          <Clock3 className="h-4 w-4" />
          Metronome
        </Button>

        <div className="flex items-center gap-1 rounded-md border border-border/70 bg-background p-1">
          {[0, 1, 2].map((bars) => (
            <Button
              key={`count-in-${bars}`}
              type="button"
              size="sm"
              variant={countInBars === bars ? "default" : "ghost"}
              className="h-8 px-2"
              onClick={() => onCountInBarsChange(bars as TransportCountInBars)}
            >
              {bars === 0 ? "No Count" : `${bars} Bar`}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant={loopEnabled ? "default" : "outline"}
          className="h-10 gap-2"
          onClick={() => onLoopEnabledChange(!loopEnabled)}
        >
          <Repeat className="h-4 w-4" />
          Loop
        </Button>

        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2">
          <span className="text-xs uppercase text-muted-foreground">Range</span>
          <Input
            type="number"
            min={0}
            max={Math.max(0, (loopEnd - 100) / 1000)}
            step={0.001}
            value={Math.max(0, loopStart / 1000)}
            onChange={(event) =>
              onLoopStartMsChange(
                Math.round(Number(event.target.value || 0) * 1000),
              )
            }
            className="h-8 w-24 text-xs"
            disabled={!loopEnabled}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="number"
            min={Math.max(0.1, (loopStart + 100) / 1000)}
            max={safeDuration / 1000}
            step={0.001}
            value={loopEnd / 1000}
            onChange={(event) =>
              onLoopEndMsChange(
                Math.round(Number(event.target.value || 0) * 1000),
              )
            }
            className="h-8 w-24 text-xs"
            disabled={!loopEnabled}
          />
          <span className="text-xs text-muted-foreground">s</span>
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative cursor-pointer overflow-hidden rounded-md border border-border/70 bg-muted/40"
        style={{ height: `${timelineHeight}px` }}
        onPointerDown={(event) => {
          if (dragState) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = clamp(
            (event.clientX - bounds.left) / bounds.width,
            0,
            1,
          );
          onSeek(Math.round(ratio * safeDuration));
        }}
      >
        {loopEnabled && (
          <div
            className="absolute inset-y-0 bg-emerald-500/15"
            style={{ left: `${loopLeftPct}%`, width: `${loopWidthPct}%` }}
          />
        )}

        {Array.from(
          { length: Math.floor(totalBeats / beatStep) + 1 },
          (_, index) => {
            const beatIndex = index * beatStep;
            const leftPct = (beatIndex / totalBeats) * 100;
            const isBar = beatIndex % 4 === 0;
            return (
              <div
                key={`beat-mark-${beatIndex}`}
                className="absolute inset-y-0"
                style={{ left: `${leftPct}%` }}
              >
                <div
                  className={
                    isBar
                      ? "h-full w-px bg-foreground/20"
                      : "h-full w-px bg-foreground/10"
                  }
                />
                {isBar && (
                  <span className="absolute bottom-0 mt-0.5 block -translate-x-1/2 text-[10px] text-muted-foreground">
                    {Math.floor(beatIndex / 4) + 1}
                  </span>
                )}
              </div>
            );
          },
        )}

        {clipRegions.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-1 top-1 bottom-4">
            {clipRegions.map((clip) => {
              const laneIndex = laneByTrackId.get(clip.trackId) ?? 0;
              const isDragging = dragState?.clipId === clip.id;
              const startMs =
                isDragging && dragPreviewStartMs != null
                  ? dragPreviewStartMs
                  : clip.startMs;
              const leftPct = (Math.max(0, startMs) / safeDuration) * 100;
              const widthPct =
                (Math.max(1, clip.durationMs) / safeDuration) * 100;
              return (
                <div
                  key={`transport-clip-${clip.id}`}
                  className="pointer-events-auto absolute h-3.5 overflow-hidden rounded-sm border border-background/60"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 0.3)}%`,
                    minWidth: "2px",
                    top: `${laneIndex * laneHeight}px`,
                    backgroundColor: clip.color,
                    opacity: isDragging ? 0.9 : 1,
                  }}
                  title={`${clip.trackName} - ${formatSeconds(clip.startMs)}s / ${formatSeconds(clip.durationMs)}s`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    if (clipInteractionDisabled) return;
                    if (clipTool !== "move") return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragState({
                      clipId: clip.id,
                      pointerId: event.pointerId,
                      startClientX: event.clientX,
                      startMs: clip.startMs,
                      clipDurationMs: clip.durationMs,
                    });
                    setDragPreviewStartMs(clip.startMs);
                  }}
                  onPointerMove={(event) => {
                    if (clipTool !== "move") return;
                    handleDragMove(event);
                  }}
                  onPointerUp={(event) => {
                    if (dragState?.pointerId !== event.pointerId) return;
                    event.stopPropagation();
                    try {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    } catch {
                      // ignore release errors
                    }
                    finishDrag();
                  }}
                  onPointerCancel={(event) => {
                    if (dragState?.pointerId !== event.pointerId) return;
                    event.stopPropagation();
                    setDragState(null);
                    setDragPreviewStartMs(null);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (clipInteractionDisabled) return;
                    if (clipTool === "cut") {
                      const bounds = event.currentTarget.getBoundingClientRect();
                      if (bounds.width <= 0) return;
                      const ratio = clamp(
                        (event.clientX - bounds.left) / bounds.width,
                        0,
                        1,
                      );
                      const cutAtMs = Math.round(
                        clip.startMs + ratio * clip.durationMs,
                      );
                      onClipCut(clip.id, cutAtMs);
                      return;
                    }
                    if (clipTool === "duplicate") {
                      onClipDuplicate(clip.id);
                      return;
                    }
                    if (clipTool === "delete") {
                      onClipDelete(clip.id);
                    }
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            No clips on timeline yet.
          </div>
        )}

        <div
          className="absolute inset-y-0 w-[2px] bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      {countInActive && (
        <div className="text-xs text-amber-500">
          Count-in active: waiting {countInBars} bar
          {countInBars === 1 ? "" : "s"} before playback.
        </div>
      )}
    </div>
  );
}
