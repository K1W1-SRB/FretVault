"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";
import {
  performanceProjectsApi,
  type CreatePerformanceProjectInput,
  type PerformanceProject,
  type UpdatePerformanceProjectInput,
} from "@/lib/performance-api";

const defaultFormValues: CreatePerformanceProjectInput = {
  name: "",
  bpm: 120,
  sampleRate: 44100,
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: string }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export default function PerformanceZoneIndexPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedWorkspaceId, workspacesQuery } = useSelectedWorkspace();
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<PerformanceProject | null>(null);
  const [formValues, setFormValues] =
    useState<CreatePerformanceProjectInput>(defaultFormValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["performance-projects", selectedWorkspaceId],
    queryFn: () => performanceProjectsApi.list(selectedWorkspaceId!),
    enabled: !!selectedWorkspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePerformanceProjectInput) => {
      if (!selectedWorkspaceId) {
        throw new Error("No workspace selected");
      }
      return performanceProjectsApi.create(selectedWorkspaceId, payload);
    },
    onSuccess: async () => {
      if (!selectedWorkspaceId) return;
      await qc.invalidateQueries({
        queryKey: ["performance-projects", selectedWorkspaceId],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: UpdatePerformanceProjectInput;
    }) => {
      if (!selectedWorkspaceId) {
        throw new Error("No workspace selected");
      }
      return performanceProjectsApi.update(
        selectedWorkspaceId,
        projectId,
        payload,
      );
    },
    onSuccess: async () => {
      if (!selectedWorkspaceId) return;
      await qc.invalidateQueries({
        queryKey: ["performance-projects", selectedWorkspaceId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => {
      if (!selectedWorkspaceId) {
        throw new Error("No workspace selected");
      }
      return performanceProjectsApi.remove(selectedWorkspaceId, projectId);
    },
    onSuccess: async () => {
      if (!selectedWorkspaceId) return;
      await qc.invalidateQueries({
        queryKey: ["performance-projects", selectedWorkspaceId],
      });
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    setFormError(null);
    if (editingProject) {
      setFormValues({
        name: editingProject.name,
        bpm: editingProject.bpm,
        sampleRate: editingProject.sampleRate,
      });
    } else {
      setFormValues(defaultFormValues);
    }
  }, [dialogOpen, editingProject]);

  const projects = useMemo(
    () => (projectsQuery.data ?? []) as PerformanceProject[],
    [projectsQuery.data],
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(query),
    );
  }, [projects, search]);

  const isLoading = workspacesQuery.isLoading || projectsQuery.isLoading;
  const hasWorkspace = !!selectedWorkspaceId;
  const emptyMessage = hasWorkspace
    ? "No performance projects yet."
    : "Select a workspace to view projects.";

  const handleOpenCreate = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (project: PerformanceProject) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingProject(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!selectedWorkspaceId) {
      setFormError("Select a workspace first.");
      return;
    }

    const name = formValues.name.trim();
    if (!name) {
      setFormError("Project name is required.");
      return;
    }

    const bpm = Number(formValues.bpm);
    if (!Number.isFinite(bpm) || bpm < 1) {
      setFormError("BPM must be at least 1.");
      return;
    }

    const sampleRate = Number(formValues.sampleRate);
    if (!Number.isFinite(sampleRate) || sampleRate < 1) {
      setFormError("Sample rate must be at least 1.");
      return;
    }

    try {
      if (editingProject) {
        await updateMutation.mutateAsync({
          projectId: editingProject.id,
          payload: { name, bpm, sampleRate },
        });
      } else {
        await createMutation.mutateAsync({ name, bpm, sampleRate });
      }
      setDialogOpen(false);
    } catch (error) {
      setFormError(getErrorMessage(error, "Failed to save project."));
    }
  };

  const handleDelete = async (project: PerformanceProject) => {
    if (deleteMutation.isPending) return;
    const confirmed = window.confirm(
      `Delete "${project.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setActionError(null);
    try {
      await deleteMutation.mutateAsync(project.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Failed to delete project."));
    }
  };

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
      accessorKey: "sampleRate",
      header: "Sample Rate",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("sampleRate")} Hz
        </span>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() =>
                  router.push(
                    `/dashboard/zones/performance/${row.original.id}`,
                  )
                }
                className="gap-2"
              >
                <ArrowUpRight className="h-4 w-4" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleOpenEdit(row.original)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleDelete(row.original)}
                className="gap-2 text-destructive focus:text-destructive"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <section className="min-h-[70vh] rounded-xl border border-border bg-background/60 p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Zone</h1>
          <p className="text-sm text-muted-foreground">
            Pick a project to edit or start a new performance session.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="gap-2"
          disabled={!hasWorkspace}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full md:w-72"
        />
        <Badge variant="outline">{filteredProjects.length} projects</Badge>
      </div>

      {projectsQuery.isError && (
        <div className="mb-3 text-sm text-destructive">
          {getErrorMessage(projectsQuery.error, "Failed to load projects.")}
        </div>
      )}

      {actionError && (
        <div className="mb-3 text-sm text-destructive">{actionError}</div>
      )}

      <DataTable
        columns={columns}
        data={filteredProjects}
        loading={isLoading}
        emptyMessage={emptyMessage}
      />

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit project" : "New project"}
            </DialogTitle>
            <DialogDescription>
              Set the basics for your performance project.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Intro Warmup"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-bpm">BPM</Label>
                <Input
                  id="project-bpm"
                  type="number"
                  min={1}
                  value={formValues.bpm}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      bpm: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-sample-rate">Sample rate</Label>
                <Input
                  id="project-sample-rate"
                  type="number"
                  min={1}
                  value={formValues.sampleRate}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      sampleRate: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>
            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingProject ? "Save changes" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
