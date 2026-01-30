import * as React from "react";
import { ensureSix, FingerValue, StringValue } from "./types";
import { buildFretboardLayout } from "../fretboard/layout";

function getWindow(strings: StringValue[], fretsToShow: number) {
  const fretted = strings.filter(
    (v) => typeof v === "number" && v > 0,
  ) as number[];
  const min = fretted.length ? Math.min(...fretted) : 1;
  const max = fretted.length ? Math.max(...fretted) : 1;

  if (!fretted.length) return { startFret: 1, showNut: true };
  if (max <= fretsToShow) return { startFret: 1, showNut: true };

  return { startFret: min, showNut: false };
}

export function ChordDiagram({
  name,
  strings,
  fingers,
  fretsToShow = 4,
  className,
}: {
  name: string;
  strings: StringValue[];
  fingers?: FingerValue[];
  fretsToShow?: number;
  className?: string;
}) {
  const stroke = "currentColor";
  const text = "currentColor";
  const dot = "currentColor";
  const fingerText = "currentColor";

  const layout = buildFretboardLayout({
    width: 150,
    height: 190,
    stringCount: 6,
    fretsToShow,
  });

  const {
    width: W,
    height: H,
    markerY,
    gridTop,
    gridBottom,
    gridLeft,
    gridRight,
    fretCount,
    xForString,
    yForFretLine,
    yForFretCenter,
  } = layout;

  const fixedStrings = ensureSix(strings, "x" as StringValue);
  const fixedFingers = fingers ? ensureSix(fingers, "x" as FingerValue) : null;

  const { startFret, showNut } = getWindow(fixedStrings, fretsToShow);

  const dotR = 7;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? "block"}
      role="img"
      aria-label={`Chord diagram ${name}`}
    >
      <text
        x={W / 2}
        y={16}
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fill={text}
      >
        {name}
      </text>

      {!showNut && (
        <text
          x={gridLeft - 10}
          y={gridTop + 12}
          textAnchor="end"
          fontSize="10"
          fill={text}
        >
          {startFret}
        </text>
      )}

      {fixedStrings.map((v, i) => {
        const x = xForString(i);
        let txt = "";
        if (v === "x") txt = "X";
        else if (typeof v === "number" && v === 0) txt = "O";
        if (!txt) return null;

        return (
          <text
            key={`m-${i}`}
            x={x}
            y={markerY}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={text}
          >
            {txt}
          </text>
        );
      })}

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
          strokeWidth={f === 0 && showNut ? 4 : 1}
        />
      ))}

      {fixedStrings.map((v, i) => {
        if (v === "x") return null;
        if (typeof v === "number" && v === 0) return null;

        const absoluteFret = v as number;
        const relFret = absoluteFret - startFret + 1;
        if (relFret < 1 || relFret > fretsToShow) return null;

        const cx = xForString(i);
        const cy = yForFretCenter(relFret);

        const finger =
          fixedFingers &&
          fixedFingers[i] !== "x" &&
          typeof fixedFingers[i] === "number"
            ? (fixedFingers[i] as number)
            : null;

        return (
          <g key={`d-${i}`}>
            <circle cx={cx} cy={cy} r={dotR} fill={dot} />
            {finger && finger > 0 ? (
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill={fingerText}
              >
                {finger}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
