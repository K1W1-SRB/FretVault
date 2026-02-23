"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";
import {
  assetsApi,
  performanceProjectsApi,
  performanceClipsApi,
  performanceTracksApi,
  performanceTimelineApi,
  type CreatePerformanceClipInput,
  type CreatePerformanceTrackInput,
  type ExportPerformanceMp4Input,
  type PerformanceClip,
  type PerformanceTrack,
  type PerformanceTimeline,
  type UpdatePerformanceTrackInput,
} from "@/lib/performance-api";
import { ClipDialog } from "@/components/mixer/clip-dialog";
import { EditClipDialog } from "@/components/mixer/edit-clip-dialog";
import { ExportProjectDialog } from "@/components/mixer/export-project-dialog";
import { MixerHeader } from "@/components/mixer/mixer-header";
import { TrackDialog } from "@/components/mixer/track-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TransportTimeline,
  type TimelineClipTool,
  type TransportClipRegion,
  type TransportCountInBars,
  type TransportTimeDisplayMode,
} from "@/components/mixer/transport-timeline";
import { TracksBoard } from "@/components/mixer/tracks-board";

type Channel = {
  id: string;
  label: string;
  type: "midi" | "audio" | "return" | "master";
  accent: string;
  gain: number;
  pan: number;
  armed?: boolean;
  monitor?: boolean;
  muted?: boolean;
  solo?: boolean;
};

type TrackFormState = {
  name: string;
  gainDb: number;
  pan: number;
  mute: boolean;
  solo: boolean;
};

type ClipFormState = {
  file: File | null;
  contentType: string;
  fileExt: string;
  startMs: number;
  clipDurationMs: number;
  offsetInAssetMs: number;
  assetDurationMs: number | null;
  sampleRate: number;
  channels: number;
  waveformPeaks: number[] | null;
};

type ClipDeleteTarget = {
  clipId: string;
  source: "board" | "timeline";
  trackName: string;
  startMs: number;
};

const defaultTrackForm: TrackFormState = {
  name: "",
  gainDb: 0,
  pan: 0,
  mute: false,
  solo: false,
};

const defaultClipForm: ClipFormState = {
  file: null,
  contentType: "",
  fileExt: "",
  startMs: 0,
  clipDurationMs: 0,
  offsetInAssetMs: 0,
  assetDurationMs: null,
  sampleRate: 44100,
  channels: 2,
  waveformPeaks: null,
};

const channelAccents = [
  "bg-indigo-500",
  "bg-sky-500",
  "bg-fuchsia-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-emerald-500",
];

const ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
  "audio/wav": ["wav"],
  "audio/x-wav": ["wav"],
  "audio/mpeg": ["mp3", "mpeg"],
  "audio/webm": ["webm"],
  "audio/ogg": ["ogg", "oga"],
  "audio/flac": ["flac"],
  "audio/aac": ["aac"],
  "audio/mp4": ["m4a", "mp4"],
};

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  webm: "audio/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
};

const RECORD_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

function getFileExt(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx + 1).toLowerCase();
}

function resolveAssetType(file: File) {
  const ext = getFileExt(file.name);
  const normalizedType = (file.type || "").toLowerCase();

  if (
    normalizedType &&
    ALLOWED_CONTENT_TYPES[normalizedType] &&
    (!ext || ALLOWED_CONTENT_TYPES[normalizedType].includes(ext))
  ) {
    const fallbackExt = ALLOWED_CONTENT_TYPES[normalizedType][0];
    return { contentType: normalizedType, fileExt: ext || fallbackExt };
  }

  if (ext && EXT_TO_CONTENT_TYPE[ext]) {
    const mapped = EXT_TO_CONTENT_TYPE[ext];
    if (ALLOWED_CONTENT_TYPES[mapped]) {
      return { contentType: mapped, fileExt: ext };
    }
  }

  return null;
}

function pickRecordingMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  return (
    RECORD_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
  );
}

async function getAudioMetadata(file: File) {
  if (typeof window === "undefined") {
    return {
      durationMs: null,
      sampleRate: null,
      channels: null,
      waveformPeaks: null,
    };
  }

  const AudioContextRef =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  let durationMs: number | null = null;
  let sampleRate: number | null = null;
  let channels: number | null = null;
  let waveformPeaks: number[] | null = null;

  if (AudioContextRef) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContextRef();
      try {
        const audioBuffer = await audioContext.decodeAudioData(
          arrayBuffer.slice(0),
        );
        durationMs = Math.round(audioBuffer.duration * 1000);
        sampleRate = audioBuffer.sampleRate;
        channels = audioBuffer.numberOfChannels;
        const channelData = audioBuffer.getChannelData(0);
        const peakCount = 256;
        const samplesPerPeak = Math.max(
          1,
          Math.floor(channelData.length / peakCount),
        );
        const peaks = new Array<number>(peakCount).fill(0);
        for (let i = 0; i < peakCount; i += 1) {
          const start = i * samplesPerPeak;
          const end = Math.min(start + samplesPerPeak, channelData.length);
          let max = 0;
          for (let j = start; j < end; j += 1) {
            const value = Math.abs(channelData[j]);
            if (value > max) max = value;
          }
          peaks[i] = max;
        }
        waveformPeaks = peaks;
      } finally {
        await audioContext.close();
      }
    } catch {
      // ignore decode errors
    }
  }

  if (durationMs == null) {
    durationMs = await new Promise<number | null>((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const cleanup = () => {
        URL.revokeObjectURL(url);
      };
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const duration = Number.isFinite(audio.duration)
          ? Math.round(audio.duration * 1000)
          : null;
        cleanup();
        resolve(duration);
      };
      audio.onerror = () => {
        cleanup();
        resolve(null);
      };
      audio.src = url;
    });
  }

  return { durationMs, sampleRate, channels, waveformPeaks };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: string }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PerformanceZoneProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = typeof params?.id === "string" ? params.id : "";
  const { selectedWorkspaceId } = useSelectedWorkspace();

  const timelineQuery = useQuery({
    queryKey: ["performance-timeline", projectId],
    queryFn: () => performanceTimelineApi.get(projectId),
    enabled: !!projectId,
  });

  const [channels, setChannels] = useState<Channel[]>([]);
  const [tempo, setTempo] = useState(124);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<PerformanceTrack | null>(
    null,
  );
  const [trackForm, setTrackForm] = useState<TrackFormState>(defaultTrackForm);
  const [trackFormError, setTrackFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const pendingUpdatesRef = useRef<Map<string, number>>(new Map());
  const [clipDialogOpen, setClipDialogOpen] = useState(false);
  const [clipTrackId, setClipTrackId] = useState<string | null>(null);
  const [clipForm, setClipForm] = useState<ClipFormState>(defaultClipForm);
  const [clipFormError, setClipFormError] = useState<string | null>(null);
  const [clipMetadataLoading, setClipMetadataLoading] = useState(false);
  const [clipUploadStep, setClipUploadStep] = useState<
    "idle" | "presign" | "upload" | "finalize" | "create"
  >("idle");
  const [clipRecording, setClipRecording] = useState(false);
  const [clipRecordingError, setClipRecordingError] = useState<string | null>(
    null,
  );
  const [clipRecordingUrl, setClipRecordingUrl] = useState<string | null>(null);
  const clipRecorderRef = useRef<MediaRecorder | null>(null);
  const clipRecordChunksRef = useRef<Blob[]>([]);
  const clipRecordStreamRef = useRef<MediaStream | null>(null);
  const [clipInputLevel, setClipInputLevel] = useState(0);
  const clipLevelRafRef = useRef<number | null>(null);
  const clipLevelAudioContextRef = useRef<AudioContext | null>(null);
  const clipLevelAnalyserRef = useRef<AnalyserNode | null>(null);
  const [editClipDialogOpen, setEditClipDialogOpen] = useState(false);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editClipForm, setEditClipForm] = useState({
    startMs: 0,
    durationMs: 0,
    offsetInAssetMs: 0,
  });
  const [editClipError, setEditClipError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<
    "stopped" | "playing" | "paused"
  >("stopped");
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [timeDisplayMode, setTimeDisplayMode] =
    useState<TransportTimeDisplayMode>("bars");
  const [timelineClipTool, setTimelineClipTool] =
    useState<TimelineClipTool>("move");
  const [timelineClipActionPending, setTimelineClipActionPending] =
    useState(false);
  const [clipDeleteTarget, setClipDeleteTarget] =
    useState<ClipDeleteTarget | null>(null);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [countInBars, setCountInBars] = useState<TransportCountInBars>(0);
  const [countInActive, setCountInActive] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStartMs, setLoopStartMs] = useState(0);
  const [loopEndMs, setLoopEndMs] = useState(8000);
  const [transportRecording, setTransportRecording] = useState(false);
  const [transportRecordSaving, setTransportRecordSaving] = useState(false);
  const [playheadMs, setPlayheadMs] = useState(0);
  const countInTimeoutRef = useRef<number | null>(null);
  const loopRestartGuardRef = useRef(false);
  const metronomeContextRef = useRef<AudioContext | null>(null);
  const metronomeIntervalRef = useRef<number | null>(null);
  const metronomeBeatRef = useRef(0);
  const transportRecorderRef = useRef<MediaRecorder | null>(null);
  const transportRecordStreamRef = useRef<MediaStream | null>(null);
  const transportRecordChunksRef = useRef<Blob[]>([]);
  const transportRecordTrackIdRef = useRef<string | null>(null);
  const transportRecordAwaitingPlaybackRef = useRef(false);
  const transportRecordStartMsRef = useRef(0);
  const transportRecordTrimMsRef = useRef(0);
  const transportRecordStartedAtRef = useRef(0);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackSessionRef = useRef(0);
  const playbackAssetCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const playbackStartOffsetMsRef = useRef(0);

  const stopMetronome = () => {
    if (metronomeIntervalRef.current) {
      window.clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    metronomeBeatRef.current = 0;
    if (metronomeContextRef.current) {
      void metronomeContextRef.current.close();
      metronomeContextRef.current = null;
    }
  };

  const releaseTransportRecorder = () => {
    transportRecordStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());
    transportRecordStreamRef.current = null;
    transportRecorderRef.current = null;
    transportRecordChunksRef.current = [];
    transportRecordAwaitingPlaybackRef.current = false;
  };

  const stopTransportRecording = () => {
    if (transportRecorderRef.current?.state === "recording") {
      try {
        transportRecorderRef.current.requestData();
      } catch {
        // ignore
      }
      transportRecorderRef.current.stop();
      return;
    }
    releaseTransportRecorder();
  };

  const createTrackMutation = useMutation({
    mutationFn: (payload: CreatePerformanceTrackInput) => {
      if (!selectedWorkspaceId) {
        throw new Error("No workspace selected");
      }
      return performanceTracksApi.create(selectedWorkspaceId, payload);
    },
    onSuccess: async () => {
      setActionError(null);
      await timelineQuery.refetch();
    },
  });

  const updateTrackMutation = useMutation({
    mutationFn: ({
      trackId,
      payload,
    }: {
      trackId: string;
      payload: UpdatePerformanceTrackInput;
    }) => {
      if (!selectedWorkspaceId) {
        throw new Error("No workspace selected");
      }
      return performanceTracksApi.update(selectedWorkspaceId, trackId, payload);
    },
    onSuccess: () => {
      setActionError(null);
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (trackId: string) => {
      if (!selectedWorkspaceId) {
        throw new Error("No workspace selected");
      }
      return performanceTracksApi.remove(selectedWorkspaceId, trackId);
    },
    onSuccess: async () => {
      setActionError(null);
      await timelineQuery.refetch();
    },
  });

  const deleteClipMutation = useMutation({
    mutationFn: (clipId: string) => performanceClipsApi.remove(clipId),
    onSuccess: async () => {
      setActionError(null);
      await timelineQuery.refetch();
    },
  });

  const exportMutation = useMutation({
    mutationFn: (payload: ExportPerformanceMp4Input) =>
      performanceProjectsApi.exportMp4(projectId, payload),
  });

  useEffect(() => {
    const data: PerformanceTimeline | undefined = timelineQuery.data;
    if (!data?.project) return;
    setTempo(data.project.bpm);
    setChannels((current) => {
      const existing = new Map(current.map((channel) => [channel.id, channel]));
      return data.tracks.map((track, index) => {
        const prev = existing.get(track.id);
        return {
          id: track.id,
          label: track.name || `Track ${track.index + 1}`,
          type: "audio",
          accent: channelAccents[index % channelAccents.length],
          gain: track.gainDb ?? 0,
          pan: track.pan ?? 0,
          armed: prev?.armed ?? false,
          monitor: prev?.monitor ?? false,
          muted: track.mute ?? false,
          solo: track.solo ?? false,
        };
      });
    });
  }, [timelineQuery.data]);

  const project = timelineQuery.data?.project;
  const tracksById = useMemo(() => {
    const map = new Map<string, PerformanceTrack>();
    (timelineQuery.data?.tracks ?? []).forEach((track) => {
      map.set(track.id, track);
    });
    return map;
  }, [timelineQuery.data?.tracks]);
  const clipsById = useMemo(() => {
    const map = new Map<
      string,
      {
        clip: PerformanceClip;
        trackId: string;
      }
    >();
    (timelineQuery.data?.tracks ?? []).forEach((track) => {
      track.clips.forEach((clip) => {
        map.set(clip.id, { clip, trackId: track.id });
      });
    });
    return map;
  }, [timelineQuery.data?.tracks]);
  const projectDurationMs = useMemo(() => {
    const clips = (timelineQuery.data?.tracks ?? []).flatMap(
      (track) => track.clips,
    );
    if (clips.length === 0) return 0;
    return Math.max(...clips.map((clip) => clip.startMs + clip.durationMs));
  }, [timelineQuery.data?.tracks]);
  const timelineDurationMs = useMemo(
    () => Math.max(8000, projectDurationMs, loopEndMs + 1000),
    [projectDurationMs, loopEndMs],
  );
  const transportClipRegions = useMemo<TransportClipRegion[]>(() => {
    const trackColors = [
      "#818cf8",
      "#0ea5e9",
      "#d946ef",
      "#f43f5e",
      "#f59e0b",
      "#84cc16",
      "#10b981",
      "#38bdf8",
    ];
    return (timelineQuery.data?.tracks ?? []).flatMap((track, index) =>
      track.clips.map((clip) => ({
        id: clip.id,
        trackId: track.id,
        trackName: track.name,
        startMs: clip.startMs,
        durationMs: clip.durationMs,
        color: trackColors[index % trackColors.length],
      })),
    );
  }, [timelineQuery.data?.tracks]);

  const clipTrack = clipTrackId ? (tracksById.get(clipTrackId) ?? null) : null;
  const clipDeletePending =
    deleteClipMutation.isPending || timelineClipActionPending;
  const clipDeleteTimeSeconds = clipDeleteTarget
    ? (clipDeleteTarget.startMs / 1000).toFixed(2)
    : null;
  const clipDeleteDescription = clipDeleteTarget
    ? `Delete clip on ${clipDeleteTarget.trackName} at ${clipDeleteTimeSeconds}s? This cannot be undone.`
    : "Delete this clip? This cannot be undone.";
  const clipBusyLabel = clipRecording
    ? "Recording..."
    : clipUploadStep === "presign"
      ? "Preparing upload..."
      : clipUploadStep === "upload"
        ? "Uploading audio..."
        : clipUploadStep === "finalize"
          ? "Finalizing asset..."
          : clipUploadStep === "create"
            ? "Creating clip..."
            : "";

  const nextTrackIndex = useMemo(() => {
    const indices = (timelineQuery.data?.tracks ?? []).map(
      (track) => track.index,
    );
    if (indices.length === 0) return 0;
    return Math.max(...indices) + 1;
  }, [timelineQuery.data?.tracks]);

  useEffect(() => {
    if (!trackDialogOpen) return;
    setTrackFormError(null);
    if (editingTrack) {
      setTrackForm({
        name: editingTrack.name,
        gainDb: editingTrack.gainDb ?? 0,
        pan: editingTrack.pan ?? 0,
        mute: editingTrack.mute ?? false,
        solo: editingTrack.solo ?? false,
      });
    } else {
      setTrackForm(defaultTrackForm);
    }
  }, [trackDialogOpen, editingTrack]);

  useEffect(() => {
    return () => {
      pendingUpdatesRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      pendingUpdatesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!clipDialogOpen) return;
    setClipFormError(null);
    setClipUploadStep("idle");
    setClipMetadataLoading(false);
    setClipForm(defaultClipForm);
    setClipRecording(false);
    setClipRecordingError(null);
    setClipInputLevel(0);
    if (clipRecordingUrl) {
      URL.revokeObjectURL(clipRecordingUrl);
      setClipRecordingUrl(null);
    }
  }, [clipDialogOpen]);

  useEffect(() => {
    if (!editClipDialogOpen) return;
    setEditClipError(null);
    if (!editingClipId) return;
    const clip = (timelineQuery.data?.tracks ?? [])
      .flatMap((track) => track.clips)
      .find((item) => item.id === editingClipId);
    if (!clip) return;
    setEditClipForm({
      startMs: clip.startMs,
      durationMs: clip.durationMs,
      offsetInAssetMs: clip.offsetInAssetMs ?? 0,
    });
  }, [editClipDialogOpen, editingClipId, timelineQuery.data?.tracks]);

  useEffect(() => {
    if (clipDialogOpen) return;
    if (clipRecorderRef.current?.state === "recording") {
      clipRecorderRef.current.stop();
    }
    clipRecordStreamRef.current?.getTracks().forEach((track) => track.stop());
    clipRecordStreamRef.current = null;
    clipRecorderRef.current = null;
    clipRecordChunksRef.current = [];
    if (clipLevelRafRef.current) {
      cancelAnimationFrame(clipLevelRafRef.current);
      clipLevelRafRef.current = null;
    }
    clipLevelAnalyserRef.current?.disconnect();
    clipLevelAnalyserRef.current = null;
    void clipLevelAudioContextRef.current?.close();
    clipLevelAudioContextRef.current = null;
  }, [clipDialogOpen]);

  useEffect(() => {
    return () => {
      if (countInTimeoutRef.current) {
        window.clearTimeout(countInTimeoutRef.current);
        countInTimeoutRef.current = null;
      }
      if (transportRecorderRef.current?.state === "recording") {
        try {
          transportRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      releaseTransportRecorder();
      stopMetronome();
      playbackSessionRef.current += 1;
      playbackSourcesRef.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          // ignore
        }
      });
      playbackSourcesRef.current = [];
      if (playbackContextRef.current) {
        void playbackContextRef.current.close();
        playbackContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setLoopStartMs((current) =>
      Math.max(0, Math.min(current, Math.max(0, timelineDurationMs - 100))),
    );
    setLoopEndMs((current) =>
      Math.max(loopStartMs + 100, Math.min(current, timelineDurationMs)),
    );
  }, [timelineDurationMs, loopStartMs]);

  useEffect(() => {
    if (playbackState === "playing") {
      let rafId: number | null = null;
      const tick = () => {
        const ctx = playbackContextRef.current;
        if (!ctx) return;
        setPlayheadMs(playbackStartOffsetMsRef.current + ctx.currentTime * 1000);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
    if (playbackContextRef.current) {
      setPlayheadMs(
        playbackStartOffsetMsRef.current +
          playbackContextRef.current.currentTime * 1000,
      );
    }
  }, [playbackState]);

  useEffect(() => {
    if (playbackState !== "playing") return;
    if (!transportRecording) return;
    if (!transportRecordAwaitingPlaybackRef.current) return;

    transportRecordTrimMsRef.current = Math.max(
      0,
      Date.now() - transportRecordStartedAtRef.current,
    );
    transportRecordAwaitingPlaybackRef.current = false;
  }, [playbackState, transportRecording]);

  useEffect(() => {
    const shouldTick =
      metronomeEnabled && (playbackState === "playing" || countInActive);
    if (!shouldTick) {
      stopMetronome();
      return;
    }

    const context = new AudioContext();
    metronomeContextRef.current = context;
    const beatMs = 60000 / Math.max(1, tempo);

    const triggerTick = () => {
      const beat = metronomeBeatRef.current;
      const accent = beat % 4 === 0;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = accent ? "triangle" : "square";
      oscillator.frequency.value = accent ? 1700 : 1100;
      gainNode.gain.value = accent ? 0.08 : 0.045;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      const now = context.currentTime;
      oscillator.start(now);
      oscillator.stop(now + 0.045);
      metronomeBeatRef.current += 1;
    };

    triggerTick();
    metronomeIntervalRef.current = window.setInterval(triggerTick, beatMs);

    return () => {
      stopMetronome();
    };
  }, [metronomeEnabled, playbackState, countInActive, tempo]);

  const armedCount = useMemo(
    () => channels.filter((channel) => channel.armed).length,
    [channels],
  );

  const commitTrackUpdate = (
    trackId: string,
    payload: UpdatePerformanceTrackInput,
  ) => {
    if (!selectedWorkspaceId) return;
    setActionError(null);
    updateTrackMutation.mutate(
      { trackId, payload },
      {
        onError: (error) => {
          setActionError(
            getErrorMessage(error, "Failed to update track settings."),
          );
        },
      },
    );
  };

  const scheduleTrackUpdate = (
    trackId: string,
    payload: UpdatePerformanceTrackInput,
    delayMs = 300,
  ) => {
    if (!selectedWorkspaceId) return;
    const key = `${trackId}:${Object.keys(payload)[0] ?? "update"}`;
    const existing = pendingUpdatesRef.current.get(key);
    if (existing) window.clearTimeout(existing);
    const timeoutId = window.setTimeout(() => {
      pendingUpdatesRef.current.delete(key);
      commitTrackUpdate(trackId, payload);
    }, delayMs);
    pendingUpdatesRef.current.set(key, timeoutId);
  };

  const handleOpenCreateTrack = () => {
    setEditingTrack(null);
    setTrackDialogOpen(true);
  };

  const handleOpenEditTrack = (trackId: string) => {
    const track = tracksById.get(trackId);
    if (!track) return;
    setEditingTrack(track);
    setTrackDialogOpen(true);
  };

  const handleTrackDialogOpenChange = (open: boolean) => {
    setTrackDialogOpen(open);
    if (!open) {
      setEditingTrack(null);
    }
  };

  const handleTrackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTrackFormError(null);

    if (!selectedWorkspaceId) {
      setTrackFormError("Select a workspace first.");
      return;
    }

    const name = trackForm.name.trim();
    if (!name) {
      setTrackFormError("Track name is required.");
      return;
    }

    const gainDb = Number(trackForm.gainDb);
    if (!Number.isFinite(gainDb) || gainDb < -60 || gainDb > 12) {
      setTrackFormError("Gain must be between -60 and 12 dB.");
      return;
    }

    const pan = Number(trackForm.pan);
    if (!Number.isFinite(pan) || pan < -1 || pan > 1) {
      setTrackFormError("Pan must be between -1 and 1.");
      return;
    }

    const payloadBase: UpdatePerformanceTrackInput = {
      name,
      gainDb,
      pan,
      mute: trackForm.mute,
      solo: trackForm.solo,
    };

    try {
      if (editingTrack) {
        await updateTrackMutation.mutateAsync({
          trackId: editingTrack.id,
          payload: payloadBase,
        });
      } else {
        const payload: CreatePerformanceTrackInput = {
          projectId,
          index: nextTrackIndex,
          name,
          gainDb,
          pan,
          mute: trackForm.mute,
          solo: trackForm.solo,
        };
        await createTrackMutation.mutateAsync(payload);
      }
      setTrackDialogOpen(false);
    } catch (error) {
      setTrackFormError(getErrorMessage(error, "Failed to save track."));
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    const track = tracksById.get(trackId);
    if (!track) return;
    if (deleteTrackMutation.isPending) return;
    const confirmed = window.confirm(
      `Delete "${track.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setActionError(null);
    try {
      await deleteTrackMutation.mutateAsync(trackId);
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to delete track."));
    }
  };

  const clipBusy = clipUploadStep !== "idle" || clipRecording;

  const handleOpenCreateClip = (trackId: string) => {
    setClipTrackId(trackId);
    setClipDialogOpen(true);
  };

  const handleClipDialogOpenChange = (open: boolean) => {
    setClipDialogOpen(open);
    if (!open) {
      setClipTrackId(null);
    }
  };

  const handleClipFileChange = async (
    file: File | null,
    opts?: { fromRecording?: boolean },
  ) => {
    setClipFormError(null);

    if (!opts?.fromRecording && clipRecordingUrl) {
      URL.revokeObjectURL(clipRecordingUrl);
      setClipRecordingUrl(null);
    }

    if (!file) {
      setClipForm((prev) => ({
        ...defaultClipForm,
        startMs: prev.startMs,
        offsetInAssetMs: prev.offsetInAssetMs,
      }));
      return;
    }

    const resolved = resolveAssetType(file);
    if (!resolved) {
      setClipFormError("Unsupported audio file type.");
      setClipForm((prev) => ({
        ...prev,
        file: null,
        contentType: "",
        fileExt: "",
      }));
      return;
    }

    setClipForm((prev) => ({
      ...prev,
      file,
      contentType: resolved.contentType,
      fileExt: resolved.fileExt,
    }));

    setClipMetadataLoading(true);
    try {
      const meta = await getAudioMetadata(file);
      setClipForm((prev) => {
        const nextAssetDuration = meta.durationMs ?? prev.assetDurationMs;
        const nextClipDuration =
          prev.clipDurationMs > 0
            ? prev.clipDurationMs
            : (meta.durationMs ?? prev.clipDurationMs);
        return {
          ...prev,
          assetDurationMs: nextAssetDuration,
          clipDurationMs: nextClipDuration,
          sampleRate: meta.sampleRate ?? prev.sampleRate,
          channels: meta.channels ?? prev.channels,
          waveformPeaks: meta.waveformPeaks ?? prev.waveformPeaks,
        };
      });
    } finally {
      setClipMetadataLoading(false);
    }
  };

  const stopClipRecording = () => {
    if (clipRecorderRef.current?.state === "recording") {
      try {
        clipRecorderRef.current.requestData();
      } catch {
        // ignore
      }
      clipRecorderRef.current.stop();
    }
  };

  const handleClipRecordStart = async () => {
    setClipRecordingError(null);
    setClipInputLevel(0);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setClipRecordingError("Recording is not supported in this browser.");
      return;
    }

    if (clipRecording) return;

    try {
      let stream: MediaStream | null = null;
      const storedDeviceId =
        typeof window !== "undefined"
          ? (window.localStorage.getItem("fv-settings-audio-input") ?? "")
          : "";

      if (storedDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: storedDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch {
          stream = null;
        }
      }

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      if (!stream) {
        throw new Error("Unable to access microphone.");
      }

      const track = stream.getAudioTracks()[0];
      if (!track) {
        throw new Error("No audio track available.");
      }
      clipRecordStreamRef.current = stream;

      const mimeType = pickRecordingMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      clipRecorderRef.current = recorder;
      clipRecordChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          clipRecordChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setClipRecordingError("Recording failed.");
      };

      recorder.onstop = () => {
        setClipRecording(false);
        const chunks = clipRecordChunksRef.current;
        if (chunks.length === 0) {
          setClipRecordingError("No audio captured.");
          clipRecordStreamRef.current?.getTracks().forEach((t) => t.stop());
          clipRecordStreamRef.current = null;
          clipRecorderRef.current = null;
          return;
        }
        const contentType = (recorder.mimeType || mimeType || "audio/webm")
          .split(";")[0]
          .trim();
        const fileExt = ALLOWED_CONTENT_TYPES[contentType]?.[0] ?? "webm";
        const blob = new Blob(chunks, {
          type: contentType,
        });
        const fileName = `recording-${Date.now()}.${fileExt}`;
        const file = new File([blob], fileName, { type: contentType });

        if (clipRecordingUrl) {
          URL.revokeObjectURL(clipRecordingUrl);
        }
        const url = URL.createObjectURL(blob);
        setClipRecordingUrl(url);
        void handleClipFileChange(file, { fromRecording: true });

        clipRecordChunksRef.current = [];
        clipRecordStreamRef.current?.getTracks().forEach((t) => t.stop());
        clipRecordStreamRef.current = null;
        clipRecorderRef.current = null;
        if (clipLevelRafRef.current) {
          cancelAnimationFrame(clipLevelRafRef.current);
          clipLevelRafRef.current = null;
        }
        clipLevelAnalyserRef.current?.disconnect();
        clipLevelAnalyserRef.current = null;
        void clipLevelAudioContextRef.current?.close();
        clipLevelAudioContextRef.current = null;
      };

      if (typeof window !== "undefined" && window.AudioContext) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        const updateLevel = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setClipInputLevel(Math.min(1, rms * 3));
          clipLevelRafRef.current = requestAnimationFrame(updateLevel);
        };

        clipLevelAudioContextRef.current = audioContext;
        clipLevelAnalyserRef.current = analyser;
        clipLevelRafRef.current = requestAnimationFrame(updateLevel);
      }

      recorder.start(1000);
      setClipRecording(true);
    } catch (error) {
      setClipRecordingError(
        getErrorMessage(error, "Microphone access was denied."),
      );
      stopClipRecording();
    }
  };

  const handleClipRecordStop = () => {
    stopClipRecording();
  };

  const handleClipSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClipFormError(null);

    if (!selectedWorkspaceId) {
      setClipFormError("Select a workspace first.");
      return;
    }

    if (!clipTrackId) {
      setClipFormError("Choose a track first.");
      return;
    }

    if (clipRecording) {
      setClipFormError("Stop recording before uploading.");
      return;
    }

    const file = clipForm.file;
    if (!file) {
      setClipFormError("Select an audio file.");
      return;
    }

    if (!clipForm.contentType || !clipForm.fileExt) {
      setClipFormError("Unsupported audio file type.");
      return;
    }

    const assetDurationMs = Number(clipForm.assetDurationMs);
    if (!Number.isFinite(assetDurationMs) || assetDurationMs < 1) {
      setClipFormError("Asset duration is required.");
      return;
    }

    const clipDurationMs = Number(clipForm.clipDurationMs);
    if (!Number.isFinite(clipDurationMs) || clipDurationMs < 1) {
      setClipFormError("Clip duration must be at least 0.001 seconds.");
      return;
    }

    const startMs = Number(clipForm.startMs);
    if (!Number.isFinite(startMs) || startMs < 0) {
      setClipFormError("Start time must be 0 or greater.");
      return;
    }

    const offsetInAssetMs = Number(clipForm.offsetInAssetMs);
    if (!Number.isFinite(offsetInAssetMs) || offsetInAssetMs < 0) {
      setClipFormError("Offset must be 0 or greater.");
      return;
    }

    if (offsetInAssetMs + clipDurationMs > assetDurationMs) {
      setClipFormError("Clip exceeds asset duration.");
      return;
    }

    const sampleRate = Number(clipForm.sampleRate);
    if (!Number.isFinite(sampleRate) || sampleRate < 8000) {
      setClipFormError("Sample rate must be at least 8000 Hz.");
      return;
    }

    const channels = Number(clipForm.channels);
    if (!Number.isFinite(channels) || channels < 1 || channels > 8) {
      setClipFormError("Channels must be between 1 and 8.");
      return;
    }

    try {
      setClipUploadStep("presign");
      const presign = await assetsApi.presign({
        workspaceId: selectedWorkspaceId,
        contentType: clipForm.contentType,
        fileExt: clipForm.fileExt,
        byteSizeEstimate: file.size,
      });

      setClipUploadStep("upload");
      const uploadRes = await fetch(presign.putUrl, {
        method: "PUT",
        headers: { "Content-Type": clipForm.contentType },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      setClipUploadStep("finalize");
      await assetsApi.finalize(presign.assetId, {
        byteSize: file.size,
        durationMs: assetDurationMs,
        sampleRate,
        channels,
        waveformPeaks: clipForm.waveformPeaks ?? undefined,
      });

      setClipUploadStep("create");
      const payload: CreatePerformanceClipInput = {
        assetId: presign.assetId,
        startMs,
        durationMs: clipDurationMs,
        offsetInAssetMs,
      };
      await performanceClipsApi.create(clipTrackId, payload);

      await timelineQuery.refetch();
      setClipDialogOpen(false);
    } catch (error) {
      setClipFormError(getErrorMessage(error, "Failed to upload clip."));
    } finally {
      setClipUploadStep("idle");
    }
  };

  const requestDeleteClip = (clipId: string, source: "board" | "timeline") => {
    if (clipDeletePending) return;
    const clipEntry = clipsById.get(clipId);
    if (!clipEntry) return;

    const track = tracksById.get(clipEntry.trackId);
    const trackName =
      track?.name?.trim() ||
      (track ? `Track ${track.index + 1}` : "this track");

    setClipDeleteTarget({
      clipId,
      source,
      trackName,
      startMs: clipEntry.clip.startMs,
    });
  };

  const handleDeleteClip = (clipId: string) => {
    requestDeleteClip(clipId, "board");
  };

  const handleClipDeleteDialogOpenChange = (open: boolean) => {
    if (open) return;
    if (clipDeletePending) return;
    setClipDeleteTarget(null);
  };

  const handleConfirmDeleteClip = async () => {
    if (!clipDeleteTarget) return;
    const target = clipDeleteTarget;

    setActionError(null);
    try {
      if (target.source === "timeline") {
        setTimelineClipActionPending(true);
        try {
          await performanceClipsApi.remove(target.clipId);
          await timelineQuery.refetch();
        } finally {
          setTimelineClipActionPending(false);
        }
      } else {
        await deleteClipMutation.mutateAsync(target.clipId);
      }
      setClipDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to delete clip."));
    }
  };

  const handleOpenEditClip = (clipId: string) => {
    setEditingClipId(clipId);
    setEditClipDialogOpen(true);
  };

  const handleEditClipDialogOpenChange = (open: boolean) => {
    setEditClipDialogOpen(open);
    if (!open) {
      setEditingClipId(null);
    }
  };

  const handleEditClipSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditClipError(null);

    if (!editingClipId) {
      setEditClipError("No clip selected.");
      return;
    }

    const startMs = Number(editClipForm.startMs);
    const durationMs = Number(editClipForm.durationMs);
    const offsetInAssetMs = Number(editClipForm.offsetInAssetMs);

    if (!Number.isFinite(startMs) || startMs < 0) {
      setEditClipError("Start time must be 0 or greater.");
      return;
    }
    if (!Number.isFinite(durationMs) || durationMs < 1) {
      setEditClipError("Duration must be at least 0.001 seconds.");
      return;
    }
    if (!Number.isFinite(offsetInAssetMs) || offsetInAssetMs < 0) {
      setEditClipError("Offset must be 0 or greater.");
      return;
    }

    try {
      await performanceClipsApi.update(editingClipId, {
        startMs,
        durationMs,
        offsetInAssetMs,
      });
      await timelineQuery.refetch();
      setEditClipDialogOpen(false);
    } catch (error) {
      setEditClipError(getErrorMessage(error, "Failed to update clip."));
    }
  };

  const handleTimelineClipMove = async (clipId: string, startMs: number) => {
    if (timelineClipActionPending) return;
    const clipEntry = clipsById.get(clipId);
    if (!clipEntry) return;

    const nextStartMs = Math.max(0, Math.round(startMs));
    if (nextStartMs === clipEntry.clip.startMs) return;

    setTimelineClipActionPending(true);
    setActionError(null);
    try {
      await performanceClipsApi.update(clipId, { startMs: nextStartMs });
      await timelineQuery.refetch();
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to move clip."));
    } finally {
      setTimelineClipActionPending(false);
    }
  };

  const handleTimelineClipCut = async (clipId: string, cutAtMs: number) => {
    if (timelineClipActionPending) return;
    const clipEntry = clipsById.get(clipId);
    if (!clipEntry) return;

    const { clip, trackId } = clipEntry;
    const clampedCutAtMs = Math.max(
      clip.startMs + 1,
      Math.min(Math.round(cutAtMs), clip.startMs + clip.durationMs - 1),
    );
    const leftDurationMs = clampedCutAtMs - clip.startMs;
    const rightDurationMs = clip.durationMs - leftDurationMs;
    const minSegmentMs = 50;

    if (leftDurationMs < minSegmentMs || rightDurationMs < minSegmentMs) {
      setActionError(
        `Cut point must leave at least ${(minSegmentMs / 1000).toFixed(3)}s on both sides.`,
      );
      return;
    }

    setTimelineClipActionPending(true);
    setActionError(null);
    try {
      await performanceClipsApi.update(clip.id, {
        durationMs: leftDurationMs,
      });
      await performanceClipsApi.create(trackId, {
        assetId: clip.assetId,
        startMs: clampedCutAtMs,
        durationMs: rightDurationMs,
        offsetInAssetMs: (clip.offsetInAssetMs ?? 0) + leftDurationMs,
      });
      await timelineQuery.refetch();
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to cut clip."));
    } finally {
      setTimelineClipActionPending(false);
    }
  };

  const handleTimelineClipDuplicate = async (clipId: string) => {
    if (timelineClipActionPending) return;
    const clipEntry = clipsById.get(clipId);
    if (!clipEntry) return;

    const { clip, trackId } = clipEntry;
    setTimelineClipActionPending(true);
    setActionError(null);
    try {
      await performanceClipsApi.create(trackId, {
        assetId: clip.assetId,
        startMs: Math.max(0, clip.startMs + clip.durationMs),
        durationMs: clip.durationMs,
        offsetInAssetMs: clip.offsetInAssetMs ?? 0,
      });
      await timelineQuery.refetch();
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to duplicate clip."));
    } finally {
      setTimelineClipActionPending(false);
    }
  };

  const handleTimelineClipDelete = (clipId: string) => {
    requestDeleteClip(clipId, "timeline");
  };

  const ensurePlaybackContext = () => {
    if (playbackContextRef.current) return playbackContextRef.current;
    const ctx = new AudioContext();
    playbackContextRef.current = ctx;
    return ctx;
  };

  const stopPlayback = async () => {
    if (countInTimeoutRef.current) {
      window.clearTimeout(countInTimeoutRef.current);
      countInTimeoutRef.current = null;
    }
    setCountInActive(false);
    stopMetronome();
    playbackSessionRef.current += 1;
    playbackSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // ignore
      }
    });
    playbackSourcesRef.current = [];
    if (playbackContextRef.current) {
      try {
        await playbackContextRef.current.close();
      } catch {
        // ignore
      }
      playbackContextRef.current = null;
    }
    playbackStartOffsetMsRef.current = 0;
    loopRestartGuardRef.current = false;
    setPlaybackState("stopped");
  };

  const pausePlayback = async () => {
    if (!playbackContextRef.current) return;
    try {
      await playbackContextRef.current.suspend();
      setPlayheadMs(
        playbackStartOffsetMsRef.current +
          playbackContextRef.current.currentTime * 1000,
      );
      setPlaybackState("paused");
    } catch {
      // ignore
    }
  };

  const resumePlayback = async () => {
    if (!playbackContextRef.current) return;
    try {
      await playbackContextRef.current.resume();
      setPlaybackState("playing");
    } catch {
      // ignore
    }
  };

  const getAssetBuffer = async (assetId: string, ctx: AudioContext) => {
    const cached = playbackAssetCacheRef.current.get(assetId);
    if (cached) return cached;

    const { url } = await assetsApi.downloadUrl(assetId);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Failed to download audio.");
    }
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    playbackAssetCacheRef.current.set(assetId, audioBuffer);
    return audioBuffer;
  };

  const startPlayback = async (scope?: {
    trackId?: string;
    startOffsetMs?: number;
    endOffsetMs?: number;
  }) => {
    if (!timelineQuery.data?.tracks?.length) return;

    if (countInTimeoutRef.current) {
      window.clearTimeout(countInTimeoutRef.current);
      countInTimeoutRef.current = null;
    }
    setCountInActive(false);
    setPlaybackLoading(true);
    setActionError(null);

    await stopPlayback();
    const sessionId = playbackSessionRef.current + 1;
    playbackSessionRef.current = sessionId;
    loopRestartGuardRef.current = false;
    const startOffsetMs = Math.max(0, scope?.startOffsetMs ?? 0);
    const endOffsetMs =
      scope?.endOffsetMs != null
        ? Math.max(startOffsetMs + 100, scope.endOffsetMs)
        : undefined;
    playbackStartOffsetMsRef.current = startOffsetMs;
    setPlayheadMs(startOffsetMs);

    const ctx = ensurePlaybackContext();

    const channelMap = new Map(
      channels.map((channel) => [channel.id, channel]),
    );

    const allTracks = timelineQuery.data.tracks;
    const selectedTracks = scope?.trackId
      ? allTracks.filter((track) => track.id === scope.trackId)
      : allTracks;

    const soloIds = scope?.trackId
      ? new Set<string>()
      : new Set(
          channels
            .filter((channel) => channel.solo)
            .map((channel) => channel.id),
        );

    const tracksToPlay = selectedTracks.filter((track) => {
      if (scope?.trackId) return true;
      if (soloIds.size > 0) return soloIds.has(track.id);
      const channel = channelMap.get(track.id);
      return !channel?.muted;
    });

    if (tracksToPlay.length === 0) {
      setPlaybackLoading(false);
      setPlaybackState("stopped");
      return;
    }

    try {
      let totalSources = 0;
      let endedSources = 0;

      for (const track of tracksToPlay) {
        const channel = channelMap.get(track.id);
        const gainNode = ctx.createGain();
        gainNode.gain.value =
          channel?.gain !== undefined ? Math.pow(10, channel.gain / 20) : 1;
        const panner = ctx.createStereoPanner();
        panner.pan.value = channel?.pan ?? 0;
        gainNode.connect(panner);
        panner.connect(ctx.destination);

        for (const clip of track.clips) {
          const clipStartMs = clip.startMs;
          const clipEndMs = clip.startMs + clip.durationMs;
          const playbackStartMs = Math.max(clipStartMs, startOffsetMs);
          const playbackEndMs =
            endOffsetMs != null ? Math.min(clipEndMs, endOffsetMs) : clipEndMs;
          if (playbackEndMs <= playbackStartMs) continue;

          const buffer = await getAssetBuffer(clip.assetId, ctx);
          if (playbackSessionRef.current !== sessionId) return;

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(gainNode);

          const startTime =
            ctx.currentTime + (playbackStartMs - startOffsetMs) / 1000;
          const offsetInClipMs = playbackStartMs - clipStartMs;
          const offset = ((clip.offsetInAssetMs ?? 0) + offsetInClipMs) / 1000;
          const duration = (playbackEndMs - playbackStartMs) / 1000;

          totalSources += 1;
          source.onended = () => {
            endedSources += 1;
            if (
              endedSources >= totalSources &&
              playbackSessionRef.current === sessionId
            ) {
              if (
                loopEnabled &&
                !scope?.trackId &&
                endOffsetMs != null &&
                endOffsetMs > startOffsetMs
              ) {
                if (loopRestartGuardRef.current) return;
                loopRestartGuardRef.current = true;
                void startPlayback({
                  startOffsetMs,
                  endOffsetMs,
                });
                return;
              }
              if (transportRecorderRef.current?.state === "recording") {
                stopTransportRecording();
              }
              setPlaybackState("stopped");
              setPlayheadMs(0);
              void stopPlayback();
            }
          };

          source.start(startTime, offset, duration);
          playbackSourcesRef.current.push(source);
        }
      }

      if (totalSources === 0) {
        setPlaybackLoading(false);
        setPlaybackState("stopped");
        return;
      }

      setPlaybackState("playing");
    } catch (error) {
      setActionError(getErrorMessage(error, "Playback failed."));
      await stopPlayback();
    } finally {
      setPlaybackLoading(false);
    }
  };

  const handlePlayAll = async () => {
    if (playbackState === "paused") {
      await resumePlayback();
      return;
    }
    const currentPlayheadMs = Math.max(
      0,
      Math.min(playheadMs, timelineDurationMs),
    );

    const startOffsetMs = loopEnabled
      ? currentPlayheadMs < loopStartMs || currentPlayheadMs >= loopEndMs
        ? loopStartMs
        : currentPlayheadMs
      : currentPlayheadMs;
    const endOffsetMs = loopEnabled && loopEndMs > loopStartMs ? loopEndMs : undefined;
    const countInMs =
      countInBars > 0 ? countInBars * 4 * (60000 / Math.max(1, tempo)) : 0;

    if (countInMs > 0) {
      if (countInTimeoutRef.current) {
        window.clearTimeout(countInTimeoutRef.current);
      }
      setCountInActive(true);
      countInTimeoutRef.current = window.setTimeout(() => {
        setCountInActive(false);
        countInTimeoutRef.current = null;
        void startPlayback({ startOffsetMs, endOffsetMs });
      }, countInMs);
      return;
    }

    await startPlayback({ startOffsetMs, endOffsetMs });
  };

  const handlePlayPause = async () => {
    if (playbackState === "playing") {
      await pausePlayback();
      return;
    }
    await handlePlayAll();
  };

  const handleStopAll = async () => {
    if (transportRecording) {
      stopTransportRecording();
    }
    if (countInTimeoutRef.current) {
      window.clearTimeout(countInTimeoutRef.current);
      countInTimeoutRef.current = null;
    }
    setCountInActive(false);
    setPlayheadMs(0);
    await stopPlayback();
  };

  const handlePlayTrack = async (trackId: string) => {
    await startPlayback({ trackId });
  };

  const finalizeTransportRecording = async (args: {
    chunks: Blob[];
    trackId: string;
    startMs: number;
    trimMs: number;
    mimeType: string;
    durationMs: number;
  }) => {
    if (!selectedWorkspaceId) {
      setActionError("Select a workspace first.");
      return;
    }

    const normalizedType = (args.mimeType || "audio/webm").split(";")[0].trim();
    const ext = ALLOWED_CONTENT_TYPES[normalizedType]?.[0] ?? "webm";
    const file = new File(
      [new Blob(args.chunks, { type: normalizedType })],
      `timeline-recording-${Date.now()}.${ext}`,
      { type: normalizedType },
    );
    const resolved =
      resolveAssetType(file) ??
      (ALLOWED_CONTENT_TYPES[normalizedType]
        ? { contentType: normalizedType, fileExt: ext }
        : null);

    if (!resolved) {
      setActionError("Unsupported recorded audio format.");
      return;
    }

    setTransportRecordSaving(true);
    try {
      const meta = await getAudioMetadata(file);
      const measuredDurationMs = Math.max(1, Math.round(args.durationMs));
      const assetDurationMs = Math.max(
        1,
        meta.durationMs ?? measuredDurationMs,
      );
      const trimMs = Math.max(
        0,
        Math.min(Math.round(args.trimMs), assetDurationMs - 1),
      );
      const clipDurationMs = Math.max(1, assetDurationMs - trimMs);

      const presign = await assetsApi.presign({
        workspaceId: selectedWorkspaceId,
        contentType: resolved.contentType,
        fileExt: resolved.fileExt,
        byteSizeEstimate: file.size,
      });

      const uploadRes = await fetch(presign.putUrl, {
        method: "PUT",
        headers: { "Content-Type": resolved.contentType },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      await assetsApi.finalize(presign.assetId, {
        byteSize: file.size,
        durationMs: assetDurationMs,
        sampleRate: meta.sampleRate ?? 44100,
        channels: meta.channels ?? 1,
        waveformPeaks: meta.waveformPeaks ?? undefined,
      });

      await performanceClipsApi.create(args.trackId, {
        assetId: presign.assetId,
        startMs: Math.max(0, Math.round(args.startMs)),
        durationMs: clipDurationMs,
        offsetInAssetMs: trimMs,
      });

      await timelineQuery.refetch();
      setActionError(null);
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to save recording."));
    } finally {
      setTransportRecordSaving(false);
    }
  };

  const handleTransportRecordStart = async () => {
    if (transportRecording || transportRecordSaving) return;
    if (!selectedWorkspaceId) {
      setActionError("Select a workspace first.");
      return;
    }

    const armedChannels = channels.filter((channel) => channel.armed);
    if (armedChannels.length === 0) {
      setActionError("Arm a track before recording.");
      return;
    }
    if (armedChannels.length > 1) {
      setActionError("Arm only one track for timeline recording.");
      return;
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
      setActionError("Recording is not supported in this browser.");
      return;
    }

    try {
      let stream: MediaStream | null = null;
      const storedDeviceId =
        typeof window !== "undefined"
          ? (window.localStorage.getItem("fv-settings-audio-input") ?? "")
          : "";
      if (storedDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: storedDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch {
          stream = null;
        }
      }
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }
      if (!stream) {
        throw new Error("Unable to access microphone.");
      }

      const armedTrackId = armedChannels[0].id;
      const startAtMs = Math.max(0, Math.min(playheadMs, timelineDurationMs));
      const countInMs =
        playbackState === "stopped" && countInBars > 0
          ? countInBars * 4 * (60000 / Math.max(1, tempo))
          : 0;

      const mimeType = pickRecordingMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      transportRecordStreamRef.current = stream;
      transportRecorderRef.current = recorder;
      transportRecordChunksRef.current = [];
      transportRecordTrackIdRef.current = armedTrackId;
      transportRecordStartMsRef.current = startAtMs;
      transportRecordTrimMsRef.current = 0;
      transportRecordAwaitingPlaybackRef.current = playbackState !== "playing";
      transportRecordStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          transportRecordChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setActionError("Transport recording failed.");
      };

      recorder.onstop = () => {
        const chunks = [...transportRecordChunksRef.current];
        const trackId = transportRecordTrackIdRef.current;
        const startMs = transportRecordStartMsRef.current;
        const trimMs = transportRecordTrimMsRef.current;
        const durationMs = Math.max(
          1,
          Date.now() - transportRecordStartedAtRef.current,
        );
        const activeMimeType = recorder.mimeType || mimeType || "audio/webm";

        setTransportRecording(false);
        transportRecordTrackIdRef.current = null;
        transportRecordTrimMsRef.current = 0;
        transportRecordAwaitingPlaybackRef.current = false;
        releaseTransportRecorder();

        if (!trackId) return;
        if (chunks.length === 0) {
          setActionError("No audio captured.");
          return;
        }
        void finalizeTransportRecording({
          chunks,
          trackId,
          startMs,
          trimMs,
          mimeType: activeMimeType,
          durationMs,
        });
      };

      recorder.start(250);
      setTransportRecording(true);
      setActionError(null);

      if (playbackState === "paused") {
        await resumePlayback();
      } else if (playbackState === "stopped") {
        const endOffsetMs =
          loopEnabled && loopEndMs > startAtMs ? loopEndMs : undefined;
        if (countInMs > 0) {
          if (countInTimeoutRef.current) {
            window.clearTimeout(countInTimeoutRef.current);
          }
          setCountInActive(true);
          countInTimeoutRef.current = window.setTimeout(() => {
            setCountInActive(false);
            countInTimeoutRef.current = null;
            void startPlayback({
              startOffsetMs: startAtMs,
              endOffsetMs,
            });
          }, countInMs);
        } else {
          await startPlayback({
            startOffsetMs: startAtMs,
            endOffsetMs,
          });
        }
      }
    } catch (error) {
      setActionError(getErrorMessage(error, "Microphone access was denied."));
      stopTransportRecording();
      transportRecordAwaitingPlaybackRef.current = false;
      setTransportRecording(false);
    }
  };

  const toggleChannel = (
    id: string,
    key: "armed" | "monitor" | "muted" | "solo",
  ) => {
    const target = channels.find((channel) => channel.id === id);
    if (!target) return;
    const nextValue = !target[key];
    setChannels((current) =>
      current.map((channel) =>
        channel.id === id ? { ...channel, [key]: nextValue } : channel,
      ),
    );

    if (key === "muted") {
      commitTrackUpdate(id, { mute: nextValue });
    }
    if (key === "solo") {
      commitTrackUpdate(id, { solo: nextValue });
    }
  };

  const updateChannel = (id: string, key: "gain" | "pan", value: number) => {
    setChannels((current) =>
      current.map((channel) =>
        channel.id === id ? { ...channel, [key]: value } : channel,
      ),
    );
    if (key === "gain") {
      scheduleTrackUpdate(id, { gainDb: value });
    }
    if (key === "pan") {
      scheduleTrackUpdate(id, { pan: value });
    }
  };

  const handleTransportSeek = (targetMs: number) => {
    const clamped = Math.max(0, Math.min(targetMs, timelineDurationMs));
    setPlayheadMs(clamped);

    if (playbackState === "playing") {
      const endOffsetMs =
        loopEnabled && loopEndMs > clamped ? loopEndMs : undefined;
      void startPlayback({
        startOffsetMs: clamped,
        endOffsetMs,
      });
    }
  };

  const handleRecordToggle = () => {
    if (transportRecordSaving) return;
    if (transportRecording) {
      stopTransportRecording();
      return;
    }
    void handleTransportRecordStart();
  };

  const handleExportSubmit = async (payload: ExportPerformanceMp4Input) => {
    if (!projectId) {
      setExportError("Missing project id.");
      return;
    }

    setExportError(null);
    try {
      const result = await exportMutation.mutateAsync(payload);
      downloadBlob(result.blob, result.fileName);
      setExportDialogOpen(false);
    } catch (error) {
      setExportError(getErrorMessage(error, "Failed to export project."));
    }
  };

  return (
    <section className="min-h-[70vh] rounded-xl border border-border bg-background/60 p-6">
      <TransportTimeline
        tempo={tempo}
        onTempoChange={(value) => setTempo(Math.max(40, Math.min(260, value)))}
        playbackState={playbackState}
        playbackLoading={playbackLoading}
        playheadMs={playheadMs}
        durationMs={timelineDurationMs}
        timeDisplayMode={timeDisplayMode}
        onTimeDisplayModeChange={setTimeDisplayMode}
        metronomeEnabled={metronomeEnabled}
        onMetronomeToggle={() => setMetronomeEnabled((current) => !current)}
        countInBars={countInBars}
        onCountInBarsChange={setCountInBars}
        countInActive={countInActive}
        loopEnabled={loopEnabled}
        loopStartMs={loopStartMs}
        loopEndMs={loopEndMs}
        onLoopEnabledChange={setLoopEnabled}
        onLoopStartMsChange={(value) => {
          const nextStart = Math.max(0, Math.min(value, loopEndMs - 100));
          setLoopStartMs(nextStart);
        }}
        onLoopEndMsChange={(value) => {
          const nextEnd = Math.max(loopStartMs + 100, value);
          setLoopEndMs(Math.min(nextEnd, timelineDurationMs));
        }}
        isRecording={transportRecording}
        onRecordToggle={handleRecordToggle}
        onPlayPause={() => {
          void handlePlayPause();
        }}
        onStop={() => {
          void handleStopAll();
        }}
        onSeek={handleTransportSeek}
        clipRegions={transportClipRegions}
        clipTool={timelineClipTool}
        onClipToolChange={setTimelineClipTool}
        onClipMove={(clipId, startMs) => {
          void handleTimelineClipMove(clipId, startMs);
        }}
        onClipCut={(clipId, cutAtMs) => {
          void handleTimelineClipCut(clipId, cutAtMs);
        }}
        onClipDuplicate={(clipId) => {
          void handleTimelineClipDuplicate(clipId);
        }}
        onClipDelete={(clipId) => {
          void handleTimelineClipDelete(clipId);
        }}
        clipInteractionDisabled={
          timelineClipActionPending ||
          playbackLoading ||
          transportRecordSaving ||
          playbackState !== "stopped"
        }
      />

      <MixerHeader
        projectName={project?.name ?? "Performance Zone"}
        sampleRate={project?.sampleRate ?? null}
        armedCount={armedCount}
        onExport={() => {
          setExportError(null);
          setExportDialogOpen(true);
        }}
        exportDisabled={
          !project ||
          timelineQuery.isLoading ||
          exportMutation.isPending ||
          playbackState !== "stopped" ||
          transportRecordSaving
        }
        exporting={exportMutation.isPending}
      />

      <div className="grid gap-6">
        <TracksBoard
          channels={channels}
          tracksById={tracksById}
          timelineLoading={timelineQuery.isLoading}
          timelineError={timelineQuery.isError}
          actionError={actionError}
          selectedWorkspaceId={selectedWorkspaceId ?? null}
          hasProject={!!project}
          playbackLoading={playbackLoading}
          deleteClipPending={clipDeletePending}
          onOpenCreateTrack={handleOpenCreateTrack}
          onOpenCreateClip={handleOpenCreateClip}
          onOpenEditTrack={handleOpenEditTrack}
          onDeleteTrack={(trackId) => {
            void handleDeleteTrack(trackId);
          }}
          onToggleChannel={toggleChannel}
          onUpdateChannel={updateChannel}
          onPlayTrack={(trackId) => {
            void handlePlayTrack(trackId);
          }}
          onOpenEditClip={handleOpenEditClip}
          onDeleteClip={(clipId) => {
            void handleDeleteClip(clipId);
          }}
        />
      </div>

      <TrackDialog
        open={trackDialogOpen}
        onOpenChange={handleTrackDialogOpenChange}
        editingTrack={editingTrack}
        trackForm={trackForm}
        setTrackForm={setTrackForm}
        trackFormError={trackFormError}
        onSubmit={handleTrackSubmit}
        submitting={
          createTrackMutation.isPending || updateTrackMutation.isPending
        }
      />

      <ClipDialog
        open={clipDialogOpen}
        onOpenChange={handleClipDialogOpenChange}
        clipTrackName={clipTrack?.name ?? "this track"}
        onSubmit={handleClipSubmit}
        clipRecording={clipRecording}
        clipUploadStep={clipUploadStep}
        clipRecordingUrl={clipRecordingUrl}
        clipInputLevel={clipInputLevel}
        clipRecordingError={clipRecordingError}
        clipMetadataLoading={clipMetadataLoading}
        clipBusyLabel={clipBusyLabel}
        clipBusy={clipBusy}
        clipForm={clipForm}
        clipFormError={clipFormError}
        setClipForm={setClipForm}
        onClipFileChange={(file) => {
          void handleClipFileChange(file);
        }}
        onClipRecordStart={() => {
          void handleClipRecordStart();
        }}
        onClipRecordStop={handleClipRecordStop}
        onClearRecording={() => {
          if (clipRecordingUrl) {
            URL.revokeObjectURL(clipRecordingUrl);
            setClipRecordingUrl(null);
          }
          void handleClipFileChange(null);
        }}
      />

      <EditClipDialog
        open={editClipDialogOpen}
        onOpenChange={handleEditClipDialogOpenChange}
        onSubmit={handleEditClipSubmit}
        editClipForm={editClipForm}
        setEditClipForm={setEditClipForm}
        editClipError={editClipError}
      />

      <ExportProjectDialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          setExportDialogOpen(open);
          if (!open) {
            setExportError(null);
          }
        }}
        projectName={project?.name ?? "performance-export"}
        submitting={exportMutation.isPending}
        error={exportError}
        onSubmit={handleExportSubmit}
      />

      <Dialog
        open={!!clipDeleteTarget}
        onOpenChange={handleClipDeleteDialogOpenChange}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!clipDeletePending}>
          <DialogHeader>
            <DialogTitle>Delete clip?</DialogTitle>
            <DialogDescription>{clipDeleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setClipDeleteTarget(null)}
              disabled={clipDeletePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void handleConfirmDeleteClip();
              }}
              disabled={clipDeletePending}
            >
              {clipDeletePending ? "Deleting..." : "Delete clip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
