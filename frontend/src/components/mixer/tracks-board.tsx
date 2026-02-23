import {
  Headphones,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type PerformanceTrack } from "@/lib/performance-api";
import { cn } from "@/lib/utils";

import { type Channel } from "./types";

const inputOptions = ["All Ins", "In 1", "In 2", "In 3", "In 4"];
const outputOptions = ["Main", "Cue A", "Cue B"];

function meterHeight(level: number) {
  const clamped = Math.min(0, Math.max(-48, level));
  return ((clamped + 48) / 48) * 100;
}

function extractWaveformPeaks(raw: unknown): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return raw.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.peaks)) {
      return obj.peaks.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
    if (Array.isArray(obj.data)) {
      return obj.data.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
    if (Array.isArray(obj.channels)) {
      const channel = obj.channels.find((c) => Array.isArray(c)) as
        | number[]
        | undefined;
      if (channel?.length) {
        return channel.map((v) => Number(v)).filter((v) => Number.isFinite(v));
      }
    }
    if (Array.isArray(obj.left)) {
      return obj.left.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
  }
  return null;
}

function buildWaveformBars(args: {
  peaks: number[];
  barCount?: number;
  startRatio?: number;
  endRatio?: number;
}) {
  const { peaks, barCount = 48 } = args;
  const startRatio = Math.max(0, Math.min(1, args.startRatio ?? 0));
  const endRatio = Math.max(startRatio, Math.min(1, args.endRatio ?? 1));
  const startIndex = Math.floor(startRatio * peaks.length);
  const endIndex = Math.max(startIndex + 1, Math.ceil(endRatio * peaks.length));
  const slice = peaks.slice(startIndex, endIndex);
  if (slice.length === 0) return [];

  const step = slice.length / barCount;
  const values: number[] = [];
  for (let i = 0; i < barCount; i += 1) {
    const from = Math.floor(i * step);
    const to = Math.max(from + 1, Math.floor((i + 1) * step));
    const chunk = slice.slice(from, to);
    const max = chunk.reduce((acc, v) => Math.max(acc, Math.abs(v)), 0);
    values.push(max);
  }

  const maxValue = Math.max(...values, 1);
  return values.map((v) => Math.min(1, v / maxValue));
}

type ToggleKey = "armed" | "monitor" | "muted" | "solo";
type ChannelKey = "gain" | "pan";

type TrackChannelCardProps = {
  channel: Channel;
  track: PerformanceTrack | undefined;
  meter: number;
  playbackLoading: boolean;
  selectedWorkspaceId: string | null;
  deleteClipPending: boolean;
  onOpenCreateClip: (trackId: string) => void;
  onOpenEditTrack: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onToggleChannel: (id: string, key: ToggleKey) => void;
  onUpdateChannel: (id: string, key: ChannelKey, value: number) => void;
  onPlayTrack: (trackId: string) => void;
  onOpenEditClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
};

function TrackChannelCard({
  channel,
  track,
  meter,
  playbackLoading,
  selectedWorkspaceId,
  deleteClipPending,
  onOpenCreateClip,
  onOpenEditTrack,
  onDeleteTrack,
  onToggleChannel,
  onUpdateChannel,
  onPlayTrack,
  onOpenEditClip,
  onDeleteClip,
}: TrackChannelCardProps) {
  const clips = track?.clips ?? [];
  const trackDurationMs =
    clips.length === 0
      ? 0
      : Math.max(...clips.map((clip) => clip.startMs + clip.durationMs));

  return (
    <div className="flex flex-col rounded-lg border border-border bg-background/70 shadow-sm">
      <div className={cn("h-2 w-full rounded-t-lg", channel.accent)} />
      <div className="flex-1 space-y-3 p-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-wide text-foreground">
              {channel.label}
            </span>
            <Badge variant="outline" className="uppercase">
              {channel.type}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => onOpenCreateClip(channel.id)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add clip
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onOpenEditTrack(channel.id)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDeleteTrack(channel.id)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-1">
            <p className="text-[10px] uppercase text-muted-foreground">Input</p>
            <p className="text-xs font-medium">
              {inputOptions[channel.id.length % inputOptions.length]}
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-1">
            <p className="text-[10px] uppercase text-muted-foreground">
              Output
            </p>
            <p className="text-xs font-medium">
              {outputOptions[channel.id.length % outputOptions.length]}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onToggleChannel(channel.id, "armed")}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-semibold uppercase transition",
              channel.armed
                ? "border-rose-500/70 bg-rose-500/15 text-rose-500"
                : "border-border/60 text-muted-foreground",
            )}
          >
            Arm
          </button>
          <button
            type="button"
            onClick={() => onToggleChannel(channel.id, "monitor")}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-semibold uppercase transition",
              channel.monitor
                ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-500"
                : "border-border/60 text-muted-foreground",
            )}
          >
            Mon
          </button>
          <button
            type="button"
            onClick={() => onToggleChannel(channel.id, "muted")}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-semibold uppercase transition",
              channel.muted
                ? "border-amber-500/70 bg-amber-500/10 text-amber-500"
                : "border-border/60 text-muted-foreground",
            )}
          >
            Mute
          </button>
          <button
            type="button"
            onClick={() => onToggleChannel(channel.id, "solo")}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-semibold uppercase transition",
              channel.solo
                ? "border-sky-500/70 bg-sky-500/10 text-sky-500"
                : "border-border/60 text-muted-foreground",
            )}
          >
            Solo
          </button>
        </div>

        <div className="space-y-2"></div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
            <span>Gain</span>
            <span className="text-xs font-semibold text-foreground">
              {channel.gain} dB
            </span>
          </div>
          <input
            type="range"
            min={-60}
            max={12}
            value={channel.gain}
            onChange={(event) =>
              onUpdateChannel(
                channel.id,
                "gain",
                Number(event.target.value || 0),
              )
            }
            className="h-2 w-full cursor-pointer accent-primary"
          />
          <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
            <span>Pan</span>
            <span className="text-xs font-semibold text-foreground">
              {channel.pan.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={channel.pan}
            onChange={(event) =>
              onUpdateChannel(
                channel.id,
                "pan",
                Number(event.target.value || 0),
              )
            }
            className="h-2 w-full cursor-pointer accent-primary"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
            <span>Clips</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() => onPlayTrack(channel.id)}
                disabled={
                  playbackLoading || !selectedWorkspaceId || clips.length === 0
                }
              >
                <Play className="h-3.5 w-3.5" />
                Play
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() => onOpenCreateClip(channel.id)}
                disabled={!selectedWorkspaceId}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
          {clips.length === 0 ? (
            <div className="text-[11px] text-muted-foreground">
              No clips yet.
            </div>
          ) : (
            <div className="space-y-2">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="space-y-2 rounded-md border border-border/60 bg-muted/40 px-2 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-medium text-foreground">
                        {Math.round(clip.durationMs / 100) / 10}s @{" "}
                        {Math.round(clip.startMs / 100) / 10}s
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {clip.asset?.contentType ?? "audio"} -{" "}
                        {clip.asset?.status ?? "asset"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onOpenEditClip(clip.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => onDeleteClip(clip.id)}
                        disabled={deleteClipPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(() => {
                    const peaks = extractWaveformPeaks(
                      clip.asset?.waveformPeaks,
                    );
                    if (!peaks || peaks.length === 0) {
                      return null;
                    }
                    const assetDuration = clip.asset?.durationMs ?? null;
                    const clipStart =
                      assetDuration && assetDuration > 0
                        ? (clip.offsetInAssetMs ?? 0) / assetDuration
                        : 0;
                    const clipEnd =
                      assetDuration && assetDuration > 0
                        ? Math.min(
                            assetDuration,
                            (clip.offsetInAssetMs ?? 0) + clip.durationMs,
                          ) / assetDuration
                        : 1;
                    const bars = buildWaveformBars({
                      peaks,
                      barCount: 48,
                      startRatio: clipStart,
                      endRatio: clipEnd,
                    });
                    if (bars.length === 0) return null;
                    return (
                      <div className="flex items-end gap-[2px] rounded-md border border-border/40 bg-background/70 px-2 py-2">
                        {bars.map((v, index) => (
                          <span
                            key={`${clip.id}-bar-${index}`}
                            className="w-[2px] rounded bg-emerald-400/80"
                            style={{
                              height: `${Math.max(12, Math.round(v * 48))}px`,
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          Out
        </div>
        <div className="relative h-12 w-2 overflow-hidden rounded-full bg-muted/60">
          <div
            className="absolute bottom-0 w-full rounded-full bg-emerald-500"
            style={{ height: `${meter}%` }}
          />
        </div>
      </div>
    </div>
  );
}

type TracksBoardProps = {
  channels: Channel[];
  tracksById: Map<string, PerformanceTrack>;
  timelineLoading: boolean;
  timelineError: boolean;
  actionError: string | null;
  selectedWorkspaceId: string | null;
  hasProject: boolean;
  playbackLoading: boolean;
  deleteClipPending: boolean;
  onOpenCreateTrack: () => void;
  onOpenCreateClip: (trackId: string) => void;
  onOpenEditTrack: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onToggleChannel: (id: string, key: ToggleKey) => void;
  onUpdateChannel: (id: string, key: ChannelKey, value: number) => void;
  onPlayTrack: (trackId: string) => void;
  onOpenEditClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
};

export function TracksBoard({
  channels,
  tracksById,
  timelineLoading,
  timelineError,
  actionError,
  selectedWorkspaceId,
  hasProject,
  playbackLoading,
  deleteClipPending,
  onOpenCreateTrack,
  onOpenCreateClip,
  onOpenEditTrack,
  onDeleteTrack,
  onToggleChannel,
  onUpdateChannel,
  onPlayTrack,
  onOpenEditClip,
  onDeleteClip,
}: TracksBoardProps) {
  return (
    <Card className="border bg-background/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Tracks</CardTitle>
          <p className="text-xs text-muted-foreground">
            {channels.length} track{channels.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Headphones className="h-3.5 w-3.5" />
            Monitoring Live
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={onOpenCreateTrack}
            disabled={!selectedWorkspaceId || !hasProject}
          >
            <Plus className="h-4 w-4" />
            Add Track
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {timelineLoading && (
          <div className="py-6 text-sm text-muted-foreground">
            Loading project timeline...
          </div>
        )}
        {timelineError && (
          <div className="py-6 text-sm text-destructive">
            Failed to load timeline.
          </div>
        )}
        {actionError && (
          <div className="py-2 text-sm text-destructive">{actionError}</div>
        )}
        {!timelineLoading && !timelineError && channels.length === 0 && (
          <div className="py-6 text-sm text-muted-foreground">
            No tracks yet. Add a track to start mixing.
          </div>
        )}
        <div className="grid gap-3 overflow-x-auto pb-2">
          <div className="grid min-w-[980px] grid-cols-[repeat(7,1fr)] gap-3">
            {channels.map((channel) => (
              <TrackChannelCard
                key={channel.id}
                channel={channel}
                track={tracksById.get(channel.id)}
                meter={meterHeight(channel.gain)}
                playbackLoading={playbackLoading}
                selectedWorkspaceId={selectedWorkspaceId}
                deleteClipPending={deleteClipPending}
                onOpenCreateClip={onOpenCreateClip}
                onOpenEditTrack={onOpenEditTrack}
                onDeleteTrack={onDeleteTrack}
                onToggleChannel={onToggleChannel}
                onUpdateChannel={onUpdateChannel}
                onPlayTrack={onPlayTrack}
                onOpenEditClip={onOpenEditClip}
                onDeleteClip={onDeleteClip}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
