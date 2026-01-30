"use client";

import * as React from "react";
import { useWorkspaceMe } from "@/lib/workspace-me";
import type { WorkspaceMembership } from "@/lib/notes-api";

const LS_KEY = "fretvault:selectedWorkspaceId";

type SelectedWorkspaceCtx = {
  workspacesQuery: ReturnType<typeof useWorkspaceMe>;
  memberships: WorkspaceMembership[];
  selectedWorkspaceId: string | null;
  selectedMembership: WorkspaceMembership | null;
  setWorkspaceId: (id: string) => void;
};

const Ctx = React.createContext<SelectedWorkspaceCtx | null>(null);

function readLS(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

function writeLS(id: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, id);
  } catch {
    // ignore
  }
}

export function SelectedWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspacesQuery = useWorkspaceMe();
  const memberships = React.useMemo<WorkspaceMembership[]>(
    () => workspacesQuery.data ?? [],
    [workspacesQuery.data],
  );

  // ✅ shared, single state instance for the whole subtree
  const [selectedId, setSelectedId] = React.useState<string | null>(() =>
    readLS(),
  );

  // Ensure selectedId is valid once memberships load
  React.useEffect(() => {
    if (!memberships.length) return;

    if (
      selectedId &&
      memberships.some((m) => m.workspace.id === selectedId)
    ) {
      return;
    }

    const fallback = memberships[0].workspace.id;
    setSelectedId(fallback);
    writeLS(fallback);
  }, [memberships, selectedId]);

  const setWorkspaceId = React.useCallback((id: string) => {
    setSelectedId(id);
    writeLS(id);
  }, []);

  const selectedMembership =
    memberships.find((m) => m.workspace.id === selectedId) ?? null;

  const value: SelectedWorkspaceCtx = React.useMemo(
    () => ({
      workspacesQuery,
      memberships,
      selectedWorkspaceId: selectedId,
      selectedMembership,
      setWorkspaceId,
    }),
    [
      workspacesQuery,
      memberships,
      selectedId,
      selectedMembership,
      setWorkspaceId,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelectedWorkspace() {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useSelectedWorkspace must be used inside <SelectedWorkspaceProvider />",
    );
  }
  return ctx;
}
