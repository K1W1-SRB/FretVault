import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { PracticeModalState } from "../types";
import type { PracticePlanOption } from "../blocks/practice/sync";

type PracticeModalProps = {
  value: PracticeModalState;
  onChange: React.Dispatch<React.SetStateAction<PracticeModalState | null>>;
  onClose: () => void;
  onApply: () => void;
  plans: PracticePlanOption[];
  isSyncing?: boolean;
  onSelectPlan?: (planId: string) => void;
};

export function PracticeModal({
  value,
  onChange,
  onClose,
  onApply,
  plans,
  isSyncing,
  onSelectPlan,
}: PracticeModalProps) {
  function updateStep(
    idx: number,
    patch: Partial<PracticeModalState["steps"][number]>,
  ) {
    onChange((m) => {
      if (!m) return m;
      const next = m.steps.slice();
      const current = { ...next[idx], ...patch };
      next[idx] = current;
      return { ...m, steps: next };
    });
  }

  function updateBlockType(idx: number, type: string) {
    onChange((m) => {
      if (!m) return m;
      const next = m.steps.slice();
      const current = { ...next[idx] };
      const name = current.block?.name ?? "";
      const trimmedType = type.trim();
      const trimmedName = name.trim();
      current.block =
        trimmedType || trimmedName
          ? { type: trimmedType, name: trimmedName }
          : undefined;
      next[idx] = current;
      return { ...m, steps: next };
    });
  }

  function updateBlockName(idx: number, name: string) {
    onChange((m) => {
      if (!m) return m;
      const next = m.steps.slice();
      const current = { ...next[idx] };
      const type = current.block?.type ?? "";
      const trimmedType = type.trim();
      const trimmedName = name.trim();
      current.block =
        trimmedType || trimmedName
          ? { type: trimmedType, name: trimmedName }
          : undefined;
      next[idx] = current;
      return { ...m, steps: next };
    });
  }

  function addStep() {
    onChange((m) => {
      if (!m) return m;
      return {
        ...m,
        steps: [
          ...m.steps,
          {
            text: "",
            duration: "",
            checked: undefined,
            block: undefined,
          },
        ],
      };
    });
  }

  function removeStep(idx: number) {
    onChange((m) => {
      if (!m) return m;
      const next = m.steps.slice();
      next.splice(idx, 1);
      return { ...m, steps: next };
    });
  }

  const sortedPlans = React.useMemo(
    () =>
      [...plans].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      ),
    [plans],
  );

  const selectedPlan = React.useMemo(
    () => sortedPlans.find((p) => String(p.id) === value.planId),
    [sortedPlans, value.planId],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded border bg-background p-4 shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-medium">
          {value.mode === "insert"
            ? "Insert practice routine"
            : "Edit practice routine"}
        </div>

        <div className="mt-3 grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Goal</Label>
              <Input
                value={value.goal}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, goal: e.target.value } : m))
                }
                placeholder="Clean pentatonic phrasing"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <Input
                value={value.duration}
                onChange={(e) =>
                  onChange((m) => (m ? { ...m, duration: e.target.value } : m))
                }
                placeholder="30m"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">
              Linked practice plan
            </Label>
            <Select
              value={value.planId ? value.planId : "new"}
              onValueChange={(next) =>
                onSelectPlan
                  ? onSelectPlan(next === "new" ? "" : next)
                  : onChange((m) =>
                      m ? { ...m, planId: next === "new" ? "" : next } : m,
                    )
              }
              disabled={isSyncing}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Create new plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create new plan</SelectItem>
                {sortedPlans.map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlan?.description ? (
              <div className="text-xs text-muted-foreground">
                {selectedPlan.description}
              </div>
            ) : !value.planId ? (
              <div className="text-xs text-muted-foreground">
                A new practice plan will be created from this routine.
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Steps</Label>
              <Button type="button" size="sm" variant="secondary" onClick={addStep}>
                Add step
              </Button>
            </div>

            <div className="grid gap-3">
              {value.steps.length ? (
                value.steps.map((step, idx) => (
                  <div
                    key={`practice-step-${idx}`}
                    className="rounded border bg-muted/40 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Checkbox
                        checked={Boolean(step.checked)}
                        onCheckedChange={(checked) =>
                          updateStep(idx, { checked: Boolean(checked) })
                        }
                      />
                      <Input
                        value={step.duration ?? ""}
                        onChange={(e) =>
                          updateStep(idx, { duration: e.target.value })
                        }
                        placeholder="10m"
                        className="w-24"
                      />
                      <Input
                        value={step.text ?? ""}
                        onChange={(e) =>
                          updateStep(idx, { text: e.target.value })
                        }
                        placeholder="improv over backing track"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStep(idx)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <Input
                        value={step.block?.type ?? ""}
                        onChange={(e) => updateBlockType(idx, e.target.value)}
                        placeholder="Block type (scale, riff, improv)"
                      />
                      <Input
                        value={step.block?.name ?? ""}
                        onChange={(e) => updateBlockName(idx, e.target.value)}
                        placeholder="Block name (A minor pentatonic)"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  Add a few time-boxed sections to build the routine.
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={isSyncing}>
            {isSyncing ? "Syncing..." : "Apply & Sync"}
          </Button>
        </div>
      </div>
    </div>
  );
}
