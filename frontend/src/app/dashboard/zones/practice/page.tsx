"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListChecks, Flame } from "lucide-react";
import { createMdComponents } from "@/components/note-editor/utils/markdown-components";
import { ActiveStateView } from "./components/active-state-view";
import { CompleteStateView } from "./components/complete-state-view";
import { IdleStateView } from "./components/idle-state-view";
import type {
  FocusSession,
  FocusTarget,
  NoteContent,
  PracticeItem,
  PracticePlan,
  SongContent,
  SongTab,
  StatsOverview,
  TabRevision,
  TabScore,
  TargetStats,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_API ?? "http://localhost:4000";


const metricOptions = [
  { value: "NONE", label: "None" },
  { value: "BPM", label: "BPM" },
  { value: "ACCURACY", label: "Accuracy" },
  { value: "REPS", label: "Reps" },
  { value: "NOTES", label: "Notes" },
];

const difficultyOptions = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const categoryMetricMap: Record<string, string> = {
  WARMUP: "BPM",
  CHORDS: "BPM",
  SCALES: "BPM",
  SONGS: "BPM",
  THEORY: "ACCURACY",
  EAR_TRAINING: "ACCURACY",
  COOL_DOWN: "NONE",
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function formatDuration(totalSeconds?: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (minutes <= 0) return `${seconds}s`;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function computeDuration(session: FocusSession) {
  if (session.durationSec !== null && session.durationSec !== undefined) {
    return session.durationSec;
  }
  if (!session.endedAt) return 0;
  return Math.max(
    0,
    Math.floor(
      (new Date(session.endedAt).getTime() -
        new Date(session.startedAt).getTime()) /
        1000,
    ),
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function timeToColumn(time: string, beatsPerMeasure: number, subdivs: number) {
  const [m, b, s] = time.split(":").map((n) => parseInt(n, 10) || 0);
  const colsPerBeat = subdivs;
  const colsPerMeasure = beatsPerMeasure * colsPerBeat;
  return m * colsPerMeasure + b * colsPerBeat + s;
}

function scoreToGrid(score: TabScore): {
  grid: (number | null)[][];
  columns: number;
  strings: string[];
} {
  const m = score.measures?.[0];
  const strings = score.tuning?.length
    ? [...score.tuning]
    : ["E4", "B3", "G3", "D3", "A2", "E2"];
  if (!m) {
    return {
      grid: Array.from({ length: strings.length }, () =>
        Array.from({ length: 16 }, () => null),
      ),
      columns: 16,
      strings,
    };
  }
  const colsPerMeasure = m.beatsPerMeasure * m.subdivisions;
  let maxCol = colsPerMeasure - 1;
  for (const e of m.events) {
    const c = timeToColumn(e.time, m.beatsPerMeasure, m.subdivisions);
    if (c > maxCol) maxCol = c;
  }
  const columns = Math.max(maxCol + 1, colsPerMeasure);
  const grid: (number | null)[][] = Array.from({ length: strings.length }, () =>
    Array.from({ length: columns }, () => null),
  );

  for (const e of m.events) {
    const col = timeToColumn(e.time, m.beatsPerMeasure, m.subdivisions);
    for (const note of e.notes) {
      const row = strings.length - note.string;
      if (row >= 0 && row < strings.length && col >= 0 && col < columns) {
        grid[row][col] = note.fret;
      }
    }
  }
  return { grid, columns, strings };
}

function gridToAscii(
  grid: (number | null)[][],
  strings: string[],
  columns: number,
) {
  const label = (s: string) => s.padEnd(3, " ");
  const lines: string[] = [];
  for (let r = 0; r < strings.length; r++) {
    let line = `${label(strings[r])}|`;
    for (let c = 0; c < columns; c++) {
      const f = grid[r][c];
      if (f === null || f === undefined) line += "-";
      else line += String(f);
    }
    line += "|";
    lines.push(line);
  }
  return lines.join("\n");
}

export default function PracticeZonePage() {
  const router = useRouter();
  const { selectedWorkspaceId, workspacesQuery } = useSelectedWorkspace();

  const [plans, setPlans] = useState<PracticePlan[]>([]);
  const [targets, setTargets] = useState<FocusTarget[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTargetStats, setLoadingTargetStats] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [targetStats, setTargetStats] = useState<TargetStats | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [activeItem, setActiveItem] = useState<PracticeItem | null>(null);

  const [linkedNote, setLinkedNote] = useState<NoteContent | null>(null);
  const [linkedSong, setLinkedSong] = useState<SongContent | null>(null);
  const [linkedTabs, setLinkedTabs] = useState<SongTab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [selectedTabRevision, setSelectedTabRevision] =
    useState<TabRevision | null>(null);
  const [selectedTabAscii, setSelectedTabAscii] = useState<string | null>(null);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [loadingTab, setLoadingTab] = useState(false);

  const [metricType, setMetricType] = useState("NONE");
  const [metricValue, setMetricValue] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [finalDurationSec, setFinalDurationSec] = useState<number | null>(null);

  const selectedPlan = useMemo(() => {
    const id = Number(selectedPlanId);
    if (!id) return null;
    return plans.find((plan) => plan.id === id) ?? null;
  }, [plans, selectedPlanId]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((item) => item.id === selectedItemId) ?? null;
  }, [items, selectedItemId]);

  const selectedItemTargetKey = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.targetType && selectedItem.targetRefId) {
      return { type: selectedItem.targetType, refId: selectedItem.targetRefId };
    }
    return { type: "DRILL", refId: String(selectedItem.id) };
  }, [selectedItem]);

  const selectedTarget = useMemo(() => {
    if (!selectedItemTargetKey) return null;
    return (
      targets.find(
        (target) =>
          target.type === selectedItemTargetKey.type &&
          target.refId === selectedItemTargetKey.refId,
      ) ?? null
    );
  }, [targets, selectedItemTargetKey]);

  const viewState = showReflection
    ? "complete"
    : activeSessionId
      ? "active"
      : "idle";

  const lastSession = useMemo(() => {
    if (!sessions.length) return null;
    return [...sessions].sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )[0];
  }, [sessions]);

  const personalBestEntry = useMemo(() => {
    if (!targetStats) return null;
    const entries = Object.entries(targetStats.personalBest);
    if (!entries.length) return null;
    const matching = entries.find(([key]) => key === metricType);
    if (matching) {
      const [key, value] = matching;
      return { key, value };
    }
    const [key, value] = entries[0];
    return { key, value };
  }, [metricType, targetStats]);

  const contentItem = activeSessionId ? activeItem ?? selectedItem : selectedItem;
  const mdComponents = useMemo(() => createMdComponents({}), []);
  const selectedTab = useMemo(() => {
    if (!selectedTabId) return null;
    return linkedTabs.find((tab) => tab.id === selectedTabId) ?? null;
  }, [linkedTabs, selectedTabId]);

  const trendDelta = useMemo(() => {
    if (!targetStats?.trend?.length) return null;
    const sorted = [...targetStats.trend].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first.value === null || last.value === null) return null;
    const delta = last.value - first.value;
    return {
      delta,
      metric: targetStats.trendMetricType,
      from: first.value,
      to: last.value,
    };
  }, [targetStats]);

  const trendDeltaLabel = trendDelta
    ? trendDelta.delta == 0
      ? `0 ${trendDelta.metric}`
      : `${trendDelta.delta > 0 ? "+" : ""}${trendDelta.delta} ${trendDelta.metric}`
    : "No trend yet";

  const trendDeltaClass = trendDelta
    ? trendDelta.delta > 0
      ? "text-emerald-500"
      : trendDelta.delta < 0
        ? "text-rose-500"
        : "text-muted-foreground"
    : "text-muted-foreground";

  const streakLabel = overview?.currentStreak
    ? `${overview.currentStreak} day${overview.currentStreak === 1 ? "" : "s"}`
    : "No streak yet";

  const personalBestLabel = personalBestEntry
    ? `${personalBestEntry.key} ${personalBestEntry.value}`
    : "No PB yet";

  const lastSessionLabel = lastSession
    ? `Last: ${formatDateTime(lastSession.startedAt)}`
    : "No sessions yet";

  const loadPlans = useCallback(async (workspaceId: string) => {
    setLoadingPlans(true);
    try {
      const data = await http<PracticePlan[]>("/practice-plans");
      const filtered = data.filter((plan) => plan.workspaceId === workspaceId);
      setPlans(filtered);
      setSelectedPlanId((prev) => {
        if (!filtered.length) return "";
        if (prev && filtered.some((plan) => String(plan.id) === prev)) {
          return prev;
        }
        return String(filtered[0].id);
      });
    } catch (error) {
      console.error(error);
      setPlans([]);
      setSelectedPlanId("");
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const loadTargets = useCallback(async (workspaceId: string) => {
    try {
      const data = await http<FocusTarget[]>(
        `/focus-targets?workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      setTargets(data);
    } catch (error) {
      console.error(error);
      setTargets([]);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const query = `?from=${encodeURIComponent(
        from.toISOString(),
      )}&to=${encodeURIComponent(to.toISOString())}`;
      const data = await http<StatsOverview>(`/stats/overview${query}`);
      setOverview(data);
    } catch (error) {
      console.error(error);
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadSessions = useCallback(async (targetId: string, item?: PracticeItem | null) => {
    setLoadingSessions(true);
    try {
      const data = await http<FocusSession[]>(
        `/focus-sessions?targetId=${encodeURIComponent(targetId)}`,
      );
      setSessions(data);
      const active = data.find((session) => !session.endedAt);
      if (active) {
        setActiveSessionId(active.id);
        setActiveTargetId(active.targetId);
        setActiveStartedAt(new Date(active.startedAt).getTime());
        setActiveItem(item ?? null);
      } else {
        setActiveSessionId(null);
        setActiveTargetId(null);
        setActiveStartedAt(null);
        setActiveItem(null);
        setElapsedSec(0);
      }
    } catch (error) {
      console.error(error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadTargetStats = useCallback(async (targetId: string) => {
    setLoadingTargetStats(true);
    try {
      const data = await http<TargetStats>(
        `/stats/targets/${encodeURIComponent(targetId)}?limit=10`,
      );
      setTargetStats(data);
    } catch (error) {
      console.error(error);
      setTargetStats(null);
    } finally {
      setLoadingTargetStats(false);
    }
  }, []);

  const loadItems = useCallback(async (planId: number) => {
    setLoadingItems(true);
    try {
      const data = await http<PracticeItem[]>(
        `/practice-items/plans/${encodeURIComponent(String(planId))}`,
      );
      const sorted = [...data].sort((a, b) => a.order - b.order);
      setItems(sorted);
      setSelectedItemId((prev) => {
        if (prev && sorted.some((item) => item.id === prev)) return prev;
        return sorted[0]?.id ?? null;
      });
    } catch (error) {
      console.error(error);
      setItems([]);
      setSelectedItemId(null);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const ensureTargetForItem = useCallback(
    async (item: PracticeItem, workspaceId: string) => {
      const type =
        item.targetType && item.targetRefId ? item.targetType : "DRILL";
      const refId =
        item.targetType && item.targetRefId
          ? item.targetRefId
          : String(item.id);

      const existing = targets.find(
        (target) => target.type === type && target.refId === refId,
      );
      if (existing) return existing;

      const created = await http<FocusTarget>("/focus-targets", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          type,
          refId,
          title: item.title,
        }),
      });
      setTargets((prev) => [created, ...prev]);
      return created;
    },
    [targets],
  );

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    loadPlans(selectedWorkspaceId);
    loadTargets(selectedWorkspaceId);
    loadOverview();
  }, [selectedWorkspaceId, loadPlans, loadTargets, loadOverview]);

  useEffect(() => {
    if (!selectedTarget?.id) {
      setSessions([]);
      setTargetStats(null);
      return;
    }
    loadSessions(selectedTarget.id, selectedItem);
    loadTargetStats(selectedTarget.id);
  }, [selectedTarget?.id, selectedItem, loadSessions, loadTargetStats]);

  useEffect(() => {
    if (!selectedPlan) {
      setItems([]);
      setSelectedItemId(null);
      return;
    }
    loadItems(selectedPlan.id);
  }, [selectedPlan, loadItems]);

  useEffect(() => {
    if (!selectedItem) return;
    const nextMetric = categoryMetricMap[selectedItem.category] ?? "NONE";
    setMetricType(nextMetric);
  }, [selectedItem]);

  useEffect(() => {
    let cancelled = false;

    async function loadLinked() {
      if (!contentItem || !selectedWorkspaceId) {
        setLinkedNote(null);
        setLinkedSong(null);
        setLinkedTabs([]);
        setSelectedTabId(null);
        setSelectedTabRevision(null);
        setSelectedTabAscii(null);
        return;
      }

      const { targetType, targetRefId } = contentItem;
      if (!targetType || !targetRefId) {
        setLinkedNote(null);
        setLinkedSong(null);
        setLinkedTabs([]);
        setSelectedTabId(null);
        setSelectedTabRevision(null);
        setSelectedTabAscii(null);
        return;
      }

      setLoadingLinked(true);
      try {
        if (targetType === "NOTE") {
          const note = await http<NoteContent>(
            `/workspaces/${encodeURIComponent(
              selectedWorkspaceId,
            )}/notes/${encodeURIComponent(targetRefId)}`,
          );
          if (!cancelled) {
            setLinkedNote(note);
            setLinkedSong(null);
            setLinkedTabs([]);
            setSelectedTabId(null);
            setSelectedTabRevision(null);
            setSelectedTabAscii(null);
          }
          return;
        }

        if (targetType === "SONG") {
          const songId = Number(targetRefId);
          if (Number.isNaN(songId)) {
            throw new Error("Invalid song id");
          }
          const [song, tabs] = await Promise.all([
            http<SongContent>(`/songs/${encodeURIComponent(String(songId))}`),
            http<SongTab[]>(`/tabs/song/${encodeURIComponent(String(songId))}`),
          ]);
          if (!cancelled) {
            setLinkedSong(song);
            setLinkedTabs(tabs ?? []);
            setSelectedTabId((prev) => {
              if (prev && tabs?.some((tab) => tab.id === prev)) return prev;
              return tabs?.[0]?.id ?? null;
            });
            setSelectedTabRevision(null);
            setSelectedTabAscii(null);
            setLinkedNote(null);
          }
          return;
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLinkedNote(null);
          setLinkedSong(null);
          setLinkedTabs([]);
          setSelectedTabId(null);
          setSelectedTabRevision(null);
          setSelectedTabAscii(null);
        }
      } finally {
        if (!cancelled) setLoadingLinked(false);
      }
    }

    loadLinked();
    return () => {
      cancelled = true;
    };
  }, [contentItem, selectedWorkspaceId]);

  useEffect(() => {
    let cancelled = false;

    async function loadTabRevision() {
      if (!selectedTabId) {
        setSelectedTabRevision(null);
        setSelectedTabAscii(null);
        setLoadingTab(false);
        return;
      }

      setLoadingTab(true);
      try {
        const revisions = await http<TabRevision[]>(
          `/tab-revisions/tab/${encodeURIComponent(String(selectedTabId))}`,
        );
        const latest = revisions?.[0] ?? null;
        if (!cancelled) {
          setSelectedTabRevision(latest);
          if (latest?.score) {
            const { grid, columns, strings } = scoreToGrid(latest.score);
            setSelectedTabAscii(gridToAscii(grid, strings, columns));
          } else {
            setSelectedTabAscii(null);
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSelectedTabRevision(null);
          setSelectedTabAscii(null);
        }
      } finally {
        if (!cancelled) setLoadingTab(false);
      }
    }

    loadTabRevision();
    return () => {
      cancelled = true;
    };
  }, [selectedTabId]);

  useEffect(() => {
    if (!activeStartedAt) {
      setElapsedSec(0);
      return;
    }

    const tick = () => {
      setElapsedSec(
        Math.max(0, Math.floor((Date.now() - activeStartedAt) / 1000)),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeStartedAt]);

  useEffect(() => {
    if (activeSessionId) return;
    setShowReflection(false);
    setFinalDurationSec(null);
  }, [activeSessionId]);

  const handleStart = async () => {
    if (!selectedPlan || !selectedItem || !selectedWorkspaceId) return;
    setStarting(true);
    try {
      const target = await ensureTargetForItem(
        selectedItem,
        selectedWorkspaceId,
      );
      const result = await http<{ sessionId: string }>("/focus-sessions/start", {
        method: "POST",
        body: JSON.stringify({ targetId: target.id }),
      });
      setActiveSessionId(result.sessionId);
      setActiveTargetId(target.id);
      setActiveStartedAt(Date.now());
      setActiveItem(selectedItem);
      await loadSessions(target.id, selectedItem);
      await loadTargetStats(target.id);
    } catch (error) {
      console.error(error);
    } finally {
      setStarting(false);
    }
  };

  const handleEndClick = () => {
    if (!activeSessionId) return;
    setFinalDurationSec(elapsedSec);
    setShowReflection(true);
  };

  const handleSaveReflection = async () => {
    if (!activeSessionId) return;
    setEnding(true);
    try {
      const payload: Record<string, unknown> = {
        metricType,
      };
      if (metricType !== "NONE" && metricValue.trim()) {
        payload.metricValue = Number(metricValue);
      }
      if (difficulty) payload.difficulty = difficulty;
      if (notes.trim()) payload.notes = notes.trim();

      await http(`/focus-sessions/${activeSessionId}/end`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setActiveSessionId(null);
      setActiveTargetId(null);
      setActiveStartedAt(null);
      setElapsedSec(0);
      setMetricType(
        selectedItem ? categoryMetricMap[selectedItem.category] ?? "NONE" : "NONE",
      );
      setMetricValue("");
      setDifficulty("");
      setNotes("");
      setShowReflection(false);
      setFinalDurationSec(null);
      setActiveItem(null);

      if (activeTargetId) {
        await loadSessions(activeTargetId, activeItem);
        await loadTargetStats(activeTargetId);
      }
      await loadOverview();
    } catch (error) {
      console.error(error);
    } finally {
      setEnding(false);
    }
  };

  const canStart = Boolean(selectedPlan && selectedItem && !activeSessionId);
  const canEnd = Boolean(activeSessionId);
  const metricLabel =
    metricOptions.find((option) => option.value === metricType)?.label ??
    metricType;
  const targetTitle =
    activeItem?.title ?? selectedItem?.title ?? selectedPlan?.name ?? "Select a plan";
  const lastPracticedLabel = lastSession
    ? formatDateTime(lastSession.startedAt)
    : "Never";
  const selectedPersonalBestLabel = personalBestEntry
    ? `${personalBestEntry.key} ${personalBestEntry.value}`
    : "-";
  const elapsedLabel = formatDuration(elapsedSec);
  const reflectionDurationLabel = formatDuration(finalDurationSec ?? elapsedSec);

  const handleMetricTypeChange = (value: string) => {
    setMetricType(value);
    if (value === "NONE") setMetricValue("");
  };

  const handleReflectionBack = () => {
    setShowReflection(false);
    setFinalDurationSec(null);
  };

  const handleOpenTab = (tabId: number) => {
    router.push(`/dashboard/song-library/tabs/${tabId}`);
  };

  const headerCopy = {
    idle: {
      title: "Practice Zone",
      subtitle: "What are you practicing?",
    },
    active: {
      title: "Focus Session",
      subtitle: "Shut up and practice.",
    },
    complete: {
      title: "Session Complete",
      subtitle: "Reflect on what happened and review your progress.",
    },
  } as const;
  const header = headerCopy[viewState];

  const overviewCard = (
    <Card className="border bg-background/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Momentum</CardTitle>
        <Flame className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="grid gap-4">
        {loadingOverview ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading overview...
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Trend change</p>
                <p className={`text-lg font-semibold ${trendDeltaClass}`}>
                  {trendDeltaLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {trendDelta
                    ? `From ${trendDelta.from} to ${trendDelta.to}`
                    : "Need more sessions"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Current streak</p>
                <p className="text-lg font-semibold">{streakLabel}</p>
                <p className="text-xs text-muted-foreground">Keep the chain alive</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Personal best</p>
                <p className="text-lg font-semibold">{personalBestLabel}</p>
                <p className="text-xs text-muted-foreground">{lastSessionLabel}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Consistency (30 days)</p>
              {overview?.mostPracticedTargets?.length ? (
                <div className="space-y-2">
                  {overview.mostPracticedTargets.map((target, index) => (
                    <div
                      key={target.targetId}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{target.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {target.sessionCount} sessions in 30 days
                        </p>
                      </div>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No activity yet.</div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const targetStatsCard = (
    <Card className="border bg-background/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Target Progress</CardTitle>
        <ListChecks className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingTargetStats ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading target stats...
          </div>
        ) : targetStats ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Trend change</p>
              <p className={`text-lg font-semibold ${trendDeltaClass}`}>
                {trendDeltaLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {trendDelta
                  ? `From ${trendDelta.from} to ${trendDelta.to}`
                  : "Need more sessions"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Personal best</p>
              <p className="text-lg font-semibold">{personalBestLabel}</p>
              <p className="text-xs text-muted-foreground">{lastSessionLabel}</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Select a plan to see target stats.</div>
        )}
      </CardContent>
    </Card>
  );

  const recentSessionsCard = (
    <Card className="border bg-background/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Sessions</CardTitle>
        <Badge variant="outline">{sessions.length}</Badge>
      </CardHeader>
      <CardContent>
        {loadingSessions ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sessions...
          </div>
        ) : sessions.length ? (
          <div className="space-y-2">
            {sessions.slice(0, 8).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{formatDateTime(session.startedAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(computeDuration(session))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Metric</p>
                  <p className="text-sm font-medium">
                    {session.metricType !== "NONE"
                      ? `${session.metricType}${
                          session.metricValue !== null ? ` ${session.metricValue}` : ""
                        }`
                      : "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No sessions yet for this target.</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <section className="min-h-[70vh] rounded-xl border border-border bg-background/60 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{header.title}</h1>
          <p className="text-sm text-muted-foreground">{header.subtitle}</p>
        </div>
        {viewState !== "active" ? (
          <div className="w-full md:w-64">
            <WorkspaceSwitcher />
          </div>
        ) : null}
      </div>

      {viewState === "idle" ? (
        <IdleStateView
          loadingPlans={loadingPlans}
          loadingWorkspaces={workspacesQuery.isLoading}
          plans={plans}
          selectedPlanId={selectedPlanId}
          onPlanChange={setSelectedPlanId}
          onCreatePlan={() => router.push("/dashboard/practice/new")}
          loadingItems={loadingItems}
          items={items}
          selectedItemId={selectedItemId}
          onSelectItem={(id) => setSelectedItemId(id)}
          targetTitle={targetTitle}
          lastPracticedLabel={lastPracticedLabel}
          personalBestLabel={selectedPersonalBestLabel}
          canStart={canStart}
          starting={starting}
          onStart={handleStart}
          hasSelectedPlan={Boolean(selectedPlan)}
          overviewCard={overviewCard}
          targetStatsCard={targetStatsCard}
          recentSessionsCard={recentSessionsCard}
        />
      ) : null}

      {viewState === "active" ? (
        <ActiveStateView
          loadingLinked={loadingLinked}
          linkedNote={linkedNote}
          linkedSong={linkedSong}
          linkedTabs={linkedTabs}
          selectedTabId={selectedTabId}
          onSelectTabId={setSelectedTabId}
          selectedTab={selectedTab}
          selectedTabAscii={selectedTabAscii}
          selectedTabRevision={selectedTabRevision}
          loadingTab={loadingTab}
          onOpenTab={handleOpenTab}
          mdComponents={mdComponents}
          elapsedLabel={elapsedLabel}
          targetTitle={targetTitle}
          metricLabel={metricLabel}
          onEnd={handleEndClick}
          canEnd={canEnd}
        />
      ) : null}

      {viewState === "complete" ? (
        <CompleteStateView
          targetTitle={targetTitle}
          durationLabel={reflectionDurationLabel}
          metricType={metricType}
          metricValue={metricValue}
          onMetricTypeChange={handleMetricTypeChange}
          onMetricValueChange={setMetricValue}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          notes={notes}
          onNotesChange={setNotes}
          metricOptions={metricOptions}
          difficultyOptions={difficultyOptions}
          onSave={handleSaveReflection}
          saving={ending}
          onBack={handleReflectionBack}
          canEnd={canEnd}
          overviewCard={overviewCard}
          targetStatsCard={targetStatsCard}
          recentSessionsCard={recentSessionsCard}
        />
      ) : null}
    </section>
  );
}
