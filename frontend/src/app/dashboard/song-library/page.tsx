"use client";

import React, { useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce"; // 👈 we'll use lodash.debounce
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Song = {
  id: number;
  title: string;
  artist: string | null;
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED";
  tempo: number | null;
  key: string | null;
  createdAt: string;
};

export default function SongLibrary() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);

  // Fetch songs once
  useEffect(() => {
    async function fetchSongs() {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API + "/songs",
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch songs");
        const data = await res.json();
        setSongs(data);
        setFilteredSongs(data); // initial render
      } catch (err) {
        console.error("Error fetching songs:", err);
        setSongs([]);
        setFilteredSongs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSongs();
  }, []);

  // Debounced filter handler
  const debouncedFilter = useMemo(
    () =>
      debounce((query: string) => {
        const lower = query.toLowerCase();
        const result = songs.filter((song) => {
          const title = song.title?.toLowerCase?.() ?? "";
          const artist = song.artist?.toLowerCase?.() ?? "";
          return title.includes(lower) || artist.includes(lower);
        });
        setFilteredSongs(result);
      }, 250),
    [songs]
  );

  // On every keystroke, trigger debounce
  useEffect(() => {
    debouncedFilter(search);
    return () => debouncedFilter.cancel();
  }, [search, debouncedFilter]);

  const columns: ColumnDef<Song>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="font-medium text-foreground">
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "artist",
      header: "Artist",
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {row.getValue("artist") || "—"}
        </div>
      ),
    },
    {
      accessorKey: "tempo",
      header: "Tempo",
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {row.getValue("tempo") ?? "—"}
        </div>
      ),
    },
    {
      accessorKey: "visibility",
      header: "Visibility",
      cell: ({ row }) => {
        const value = row.getValue("visibility");
        const color =
          value === "PUBLIC"
            ? "bg-green-500/15 text-green-700"
            : value === "UNLISTED"
            ? "bg-yellow-500/15 text-yellow-700"
            : "bg-gray-500/15 text-gray-700";
        return (
          <Badge className={`${color} capitalize`}>
            {String(value).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <div className="text-muted-foreground text-sm">
            {date.toLocaleDateString()}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              router.push(`/dashboard/song-library/${row.original.id}`)
            }
          >
            View
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => console.log("Delete song:", row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Build table from filtered data
  const table = useReactTable({
    data: filteredSongs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const router = useRouter();

  const handleCreate = () => {
    router.push("/dashboard/song-library/new");
  };

  return (
    <section className="min-h-[70vh] rounded-xl border border-border bg-background/60 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Song Library</h1>
          <p className="text-sm text-muted-foreground">
            Browse and manage your songs
          </p>
        </div>
        <Button onClick={handleCreate} className="flex gap-2">
          <Plus className="w-4 h-4" /> New Song
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Search songs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <span className="text-sm text-muted-foreground">
          {filteredSongs.length} song{filteredSongs.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-md border bg-background/50">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading songs...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredSongs.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="text-center text-muted-foreground py-6">
                    No songs found.
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
