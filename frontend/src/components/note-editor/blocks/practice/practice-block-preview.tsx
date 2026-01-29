import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PracticeBlockData } from "./types";

function parseDurationToMinutes(raw: string) {
  const match = raw.match(
    /^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i,
  );
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const isHours = match[2].toLowerCase().startsWith("h");
  return isHours ? value * 60 : value;
}

function formatMinutes(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function formatBlockLabel(type: string) {
  const normalized = type.replace(/[_-]+/g, " ").trim();
  if (!normalized) return "Block";
  return `${normalized[0].toUpperCase()}${normalized.slice(1)} block`;
}

function useSyncedCheckboxes(data: PracticeBlockData) {
  const signature = React.useMemo(
    () =>
      data.steps
        .map((step) => `${step.raw}|${step.checked ? "1" : "0"}`)
        .join("||"),
    [data.steps],
  );

  const [checked, setChecked] = React.useState<boolean[]>(
    data.steps.map((step) => Boolean(step.checked)),
  );

  React.useEffect(() => {
    setChecked(data.steps.map((step) => Boolean(step.checked)));
  }, [signature, data.steps]);

  return [checked, setChecked] as const;
}

export function PracticeBlockPreview({ data }: { data: PracticeBlockData }) {
  const goal = data.goal?.trim();
  const headerDuration = data.duration?.trim();
  const planId = data.planId?.trim();

  const totalFromSteps = React.useMemo(() => {
    const minutes = data.steps
      .map((step) => (step.duration ? parseDurationToMinutes(step.duration) : null))
      .filter((val): val is number => typeof val === "number")
      .reduce((acc, val) => acc + val, 0);
    return minutes > 0 ? minutes : null;
  }, [data.steps]);

  const computedTotal =
    !headerDuration && totalFromSteps ? formatMinutes(totalFromSteps) : null;

  const [checked, setChecked] = useSyncedCheckboxes(data);

  return (
    <div className="mb-3 rounded border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Practice routine
          </span>
          <span className="text-base font-semibold">
            {goal || "Practice focus"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerDuration ? (
            <Badge variant="outline">{headerDuration}</Badge>
          ) : computedTotal ? (
            <Badge variant="outline">Total {computedTotal}</Badge>
          ) : null}
          {planId ? (
            <>
              <Button size="sm" variant="secondary" asChild>
                <a href={`/dashboard/practice/${planId}`}>Open plan</a>
              </Button>
              <Button size="sm" asChild>
                <a href={`/dashboard/practice/${planId}/play`}>
                  Start session
                </a>
              </Button>
            </>
          ) : (
            <Badge variant="outline">Not synced to a plan yet</Badge>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {data.steps.length ? (
          data.steps.map((step, idx) => {
            const displayText =
              step.text?.trim() || (!step.block ? step.raw?.trim() : "");
            const isChecked = checked[idx] ?? false;

            return (
              <div
                key={`${step.raw}-${idx}`}
                className="rounded border bg-muted/40 p-2"
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(value) => {
                      setChecked((prev) => {
                        const next = [...prev];
                        next[idx] = Boolean(value);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {step.duration ? (
                        <Badge variant="secondary">{step.duration}</Badge>
                      ) : null}
                      {displayText ? (
                        <span className="text-foreground">{displayText}</span>
                      ) : null}
                    </div>

                    {step.block ? (
                      <div className="flex flex-wrap items-center gap-2 rounded border bg-background px-2 py-1 text-xs">
                        <Badge variant="outline">
                          {formatBlockLabel(step.block.type)}
                        </Badge>
                        <span className="font-medium text-foreground">
                          {step.block.name}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground">
            No steps yet. Add a few time-boxed sections.
          </div>
        )}
      </div>
    </div>
  );
}
