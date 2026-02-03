"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Eye, Save, Copy, RotateCcw } from "lucide-react";

// ---------------------- Types ----------------------
type TabRow = (number | null)[];
type Grid = TabRow[];

type Score = {
  version: number;
  tuning: string[];
  capo?: number | null;
  tempo?: number | null;
  timeSignature?: [number, number] | null;
  measures: {
    index: number;
    beatsPerMeasure: number;
    subdivisions: number;
    events: {
      time: string;
      notes: {
        string: number;
        fret: number;
        duration?: string;
        tech?: string[];
      }[];
    }[];
  }[];
};

type Revision = {
  id: number;
  tabId: number;
  number: number;
  message: string | null;
  score: Score;
  createdBy: number;
  createdAt: string;
};

type TabMeta = {
  id: number;
  songId: number;
  title: string;
  tuning: string;
  tempo: number | null;
  timeSigTop: number | null;
  timeSigBot: number | null;
  capo: number | null;
  currentRev: number | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------- Helpers ----------------------
function timeToColumn(time: string, beatsPerMeasure: number, subdivs: number) {
  const [m, b, s] = time.split(":").map((n) => parseInt(n, 10) || 0);
  const colsPerBeat = subdivs;
  const colsPerMeasure = beatsPerMeasure * colsPerBeat;
  return m * colsPerMeasure + b * colsPerBeat + s;
}

function scoreToGrid(score: Score): {
  grid: Grid;
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
  const grid: Grid = Array.from({ length: strings.length }, () =>
    Array.from({ length: columns }, () => null),
  );

  for (const e of m.events) {
    const col = timeToColumn(e.time, m.beatsPerMeasure, m.subdivisions);
    for (const note of e.notes) {
      // note.string uses 1 = top (high E)
      const row = strings.length - note.string;
      if (row >= 0 && row < strings.length && col >= 0 && col < columns) {
        grid[row][col] = note.fret;
      }
    }
  }
  return { grid, columns, strings };
}

function gridToScore(
  grid: Grid,
  strings: string[],
  tempo: number | null,
  sig: [number, number] | null,
): Score {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  const beatsPerMeasure = sig?.[0] ?? 4;
  const subdivs = 4; // 16ths
  const events: Score["measures"][0]["events"] = [];

  for (let c = 0; c < columns; c++) {
    const notes: { string: number; fret: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const fret = grid[r][c];
      if (typeof fret === "number") {
        notes.push({ string: rows - r, fret });
      }
    }
    if (notes.length) {
      const colsPerMeasure = beatsPerMeasure * subdivs;
      const m = Math.floor(c / colsPerMeasure);
      const within = c % colsPerMeasure;
      const b = Math.floor(within / subdivs);
      const s = within % subdivs;
      events.push({ time: `${m}:${b}:${s}`, notes });
    }
  }

  return {
    version: 1,
    tuning: [...strings],
    capo: 0,
    tempo: tempo ?? null,
    timeSignature: sig ?? [4, 4],
    measures: [{ index: 0, beatsPerMeasure, subdivisions: subdivs, events }],
  };
}

function gridToAscii(grid: Grid, strings: string[], columns: number) {
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

export default function TabViewPage() {
  const params = useParams<{ id: string }>();
  const tabId = Number(params.id);

  const [tab, setTab] = useState<TabMeta | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [latest, setLatest] = useState<Revision | null>(null);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // editor state
  const [strings, setStrings] = useState<string[]>([
    "E4",
    "B3",
    "G3",
    "D3",
    "A2",
    "E2",
  ]);
  const [columns, setColumns] = useState<number>(32);
  const [grid, setGrid] = useState<Grid>(() =>
    Array.from({ length: 6 }, () => Array.from({ length: 32 }, () => null)),
  );

  const tempo = useMemo(
    () => latest?.score?.tempo ?? tab?.tempo ?? null,
    [latest, tab],
  );
  const timeSigTuple = useMemo<[number, number] | null>(() => {
    if (latest?.score?.timeSignature)
      return latest.score.timeSignature as [number, number];
    if (tab?.timeSigTop && tab?.timeSigBot)
      return [tab.timeSigTop, tab.timeSigBot];
    return [4, 4];
  }, [latest, tab]);

  // Load meta + revisions
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tabRes, revRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/tabs/${tabId}`, {
            credentials: "include",
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/tab-revisions/tab/${tabId}`,
            { credentials: "include" },
          ),
        ]);
        if (!tabRes.ok) throw new Error("Failed to fetch tab");
        if (!revRes.ok) throw new Error("Failed to fetch revisions");

        const [tabJson, revJson] = await Promise.all([
          tabRes.json(),
          revRes.json(),
        ]);
        if (cancelled) return;

        setTab(tabJson);
        setRevisions(revJson);
        const latestRev = revJson?.[0] ?? null;
        setLatest(latestRev);

        const score: Score | null = latestRev?.score ?? null;
        if (score) {
          const { grid, columns, strings } = scoreToGrid(score);
          setGrid(grid);
          setColumns(columns);
          setStrings(strings);
        } else {
          // no revisions yet → default grid (standard tuning)
          const s = ["E4", "B3", "G3", "D3", "A2", "E2"];
          setStrings(s);
          setColumns(32);
          setGrid(
            Array.from({ length: s.length }, () =>
              Array.from({ length: 32 }, () => null),
            ),
          );
        }
      } catch (e) {
        console.error(e);
        setTab(null);
        setRevisions([]);
        setLatest(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tabId]);

  const ascii = useMemo(
    () => gridToAscii(grid, strings, columns),
    [grid, strings, columns],
  );

  const FRET_CYCLE = [
    null,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
  ] as const;

  function toggleCell(r: number, c: number) {
    setGrid((g) => {
      const clone = g.map((row) => [...row]);
      const cur = clone[r]?.[c];

      if (cur === undefined) return g; // out-of-bounds guard

      // null -> 0, 0 -> 1, ..., 17 -> 18; anything else -> treat as null
      const curIndex =
        typeof cur === "number" &&
        Number.isInteger(cur) &&
        cur >= 0 &&
        cur <= 17
          ? cur + 1
          : 0;

      const next = FRET_CYCLE[(curIndex + 1) % FRET_CYCLE.length];
      clone[r][c] = next;
      return clone;
    });
  }

  async function saveRevision() {
    setSaving(true);
    try {
      const score = gridToScore(
        grid,
        strings,
        tempo ?? null,
        timeSigTuple ?? [4, 4],
      );
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/tab-revisions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tabId,
            message: message || "Edited in UI",
            score,
          }),
        },
      );
      if (!res.ok) throw new Error("Save failed");
      const rev: Revision = await res.json();
      setRevisions((prev) => [rev, ...prev]);
      setLatest(rev);
      setMode("view");
      setMessage("");
    } catch (e) {
      console.error(e);
      alert("Failed to save revision");
    } finally {
      setSaving(false);
    }
  }

  function copyAscii() {
    navigator.clipboard.writeText(ascii).catch(() => {});
  }

  if (loading) {
    return (
      <section className="min-h-[70vh] grid place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading tab…
        </div>
      </section>
    );
  }

  if (!tab) {
    return (
      <section className="min-h-[70vh] grid place-items-center">
        <div className="text-destructive">Tab not found.</div>
      </section>
    );
  }

  return (
    <section className="min-h-[70vh] p-6 space-y-6 rounded-xl border bg-background/60">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tab.title}</h1>
          <p className="text-sm text-muted-foreground">
            Tuning: {tab.tuning} · BPM: {tab.tempo ?? "—"} ·{" "}
            {tab.timeSigTop && tab.timeSigBot
              ? `${tab.timeSigTop}/${tab.timeSigBot}`
              : "—"}{" "}
            · Capo: {tab.capo ?? 0}
          </p>
        </div>
        <div className="flex gap-2">
          {mode === "view" ? (
            <Button onClick={() => setMode("edit")} className="flex gap-2">
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setMode("view")}
              className="flex gap-2"
            >
              <Eye className="w-4 h-4" /> View
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <Card className="border bg-background/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {mode === "view" ? "Tab View (ASCII)" : "Tab Editor"}
          </CardTitle>
          <div className="flex items-center gap-2">
            {mode === "view" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={copyAscii}
                className="gap-2"
              >
                <Copy className="w-4 h-4" /> Copy ASCII
              </Button>
            ) : (
              <>
                <Input
                  placeholder="Revision message (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-64"
                />
                <Button
                  onClick={saveRevision}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}{" "}
                  Save Revision
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {mode === "view" ? (
            // View Mode
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <pre className="whitespace-pre rounded-xl border border-border bg-black/80 text-green-300 p-4 overflow-auto">
                  {ascii}
                </pre>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Latest Revision</Badge>
                {latest ? (
                  <span>
                    #{latest.number} ·{" "}
                    {new Date(latest.createdAt).toLocaleString()}
                  </span>
                ) : (
                  <span>No revisions yet</span>
                )}
              </div>
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <Label>Columns</Label>
                  <Input
                    type="number"
                    min={8}
                    max={128}
                    value={columns}
                    onChange={(e) => {
                      const val = Math.max(
                        8,
                        Math.min(128, parseInt(e.target.value || "32", 10)),
                      );
                      setColumns(val);
                      setGrid((g) =>
                        g.map((row) => {
                          const clone = [...row];
                          if (clone.length < val) {
                            return [
                              ...clone,
                              ...Array.from(
                                { length: val - clone.length },
                                () => null,
                              ),
                            ];
                          } else {
                            clone.length = val;
                            return clone;
                          }
                        }),
                      );
                    }}
                  />
                </div>

                <div className="grid gap-1">
                  <Label>Tuning</Label>
                  <Input
                    value={strings.join(",")}
                    onChange={(e) => {
                      const parts = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (!parts.length) return;
                      setStrings(parts);
                      setGrid(
                        Array.from({ length: parts.length }, () =>
                          Array.from({ length: columns }, () => null),
                        ),
                      );
                    }}
                    placeholder="E4,B3,G3,D3,A2,E2"
                  />
                </div>

                <div className="grid gap-1">
                  <Label>Quick actions</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => {
                        setGrid((g) => g.map((row) => row.map(() => null)));
                      }}
                    >
                      <RotateCcw className="w-4 h-4" /> Clear
                    </Button>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="overflow-auto rounded-xl border border-border bg-background/70 shadow-inner">
                <table className="border-collapse select-none w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                        String
                      </th>
                      {Array.from({ length: columns }, (_, i) => (
                        <th
                          key={i}
                          className="px-1 text-xs text-muted-foreground"
                        >
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {strings.map((s, r) => (
                      <tr key={r}>
                        <td className="px-3 py-2 text-sm text-foreground font-medium">
                          {s}
                        </td>
                        {Array.from({ length: columns }, (_, c) => (
                          <td key={c} className="p-0.5">
                            <button
                              onClick={() => toggleCell(r, c)}
                              className={`w-8 h-8 rounded-md border border-border text-sm font-semibold grid place-items-center transition-colors
                                ${
                                  grid[r][c] !== null
                                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                                    : "bg-muted hover:bg-muted/70"
                                }
                              `}
                              title={`Row ${r + 1}, Col ${c + 1}`}
                            >
                              {grid[r][c] ?? ""}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Live ASCII Preview */}
              <div>
                <Label className="mb-2 block text-foreground/80">
                  ASCII Preview
                </Label>
                <Textarea
                  value={ascii}
                  readOnly
                  className="font-mono min-h-45"
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-between">
          <div className="text-xs text-muted-foreground">
            Tip: Click cells to cycle frets (now includes 0–17).
          </div>
          {mode === "view" ? (
            <div className="text-xs text-muted-foreground">
              {revisions.length
                ? `${revisions.length} revision${
                    revisions.length === 1 ? "" : "s"
                  }`
                : "No revisions yet"}
            </div>
          ) : null}
        </CardFooter>
      </Card>
    </section>
  );
}
