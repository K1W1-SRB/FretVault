"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type Option = { value: string; label: string };

type CompleteStateViewProps = {
  targetTitle: string;
  durationLabel: string;
  metricType: string;
  metricValue: string;
  onMetricTypeChange: (value: string) => void;
  onMetricValueChange: (value: string) => void;
  difficulty: string;
  onDifficultyChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  metricOptions: Option[];
  difficultyOptions: Option[];
  onSave: () => void;
  saving: boolean;
  onBack: () => void;
  canEnd: boolean;
  overviewCard: ReactNode;
  targetStatsCard: ReactNode;
  recentSessionsCard: ReactNode;
};

export function CompleteStateView({
  targetTitle,
  durationLabel,
  metricType,
  metricValue,
  onMetricTypeChange,
  onMetricValueChange,
  difficulty,
  onDifficultyChange,
  notes,
  onNotesChange,
  metricOptions,
  difficultyOptions,
  onSave,
  saving,
  onBack,
  canEnd,
  overviewCard,
  targetStatsCard,
  recentSessionsCard,
}: CompleteStateViewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card className="border bg-background/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Session Reflection</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add metrics, difficulty, and notes now that the session is done.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-lg font-semibold">{targetTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Duration: {durationLabel}
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Metric Type</label>
              <Select value={metricType} onValueChange={onMetricTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {metricOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {metricType !== "NONE" && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Metric Value</label>
                <Input
                  type="number"
                  value={metricValue}
                  onChange={(event) => onMetricValueChange(event.target.value)}
                  placeholder="e.g. 120"
                />
              </div>
            )}

            <div className="grid gap-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={onDifficultyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                placeholder="Quick notes about this session"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onSave} disabled={!canEnd || saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Reflection"
                )}
              </Button>
              <Button variant="outline" onClick={onBack} disabled={saving}>
                Back to Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {overviewCard}
        {targetStatsCard}
        {recentSessionsCard}
      </div>
    </div>
  );
}
