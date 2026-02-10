"use client";

import { useMemo, useState } from "react";
import {
  Headphones,
  Mic2,
  Pause,
  Play,
  Plus,
  Square,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

const channelSeed: Channel[] = [
  {
    id: "midi-1",
    label: "1 MIDI",
    type: "midi",
    accent: "bg-indigo-500",
    gain: -6,
    pan: 0,
    armed: true,
    monitor: true,
  },
  {
    id: "midi-2",
    label: "2 MIDI",
    type: "midi",
    accent: "bg-sky-500",
    gain: -8,
    pan: -0.2,
    armed: false,
    monitor: false,
  },
  {
    id: "audio-3",
    label: "3 AUDIO",
    type: "audio",
    accent: "bg-fuchsia-500",
    gain: -3,
    pan: 0.15,
    armed: true,
    monitor: true,
  },
  {
    id: "audio-4",
    label: "4 AUDIO",
    type: "audio",
    accent: "bg-rose-500",
    gain: -4,
    pan: -0.1,
    armed: false,
    monitor: true,
  },
  {
    id: "return-a",
    label: "A REVERB",
    type: "return",
    accent: "bg-amber-500",
    gain: -10,
    pan: 0.1,
  },
  {
    id: "return-b",
    label: "B DELAY",
    type: "return",
    accent: "bg-yellow-500",
    gain: -12,
    pan: -0.15,
  },
  {
    id: "master",
    label: "MAIN",
    type: "master",
    accent: "bg-emerald-500",
    gain: -1,
    pan: 0,
  },
];

const inputOptions = ["All Ins", "In 1", "In 2", "In 3", "In 4"];
const outputOptions = ["Main", "Cue A", "Cue B"];

function meterHeight(level: number) {
  const clamped = Math.min(0, Math.max(-48, level));
  return ((clamped + 48) / 48) * 100;
}

export default function PerformanceZoneProjectPage() {
  const [channels, setChannels] = useState<Channel[]>(channelSeed);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [tempo, setTempo] = useState(124);

  const armedCount = useMemo(
    () => channels.filter((channel) => channel.armed).length,
    [channels],
  );

  const toggleChannel = (
    id: string,
    key: "armed" | "monitor" | "muted" | "solo",
  ) => {
    setChannels((current) =>
      current.map((channel) =>
        channel.id === id ? { ...channel, [key]: !channel[key] } : channel,
      ),
    );
  };

  const updateChannel = (id: string, key: "gain" | "pan", value: number) => {
    setChannels((current) =>
      current.map((channel) =>
        channel.id === id ? { ...channel, [key]: value } : channel,
      ),
    );
  };

  return (
    <section className="min-h-[70vh] rounded-xl border border-border bg-background/60 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Performance Zone
            </h1>
            <Badge variant="outline">48k Sample Rate</Badge>
            <Badge variant="secondary">{armedCount} armed</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Live-style mixing for takes, overdubs, and quick balance passes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Tempo</span>
            <Input
              type="number"
              min={60}
              max={220}
              value={tempo}
              onChange={(event) => setTempo(Number(event.target.value || 0))}
              className="h-7 w-20 text-xs"
            />
            <span className="text-muted-foreground">BPM</span>
          </div>
          <Button
            variant={recording ? "destructive" : "default"}
            onClick={() => {
              setRecording((prev) => !prev);
              setPlaying(true);
            }}
            className="gap-2"
          >
            <Mic2 className="h-4 w-4" />
            {recording ? "Stop Rec" : "Record"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPlaying((prev) => !prev)}
            className="gap-2"
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPlaying(false);
              setRecording(false);
            }}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border bg-background/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg"></CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Headphones className="h-3.5 w-3.5" />
              Monitoring Live
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 overflow-x-auto pb-2">
              <div className="grid min-w-[980px] grid-cols-[repeat(7,1fr)] gap-3">
                {channels.map((channel) => {
                  const meter = meterHeight(channel.gain);
                  return (
                    <div
                      key={channel.id}
                      className="flex flex-col rounded-lg border border-border bg-background/70 shadow-sm"
                    >
                      <div
                        className={cn(
                          "h-2 w-full rounded-t-lg",
                          channel.accent,
                        )}
                      />
                      <div className="flex-1 space-y-3 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold tracking-wide text-foreground">
                            {channel.label}
                          </span>
                          <Badge variant="outline" className="uppercase">
                            {channel.type}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-1">
                            <p className="text-[10px] uppercase text-muted-foreground">
                              Input
                            </p>
                            <p className="text-xs font-medium">
                              {
                                inputOptions[
                                  channel.id.length % inputOptions.length
                                ]
                              }
                            </p>
                          </div>
                          <div className="rounded-md border border-border/60 bg-muted/40 px-2 py-1">
                            <p className="text-[10px] uppercase text-muted-foreground">
                              Output
                            </p>
                            <p className="text-xs font-medium">
                              {
                                outputOptions[
                                  channel.id.length % outputOptions.length
                                ]
                              }
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => toggleChannel(channel.id, "armed")}
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
                            onClick={() => toggleChannel(channel.id, "monitor")}
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
                            onClick={() => toggleChannel(channel.id, "muted")}
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
                            onClick={() => toggleChannel(channel.id, "solo")}
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

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
                            <span>Send</span>
                            <span className="text-xs font-medium text-foreground">
                              {Math.round(channel.gain)} dB
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative h-10 w-10 rounded-full border border-border bg-muted/40">
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                                A
                              </div>
                              <div className="absolute bottom-2 left-1/2 h-3 w-0.5 -translate-x-1/2 rounded bg-foreground/70" />
                            </div>
                            <div className="relative h-10 w-10 rounded-full border border-border bg-muted/40">
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                                B
                              </div>
                              <div className="absolute bottom-1 left-1/2 h-4 w-0.5 -translate-x-1/2 rounded bg-foreground/70" />
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
                            <span>Gain</span>
                            <span className="text-xs font-semibold text-foreground">
                              {channel.gain} dB
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-48}
                            max={6}
                            value={channel.gain}
                            onChange={(event) =>
                              updateChannel(
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
                              updateChannel(
                                channel.id,
                                "pan",
                                Number(event.target.value || 0),
                              )
                            }
                            className="h-2 w-full cursor-pointer accent-primary"
                          />
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
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
