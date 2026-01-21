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

export function NotesWorkspace() {
  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
        <NotesSidebar activeSlug={activeSlug} onSelectSlug={setActiveSlug} />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={70} minSize={55}>
        <div className="flex h-full flex-col">
          <NoteTopbar activeSlug={activeSlug} />
          <div className="flex-1 overflow-hidden">
            <NoteEditor activeSlug={activeSlug} />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
