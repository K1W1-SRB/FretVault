// src/components/note-editor/blocks/tab/tab-block-preview.tsx
import * as React from "react";
import { TabDiagram } from "./tab-diagram";
import { normalizeTabData } from "./types";

export function TabBlockPreview({ data }: { data: unknown }) {
  const normalized = React.useMemo(() => normalizeTabData(data), [data]);

  return (
    <div className="mb-3">
      <TabDiagram data={normalized} />
    </div>
  );
}
