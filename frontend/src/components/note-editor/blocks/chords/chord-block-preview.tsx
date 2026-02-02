import * as React from "react";
import { ensureSix, StringValue } from "./types";
import {
  parseCsvLineToFingerValues,
  parseCsvLineToStringValues,
  shapeToStrings,
} from "./parse";
import { ChordDiagram } from "./chord-diagram";

function slugifyChord(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

type ChordBlockPayload = {
  name?: string;
  strings?: string;
  fingers?: string;
  shape?: string;
};

export function ChordBlockPreview({ data }: { data: ChordBlockPayload }) {
  const name = data.name ?? "Unnamed chord";
  const anchor = slugifyChord(name);

  const strings =
    parseCsvLineToStringValues(data.strings) ??
    shapeToStrings(data.shape) ??
    null;

  const fingers = parseCsvLineToFingerValues(data.fingers);
  const fixedStrings = ensureSix(strings, "x" as StringValue);

  return (
    <div
      id={anchor ? `chord-${anchor}` : undefined}
      className="mb-3 inline-block rounded border p-3"
    >
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
