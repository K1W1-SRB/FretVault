import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  DEFAULT_BARS as DEFAULT_PROG_BARS,
  DEFAULT_KEY as DEFAULT_PROG_KEY,
  ProgressionBlockPreview,
} from "../blocks/progression";
import type { ProgressionModalState } from "../types";

type ProgressionModalProps = {
  value: ProgressionModalState;
  onChange: React.Dispatch<React.SetStateAction<ProgressionModalState | null>>;
  onClose: () => void;
  onApply: () => void;
};

export function ProgressionModal({
  value,
  onChange,
  onClose,
  onApply,
}: ProgressionModalProps) {
  function addProgChord() {
    onChange((m) => {
      if (!m) return m;
      const raw = m.chordInput.trim();
      if (!raw) return { ...m, chordInput: "" };
      const parts = raw
        .split(/[,\s]+/g)
        .map((p) => p.trim())
        .filter(Boolean);
      const next = [...m.chords, ...parts];
      return { ...m, chords: next, chordInput: "" };
    });
  }

  function removeProgChord(idx: number) {
    onChange((m) => {
      if (!m) return m;
      const next = m.chords.slice();
      next.splice(idx, 1);
      return { ...m, chords: next };
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
          {value.mode === "insert" ? "Insert progression" : "Edit progression"}
        </div>

        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Key</Label>
              <Input
                value={value.key}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, key: e.target.value } : m))
                }
                placeholder={DEFAULT_PROG_KEY}
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Bars</Label>
              <Input
                type="number"
                min={1}
                value={value.bars}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, bars: e.target.value } : m))
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              Chords / Roman Numerals
            </Label>
            <div className="flex flex-wrap gap-2">
              <Input
                value={value.chordInput}
                onChange={(e) =>
                  onChange((m) =>
                    m ? { ...m, chordInput: e.target.value } : m,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addProgChord();
                  }
                }}
                placeholder="I V vi IV or C G Am F"
                className="min-w-[240px] flex-1"
              />
              <Button type="button" variant="secondary" onClick={addProgChord}>
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {value.chords.length ? (
                value.chords.map((ch, idx) => (
                  <span
                    key={`${ch}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                  >
                    {ch}
                    <button
                      type="button"
                      className="rounded-full px-1 hover:bg-muted"
                      onClick={() => removeProgChord(idx)}
                      aria-label={`Remove ${ch}`}
                    >
                      &times;
                    </button>
                  </span>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  Add chords to build the progression.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <ProgressionBlockPreview
              data={{
                key: value.key,
                bars: Number(value.bars) || DEFAULT_PROG_BARS,
                chords: value.chords,
              }}
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
