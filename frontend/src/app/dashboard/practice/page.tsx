"use client";

import { useEffect, useMemo, useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import debounce from "lodash.debounce";

type PracticePlan = {
  id: number;
  name: string;
  description?: string | null;
  itemCount: number;
  totalDuration: number;
};

export default function PracticeDashboard() {
  const [plans, setPlans] = useState<PracticePlan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtered, setFiltered] = useState<PracticePlan[]>([]);

  const router = useRouter();

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_API + "/practice-plans",
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch songs");
        const data = await res.json();
        setPlans(data);
        setFiltered(data);
      } catch (err) {
        console.error("error fetching plans:", err);
        setPlans([]);
        setFiltered([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const debouncedFilter = useMemo(
    () =>
      debounce((query: string) => {
        const lower = query.toLowerCase();
        const result = plans.filter((plans) => {
          const name = plans.name?.toLowerCase?.() ?? "";
          const description = plans.description?.toLowerCase?.() ?? "";
          return name.includes(lower) || description.includes(lower);
        });
        setFiltered(result);
      }, 250),
    [plans]
  );

  useEffect(() => {
    debouncedFilter(search);
    return () => debouncedFilter.cancel();
  }, [search, debouncedFilter]);

  const columns: ColumnDef<PracticePlan>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium text-foreground">
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {row.getValue("description") || "—"}
        </div>
      ),
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
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => {
        const date = new Date(row.getValue("updatedAt"));
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
              router.push(`/dashboard/practice/${row.original.id}`)
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
  const handleCreate = () => {
    router.push("/dashboard/practice/new");
  };

  return (
    <section className="min-h-[70vh] rounded-xl border border-border bg-background/60 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Practice Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a practice routine
          </p>
        </div>
        <Button onClick={handleCreate} className="flex gap-2">
          <Plus className="w-4 h-4" /> New Routine
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Search Routine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <span className="text-sm text-muted-foreground">
          {" "}
          {filtered.length} song{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-md border bg-background/50">
        <DataTable columns={columns} data={filtered} loading={loading} />
      </div>
    </section>
  );
}
