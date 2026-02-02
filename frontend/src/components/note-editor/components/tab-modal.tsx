import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  DEFAULT_TIME as DEFAULT_TAB_TIME,
  DEFAULT_TUNING as DEFAULT_TAB_TUNING,
} from "../blocks/tab";
import type { TabModalState } from "../types";
import { buildEmptyGrid, gridToAscii } from "../utils/tab-grid";

type TabModalProps = {
  value: TabModalState;
  onChange: React.Dispatch<React.SetStateAction<TabModalState | null>>;
  onClose: () => void;
  onApply: () => void;
};

const FRET_CYCLE = [
  null,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
] as const;

export function TabModal({ value, onChange, onClose, onApply }: TabModalProps) {
  function toggleTabCell(r: number, c: number) {
    onChange((m) => {
      if (!m) return m;
      const grid = m.grid.map((row) => [...row]);
      const cur = grid[r]?.[c];
      if (cur === undefined) return m;

      const curIndex =
        typeof cur === "number" && Number.isInteger(cur) && cur >= 0 && cur <= 17
          ? cur + 1
          : 0;
      const next = FRET_CYCLE[(curIndex + 1) % FRET_CYCLE.length];
      grid[r][c] = next;
      return { ...m, grid };
    });
  }

  function updateTabColumns(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const nextColumns = Math.max(8, Math.min(128, Math.floor(parsed)));
    onChange((m) => {
      if (!m) return m;
      const grid = m.grid.map((row) => {
        const clone = [...row];
        if (clone.length < nextColumns) {
          return [
            ...clone,
            ...Array.from({ length: nextColumns - clone.length }, () => null),
          ];
        }
        clone.length = nextColumns;
        return clone;
      });
      return { ...m, columns: nextColumns, grid };
    });
  }

  function updateTabStrings(raw: string) {
    const nextStrings = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!nextStrings.length) return;

    onChange((m) => {
      if (!m) return m;
      const columns = m.columns;
      const nextGrid = buildEmptyGrid(nextStrings.length, columns);
      const copyRows = Math.min(m.grid.length, nextStrings.length);
      for (let r = 0; r < copyRows; r++) {
        for (let c = 0; c < columns; c++) {
          nextGrid[r][c] = m.grid[r]?.[c] ?? null;
        }
      }
      return { ...m, strings: nextStrings, grid: nextGrid };
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded border bg-background p-4 shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-medium">
          {value.mode === "insert" ? "Insert tab" : "Edit tab"}
        </div>

        <div className="mt-3 grid gap-3">
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={value.name}
              onChange={(e) =>
                onChange((m) => (m ? { ...m, name: e.target.value } : m))
              }
              placeholder="Verse riff"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <Input
                value={value.time}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, time: e.target.value } : m))
                }
                placeholder={DEFAULT_TAB_TIME}
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">BPM</Label>
              <Input
                value={value.bpm}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, bpm: e.target.value } : m))
                }
                placeholder="120"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Capo</Label>
              <Input
                value={value.capo}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, capo: e.target.value } : m))
                }
                placeholder="0"
              />
            </div>

            <div className="grid gap-1 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Tuning</Label>
              <Input
                value={value.strings.join(",")}
                onChange={(e) => updateTabStrings(e.target.value)}
                placeholder={DEFAULT_TAB_TUNING}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Columns</Label>
              <Input
                type="number"
                min={8}
                max={128}
                value={value.columns}
                onChange={(e) => updateTabColumns(e.target.value)}
              />
            </div>

            <div className="grid gap-1 md:col-span-2">
              <Label className="text-xs text-muted-foreground">
                Quick actions
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    onChange((m) =>
                      m
                        ? {
                            ...m,
                            grid: buildEmptyGrid(m.strings.length, m.columns),
                          }
                        : m,
                    )
                  }
                >
                  Clear grid
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-auto rounded-xl border border-border bg-background/70 shadow-inner">
            <table className="border-collapse select-none w-full">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-muted-foreground text-xs font-medium">
                    String
                  </th>
                  {Array.from({ length: value.columns }, (_, i) => (
                    <th key={i} className="px-1 text-[10px] text-muted-foreground">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.strings.map((s, r) => (
                  <tr key={r}>
                    <td className="px-3 py-2 text-sm text-foreground font-medium">
                      {s}
                    </td>
                    {Array.from({ length: value.columns }, (_, c) => (
                      <td key={c} className="p-0.5">
                        <button
                          onClick={() => toggleTabCell(r, c)}
                          className={`w-8 h-8 rounded-md border border-border text-sm font-semibold grid place-items-center transition-colors ${
                            value.grid[r][c] !== null
                              ? "bg-primary text-primary-foreground hover:bg-primary/80"
                              : "bg-muted hover:bg-muted/70"
                          }`}
                          title={`Row ${r + 1}, Col ${c + 1}`}
                        >
                          {value.grid[r][c] ?? ""}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">ASCII Preview</Label>
            <Textarea
              value={gridToAscii(value.grid, value.strings, value.columns)}
              readOnly
              rows={6}
              className="font-mono"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onApply}>Apply</Button>
        </div>
      </div>
    </div>
  );
}
