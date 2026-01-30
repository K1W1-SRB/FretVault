import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  DEFAULT_SCALE_ROOT,
  DEFAULT_SCALE_TYPE,
  ScaleBlockPreview,
  normalizePositions,
} from "../blocks/scale";
import type { ScaleModalState } from "../types";

type ScaleModalProps = {
  value: ScaleModalState;
  onChange: React.Dispatch<React.SetStateAction<ScaleModalState | null>>;
  onClose: () => void;
  onApply: () => void;
};

export function ScaleModal({
  value,
  onChange,
  onClose,
  onApply,
}: ScaleModalProps) {
  function addPositions() {
    onChange((m) => {
      if (!m) return m;
      const raw = m.positionInput.trim();
      if (!raw) return { ...m, positionInput: "" };
      const parts = raw
        .split(/[,\s]+/g)
        .map((p) => Number(p.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map((n) => Math.floor(n));
      const next = normalizePositions([...m.positions, ...parts]);
      return { ...m, positions: next, positionInput: "" };
    });
  }

  function removePosition(idx: number) {
    onChange((m) => {
      if (!m) return m;
      const next = m.positions.slice();
      next.splice(idx, 1);
      return { ...m, positions: normalizePositions(next) };
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
          {value.mode === "insert" ? "Insert scale" : "Edit scale"}
        </div>

        <div className="mt-3 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Root</Label>
              <Input
                value={value.root}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, root: e.target.value } : m))
                }
                placeholder={DEFAULT_SCALE_ROOT}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Scale type</Label>
              <Input
                value={value.type}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, type: e.target.value } : m))
                }
                placeholder={DEFAULT_SCALE_TYPE}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Positions</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                value={value.positionInput}
                onChange={(e) =>
                  onChange((m) =>
                    m ? { ...m, positionInput: e.target.value } : m,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPositions();
                  }
                }}
                placeholder="1 2 3"
                className="min-w-[200px] flex-1"
              />
              <Button type="button" variant="secondary" onClick={addPositions}>
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {value.positions.length ? (
                value.positions.map((pos, idx) => (
                  <span
                    key={`pos-${pos}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                  >
                    {pos}
                    <button
                      type="button"
                      className="rounded-full px-1 hover:bg-muted"
                      onClick={() => removePosition(idx)}
                      aria-label={`Remove position ${pos}`}
                    >
                      &times;
                    </button>
                  </span>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  Add one or more positions (1-5 for pentatonic).
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={value.showIntervals}
              onCheckedChange={(checked) =>
                onChange((m) =>
                  m ? { ...m, showIntervals: Boolean(checked) } : m,
                )
              }
              id="scale-intervals"
            />
            <Label htmlFor="scale-intervals" className="text-xs">
              Show interval labels
            </Label>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <ScaleBlockPreview
              data={{
                root: value.root,
                type: value.type,
                positions: value.positions,
                showIntervals: value.showIntervals,
              }}
              showToggle={false}
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
