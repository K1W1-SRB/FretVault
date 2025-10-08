"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";

type Song = {
  id: number;
  title: string;
  artist: string | null;
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
  tempo: number | null;
  key: string | null;
  timeSigTop: number | null;
  timeSigBot: number | null;
  createdAt: string;
};

type Tab = {
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
};

export default function SongDetailPage() {
  const params = useParams<{ id: string }>();
  const songId = Number(params.id);
  const router = useRouter();

  const [song, setSong] = useState<Song | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // fetch song + tabs in parallel
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [songRes, tabsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/songs/${songId}`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/tabs/song/${songId}`, {
            credentials: "include",
          }),
        ]);

        if (!songRes.ok) throw new Error("Failed to fetch song");
        if (!tabsRes.ok) throw new Error("Failed to fetch tabs");

        const [songJson, tabsJson] = await Promise.all([
          songRes.json(),
          tabsRes.json(),
        ]);
        if (!cancelled) {
          setSong(songJson);
          setTabs(tabsJson);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setSong(null);
          setTabs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  const filteredTabs = tabs.filter((t) => {
    const title = t.title?.toLowerCase?.() ?? "";
    const tuning = t.tuning?.toLowerCase?.() ?? "";
    const q = search.toLowerCase();
    return title.includes(q) || tuning.includes(q);
  });

  const visibilityBadge = (v: Song["visibility"]) => {
    const cls =
      v === "PUBLIC"
        ? "bg-green-500/15 text-green-700"
        : v === "UNLISTED"
        ? "bg-yellow-500/15 text-yellow-700"
        : "bg-gray-500/15 text-gray-700";
    return <Badge className={`${cls} capitalize`}>{v.toLowerCase()}</Badge>;
  };

  return (
    <section className="min-h-[70vh] rounded-xl border bg-background/60 p-6">
      {/* Header */}
      <div className="mb-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading song…
          </div>
        ) : song ? (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {song.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {song.artist ?? "Unknown artist"} · {song.key ?? "Key —"} ·{" "}
                {song.tempo ?? "—"} BPM ·{" "}
                {song.timeSigTop && song.timeSigBot
                  ? `${song.timeSigTop}/${song.timeSigBot}`
                  : "—"}
              </p>
            </div>
            <div>{visibilityBadge(song.visibility)}</div>
          </div>
        ) : (
          <div className="text-destructive">Song not found.</div>
        )}
      </div>

      {/* Tabs toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Tabs</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search tabs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button
            onClick={() => router.push(`/dashboard/song-library/${songId}/new`)}
            className="flex gap-2"
          >
            <Plus className="w-4 h-4" />
            New Tab
          </Button>
        </div>
      </div>

      {/* Tabs table */}
      <div className="rounded-md border bg-background/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Tuning</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>Time Sig</TableHead>
              <TableHead>Capo</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading tabs…
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTabs.length ? (
              filteredTabs.map((tab) => (
                <TableRow key={tab.id}>
                  <TableCell className="font-medium">{tab.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {tab.tuning}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tab.tempo ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tab.timeSigTop && tab.timeSigBot
                      ? `${tab.timeSigTop}/${tab.timeSigBot}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tab.capo ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/song-library/tabs/${tab.id}`)
                        }
                      >
                        Open
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="py-8 text-center text-muted-foreground">
                    No tabs yet. Click{" "}
                    <span className="font-medium">New Tab</span> to add one.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
