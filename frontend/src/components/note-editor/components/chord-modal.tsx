import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ChordDiagram } from "../blocks/chords";
import type { FingerValue, StringValue } from "../blocks/chords";
import { OptionSelect } from "../ui/option-select";
import type { ChordModalState } from "../types";

type ChordModalProps = {
  value: ChordModalState;
  onChange: React.Dispatch<React.SetStateAction<ChordModalState | null>>;
  onClose: () => void;
  onApply: () => void;
};

export function ChordModal({
  value,
  onChange,
  onClose,
  onApply,
}: ChordModalProps) {
  const fretOptions = React.useMemo(() => {
    const nums = Array.from({ length: 25 }).map((_, i) => String(i)); // 0..24
    return ["x", ...nums];
  }, []);

  const fingerOptions = React.useMemo(() => ["x", "1", "2", "3", "4"], []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded border bg-background p-4 shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-medium">
          {value.mode === "insert" ? "Insert chord" : "Edit chord"}
        </div>

        <div className="mt-3 grid gap-3">
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Name</div>
            <Input
              value={value.name}
              onChange={(e) =>
                onChange((m) => (m ? { ...m, name: e.target.value } : m))
              }
              placeholder="Dm7"
            />
          </div>

          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">
              Strings (low E - high E)
            </div>

            <div className="grid grid-cols-6 gap-2">
              {value.strings.map((v, idx) => (
                <div key={`s-${idx}`} className="grid gap-1">
                  <div className="text-[10px] text-muted-foreground text-center">
                    {["E", "A", "D", "G", "B", "e"][idx]}
                  </div>
                  <OptionSelect
                    value={String(v)}
                    options={fretOptions}
                    onChange={(val) => {
                      const parsed: StringValue =
                        val === "x" ? "x" : Number(val);
                      onChange((m) => {
                        if (!m) return m;
                        const next = m.strings.slice();
                        next[idx] = parsed;
                        return { ...m, strings: next };
                      });
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="text-xs text-muted-foreground">
                Finger numbers (optional)
              </div>
              <button
                className="text-xs underline"
                onClick={() =>
                  onChange((m) =>
                    m ? { ...m, includeFingers: !m.includeFingers } : m,
                  )
                }
              >
                {value.includeFingers ? "Disable" : "Enable"}
              </button>
            </div>

            {value.includeFingers && (
              <div className="grid grid-cols-6 gap-2">
                {value.fingers.map((v, idx) => (
                  <div key={`f-${idx}`} className="grid gap-1">
                    <div className="text-[10px] text-muted-foreground text-center">
                      {["E", "A", "D", "G", "B", "e"][idx]}
                    </div>
                    <OptionSelect
                      value={String(v)}
                      options={fingerOptions}
                      onChange={(val) => {
                        const parsed: FingerValue =
                          val === "x" ? "x" : Number(val);
                        onChange((m) => {
                          if (!m) return m;
                          const next = m.fingers.slice();
                          next[idx] = parsed;
                          return { ...m, fingers: next };
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2">Preview:</div>
            <div className="rounded border p-3 inline-block">
              <ChordDiagram
                name={value.name || "Chord"}
                strings={value.strings}
                fingers={value.includeFingers ? value.fingers : undefined}
                className="text-foreground"
              />
            </div>
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
