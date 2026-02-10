"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PerformanceProject = {
  id: string;
  name: string;
  bpm: number;
  tracks: number;
  status: "Draft" | "Ready";
  createdAt: string;
  updatedAt: string;
};

const seedProjects: PerformanceProject[] = [
  {
    id: "midnight-echoes",
    name: "Midnight Echoes",
    bpm: 128,
    tracks: 6,
    status: "Draft",
    createdAt: "2026-02-02T10:30:00.000Z",
    updatedAt: "2026-02-08T14:05:00.000Z",
  },
  {
    id: "neon-run",
    name: "Neon Run",
    bpm: 120,
    tracks: 8,
    status: "Ready",
    createdAt: "2026-01-28T09:10:00.000Z",
    updatedAt: "2026-02-07T18:20:00.000Z",
  },
  {
    id: "slow-burn",
    name: "Slow Burn",
    bpm: 96,
    tracks: 4,
    status: "Draft",
    createdAt: "2026-02-05T12:45:00.000Z",
    updatedAt: "2026-02-06T22:12:00.000Z",
  },
];

export default function PerformanceZoneIndexPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return seedProjects;
    return seedProjects.filter((project) =>
      project.name.toLowerCase().includes(query),
    );
  }, [search]);

  const columns: ColumnDef<PerformanceProject>[] = [
    {
      accessorKey: "name",
      header: "Project",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {row.getValue("name")}
          </span>
          <span className="text-xs text-muted-foreground">
            ID: {row.original.id}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "bpm",
      header: "BPM",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("bpm")}
        </span>
      ),
    },
    {
      accessorKey: "tracks",
      header: "Tracks",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("tracks")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "Ready" ? "secondary" : "outline"}>
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => {
        const date = new Date(row.getValue("updatedAt"));
        return (
          <div className="text-sm text-muted-foreground">
            {date.toLocaleDateString()}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              router.push(`/dashboard/zones/performance/${row.original.id}`)
            }
            className="gap-2"
          >
            Open
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="min-h-[70vh] rounded-xl border border-border bg-background/60 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Zone</h1>
          <p className="text-sm text-muted-foreground">
            Pick a project to edit or start a new performance session.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/zones/performance/new")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full md:w-72"
        />
        <Badge variant="outline">{filteredProjects.length} projects</Badge>
      </div>

      <DataTable
        columns={columns}
        data={filteredProjects}
        emptyMessage="No performance projects yet."
      />
    </section>
  );
}
