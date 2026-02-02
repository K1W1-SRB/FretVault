import * as React from "react";
import { DEFAULT_TIME, DEFAULT_TUNING, TabBlockData } from "./types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function buildBadges(data: TabBlockData) {
  const out: string[] = [];
  if (typeof data.bpm === "number" && Number.isFinite(data.bpm))
    out.push(`${data.bpm} bpm`);
  if (data.time) out.push(data.time);
  if (typeof data.capo === "number" && Number.isFinite(data.capo))
    out.push(`capo ${data.capo}`);
  return out;
}

export function TabDiagram({
  data,
  className,
}: {
  data: TabBlockData;
  className?: string;
}) {
  const title = (data.name ?? "Tab").trim() || "Tab";
  const tuning = (data.tuning ?? DEFAULT_TUNING).trim() || DEFAULT_TUNING;
  const time = (data.time ?? DEFAULT_TIME).trim() || DEFAULT_TIME;

  const badges = buildBadges({ ...data, time });
  const tabText = String(data.tab ?? "").replace(/\n$/, "");

  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>

          {badges.length ? (
            <div className="flex flex-wrap gap-1">
              {badges.map((b) => (
                <Badge key={b} variant="secondary" className="text-xs">
                  {b}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <CardDescription className="text-xs">
          Tuning: {tuning} · Time: {time}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {tabText ? (
          <pre className="overflow-auto rounded-md border bg-muted p-3 text-sm leading-6 text-foreground">
            <code className="font-mono">{tabText}</code>
          </pre>
        ) : (
          <div className="text-sm text-muted-foreground">No tab content.</div>
        )}
      </CardContent>
    </Card>
  );
}
