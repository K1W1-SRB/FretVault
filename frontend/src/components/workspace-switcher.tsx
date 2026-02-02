"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";

export function WorkspaceSwitcher() {
  const { workspacesQuery, memberships, selectedWorkspaceId, setWorkspaceId } =
    useSelectedWorkspace();

  if (workspacesQuery.isLoading) {
    return <Skeleton className="h-9 w-full" />;
  }

  if (workspacesQuery.isError) {
    return (
      <div className="text-sm text-muted-foreground">
        Failed to load workspaces.
      </div>
    );
  }

  if (!memberships.length) {
    return (
      <div className="text-sm text-muted-foreground">No workspaces found.</div>
    );
  }

  return (
    <Select
      value={selectedWorkspaceId ?? undefined}
      onValueChange={setWorkspaceId}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select workspace" />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m) => (
          <SelectItem key={m.workspace.id} value={m.workspace.id}>
            {m.workspace.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
