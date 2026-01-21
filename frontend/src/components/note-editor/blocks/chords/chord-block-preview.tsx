// src/components/note-editor/blocks/chord/chord-block-preview.tsx
import * as React from "react";
import { ensureSix, StringValue } from "./types";
import {
  parseCsvLineToFingerValues,
  parseCsvLineToStringValues,
  shapeToStrings,
} from "./parse";
import { ChordDiagram } from "./chord-diagram";

export function ChordBlockPreview({ data }: { data: any }) {
  const name = data.name ?? "Unnamed chord";

  const strings =
    parseCsvLineToStringValues(data.strings) ??
    shapeToStrings(data.shape) ??
    null;

  const fingers = parseCsvLineToFingerValues(data.fingers);
  const fixedStrings = ensureSix(strings, "x" as StringValue);

  return (
    <div className="mb-3 inline-block rounded border p-3">
      {/* text color is theme-aware now */}
      <ChordDiagram
        name={name}
        strings={fixedStrings}
        fingers={fingers ?? undefined}
        className="text-foreground"
      />
    </div>
  );
}
