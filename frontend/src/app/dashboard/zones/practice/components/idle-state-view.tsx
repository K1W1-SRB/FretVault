"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, Play } from "lucide-react";
import type { PracticeItem, PracticePlan } from "../types";

type IdleStateViewProps = {
  loadingPlans: boolean;
  loadingWorkspaces: boolean;
  plans: PracticePlan[];
  selectedPlanId: string;
  onPlanChange: (value: string) => void;
  onCreatePlan: () => void;
  loadingItems: boolean;
  items: PracticeItem[];
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
  targetTitle: string;
  lastPracticedLabel: string;
  personalBestLabel: string;
  canStart: boolean;
  starting: boolean;
  onStart: () => void;
  hasSelectedPlan: boolean;
  overviewCard: ReactNode;
  targetStatsCard: ReactNode;
  recentSessionsCard: ReactNode;
};

export function IdleStateView({
  loadingPlans,
  loadingWorkspaces,
  plans,
  selectedPlanId,
  onPlanChange,
  onCreatePlan,
  loadingItems,
  items,
  selectedItemId,
  onSelectItem,
  targetTitle,
  lastPracticedLabel,
  personalBestLabel,
  canStart,
  starting,
  onStart,
  hasSelectedPlan,
  overviewCard,
  targetStatsCard,
  recentSessionsCard,
}: IdleStateViewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card className="border bg-background/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Practice Plan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pick a plan, then choose what to practice.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPlans || loadingWorkspaces ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading plans...
              </div>
            ) : plans.length ? (
              <Select value={selectedPlanId} onValueChange={onPlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground">
                No plans found for this workspace.
                <Button variant="link" className="px-0 ml-2" onClick={onCreatePlan}>
                  Create one
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border bg-background/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Practice Items</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pick one item to focus on right now.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingItems ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading items...
              </div>
            ) : items.length ? (
              <div className="grid gap-3">
                {items.map((item) => {
                  const isSelected = item.id === selectedItemId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? "border-primary/60 bg-primary/5"
                          : "hover:border-muted-foreground/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold">{item.title}</p>
                        <div className="flex items-center gap-2">
                          {item.targetType === "NOTE" ? (
                            <Badge variant="secondary">Note</Badge>
                          ) : item.targetType === "SONG" ? (
                            <Badge variant="secondary">Song</Badge>
                          ) : null}
                          <Badge variant={isSelected ? "default" : "outline"}>
                            {item.category}
                          </Badge>
                        </div>
                      </div>
                      {item.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                This plan has no items yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border bg-background/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Selected Target</CardTitle>
            <p className="text-sm text-muted-foreground">
              Confirm and start in seconds.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-xl font-semibold">{targetTitle}</p>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last practiced</span>
                <span>{lastPracticedLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Personal best</span>
                <span>{personalBestLabel}</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full h-12 text-base"
              onClick={onStart}
              disabled={!canStart || starting}
            >
              {starting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Focus Session
                </>
              )}
            </Button>
            {!hasSelectedPlan ? (
              <p className="text-xs text-muted-foreground">
                Select a practice plan to start.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Review progress
              <span className="text-xs text-muted-foreground">
                Trends, streaks, and history
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-hidden">
            <SheetHeader>
              <SheetTitle>Review Progress</SheetTitle>
              <SheetDescription>
                Trends, streaks, and recent sessions for this target.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-4">
                {overviewCard}
                {targetStatsCard}
                {recentSessionsCard}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
