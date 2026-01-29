"use client";
import * as React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NotesSidebar } from "./notes-sidebar";
import { NoteTopbar } from "./notes-topbar";
import { NoteEditor } from "./note-editor";
import { useSearchParams } from "next/navigation";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";

export function NotesWorkspace() {
  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);
  const searchParams = useSearchParams();
  const { selectedWorkspaceId, setWorkspaceId } = useSelectedWorkspace();
  const slugParam = searchParams.get("slug");
  const workspaceParam = searchParams.get("workspaceId");
  function handleSelectSlug(slug: string) {
    setActiveSlug(slug);
  }

  const handleNoteDeleted = () => {
    setActiveSlug(null);
  };

  React.useEffect(() => {
    if (workspaceParam && workspaceParam !== selectedWorkspaceId) {
      setWorkspaceId(workspaceParam);
    }

    if (slugParam) {
      setActiveSlug(slugParam);
    }
  }, [slugParam, workspaceParam, selectedWorkspaceId, setWorkspaceId]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
        <NotesSidebar activeSlug={activeSlug} onSelectSlug={handleSelectSlug} />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={70} minSize={55}>
        <div className="flex h-full flex-col">
          <NoteTopbar activeSlug={activeSlug} onDeleted={handleNoteDeleted} />
          <div className="flex-1 overflow-hidden">
            <NoteEditor
              activeSlug={activeSlug}
              onNavigateSlug={handleSelectSlug}
            />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
