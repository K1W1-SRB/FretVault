import * as React from "react";
import { buildFretboardLayout } from "../fretboard/layout";

export type ScaleNote = {
  stringIndex: number;
  fret: number;
  isRoot?: boolean;
  label?: string;
};

export function ScaleDiagram({
  notes,
  startFret,
  fretsToShow,
  showIntervals,
  className,
}: {
  notes: ScaleNote[];
  startFret: number;
  fretsToShow: number;
  showIntervals?: boolean;
  className?: string;
}) {
  const layout = buildFretboardLayout({
    width: 170,
    height: 200,
    stringCount: 6,
    fretsToShow,
  });

  const {
    width: W,
    height: H,
    gridTop,
    gridBottom,
    gridLeft,
    gridRight,
    fretCount,
    xForString,
    yForFretLine,
    yForFretCenter,
  } = layout;

  const stroke = "currentColor";
  const dotR = 6.5;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? "block"}
      role="img"
      aria-label="Scale diagram"
    >
      {startFret > 1 && (
        <text
          x={gridLeft - 10}
          y={gridTop + 12}
          textAnchor="end"
          fontSize="10"
          fill={stroke}
        >
          {startFret}
        </text>
      )}

      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={`s-${i}`}
          x1={xForString(i)}
          y1={gridTop}
          x2={xForString(i)}
          y2={gridBottom}
          stroke={stroke}
          strokeWidth={1}
        />
      ))}

      {Array.from({ length: fretCount + 1 }).map((_, f) => (
        <line
          key={`f-${f}`}
          x1={gridLeft}
          y1={yForFretLine(f)}
          x2={gridRight}
          y2={yForFretLine(f)}
          stroke={stroke}
          strokeWidth={f === 0 ? 3 : 1}
        />
      ))}

      {notes.map((note, idx) => {
        const relFret = note.fret - startFret + 1;
        if (relFret < 1 || relFret > fretsToShow) return null;
        const cx = xForString(note.stringIndex);
        const cy = yForFretCenter(relFret);
        const isRoot = Boolean(note.isRoot);

        return (
          <g key={`n-${idx}`}>
            <circle
              cx={cx}
              cy={cy}
              r={dotR}
              fill={isRoot ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
            />
            {showIntervals && note.label ? (
              <text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={isRoot ? "hsl(var(--background))" : "currentColor"}
              >
                {note.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
