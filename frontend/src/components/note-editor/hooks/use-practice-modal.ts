import * as React from "react";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

import { insertAtPos, replaceRange } from "../utils/markdown";
import {
  findPracticeBlockAtPos,
  serializePracticeBlock,
} from "../blocks/practice";
import {
  categoryToBlockType,
  createPracticeItems,
  fetchPracticeItems,
  mapStepToItem,
  minutesToDuration,
} from "../blocks/practice/sync";
import type { PracticeItemPayload, PracticePlanOption } from "../blocks/practice/sync";
import type { PracticeModalState } from "../types";

type PracticeModalArgs = {
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  practicePlans: PracticePlanOption[];
  noteTitle?: string | null;
  noteSlug?: string | null;
  selectedWorkspaceId: string | null;
  qc: QueryClient;
  closeContextMenu: () => void;
};

function getPracticeDefaults() {
  return {
    goal: "Clean pentatonic phrasing",
    duration: "30m",
    planId: "",
    steps: [
      {
        duration: "10m",
        text: "",
        checked: undefined,
        block: { type: "scale", name: "A minor pentatonic" },
      },
      {
        duration: "10m",
        text: "",
        checked: undefined,
        block: { type: "riff", name: "blues lick 3" },
      },
      {
        duration: "10m",
        text: "improv over backing track",
        checked: undefined,
        block: undefined,
      },
    ],
  };
}

export function usePracticeModal({
  draft,
  setDraft,
  setDirty,
  taRef,
  practicePlans,
  noteTitle,
  noteSlug,
  selectedWorkspaceId,
  qc,
  closeContextMenu,
}: PracticeModalArgs) {
  const [practiceModal, setPracticeModal] =
    React.useState<PracticeModalState | null>(null);
  const [practiceSyncing, setPracticeSyncing] = React.useState(false);
  const [practicePlanLoading, setPracticePlanLoading] = React.useState(false);

  function openInsertPractice(pos: number) {
    closeContextMenu();
    const defaults = getPracticeDefaults();
    setPracticeModal({
      mode: "insert",
      pos,
      goal: defaults.goal,
      duration: defaults.duration,
      planId: defaults.planId,
      steps: defaults.steps,
    });
  }

  function openEditPractice(pos: number) {
    closeContextMenu();
    const practice = findPracticeBlockAtPos(draft, pos);
    if (!practice) return;
    const data = practice.data;
    setPracticeModal({
      mode: "edit",
      pos,
      range: { start: practice.start, end: practice.end },
      goal: data.goal ?? "",
      duration: data.duration ?? "",
      planId: data.planId ?? "",
      steps: (data.steps ?? []).map((step) => {
        const text =
          step.text && step.text.trim()
            ? step.text
            : step.block
              ? ""
              : step.raw ?? "";
        return {
          ...step,
          text,
        };
      }),
    });
  }

  async function handlePracticePlanSelect(nextPlanId: string) {
    setPracticeModal((m) => (m ? { ...m, planId: nextPlanId } : m));
    if (!nextPlanId) return;

    setPracticePlanLoading(true);
    try {
      const items = await fetchPracticeItems(nextPlanId);
      const sorted = items.slice().sort((a, b) => a.order - b.order);
      const steps = sorted.map((item) => ({
        duration: minutesToDuration(item.duration),
        text: item.description ?? "",
        checked: undefined,
        block: {
          type: categoryToBlockType(item.category),
          name: item.title,
        },
      }));

      const totalMinutes = sorted.reduce(
        (sum, item) => sum + (item.duration ?? 0),
        0,
      );

      const selectedPlan = practicePlans.find(
        (plan) => String(plan.id) === nextPlanId,
      );

      setPracticeModal((m) => {
        if (!m) return m;
        return {
          ...m,
          planId: nextPlanId,
          steps,
          goal: m.goal.trim() ? m.goal : selectedPlan?.name ?? m.goal,
          duration: m.duration.trim()
            ? m.duration
            : minutesToDuration(totalMinutes),
        };
      });
    } catch (err: any) {
      const message =
        typeof err?.message === "string"
          ? err.message
          : "Failed to load plan items";
      toast.error(message);
    } finally {
      setPracticePlanLoading(false);
    }
  }

  async function applyPracticeModal() {
    if (!practiceModal) return;
    if (practiceSyncing || practicePlanLoading) return;

    const goal = practiceModal.goal.trim();
    const duration = practiceModal.duration.trim();

    const steps = (practiceModal.steps ?? [])
      .map((step) => {
        const text = step.text?.trim() || undefined;
        const durationVal = step.duration?.trim() || undefined;
        const type = step.block?.type?.trim() ?? "";
        const name = step.block?.name?.trim() ?? "";
        const block = type && name ? { type, name } : undefined;
        return {
          raw: step.raw,
          text,
          duration: durationVal,
          checked: step.checked,
          block,
        };
      })
      .filter(
        (step) =>
          step.duration ||
          step.text ||
          step.block ||
          step.checked === true,
      );

    const items: PracticeItemPayload[] = steps.map((step, idx) => {
      const item = mapStepToItem(step);
      return {
        title: item.title,
        description: item.description,
        category: item.category,
        duration: item.duration,
        order: idx + 1,
      };
    });

    const base =
      process.env.NEXT_PUBLIC_BACKEND_API ?? "http://localhost:4000";

    const safeNoteTitle = noteTitle?.trim() || "Untitled note";
    const safeNoteSlug = noteSlug?.trim();

    const planPayload = {
      name: goal || `Practice: ${safeNoteTitle}`,
      description: safeNoteTitle ? `From note: ${safeNoteTitle}` : undefined,
      items,
      workspaceId: selectedWorkspaceId ?? undefined,
      sourceNoteSlug: safeNoteSlug ?? undefined,
      sourceNoteTitle: safeNoteTitle ?? undefined,
    };

    setPracticeSyncing(true);

    try {
      let planId = practiceModal.planId.trim();

      if (!planId) {
        const createdRes = await fetch(`${base}/practice-plans`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planPayload),
        });
        if (!createdRes.ok) throw new Error("Failed to create practice plan");
        const created = await createdRes.json();
        planId = String(created?.id ?? "");
        let hasItems = Array.isArray(created?.items)
          ? created.items.length > 0
          : false;
        if (!hasItems && planId) {
          try {
            const existing = await fetchPracticeItems(planId);
            hasItems = existing.length > 0;
          } catch {
            hasItems = false;
          }
        }
        if (planId && items.length && !hasItems) {
          await createPracticeItems(planId, items);
        }
        toast.success("Practice plan created");
      } else {
        const updateRes = await fetch(`${base}/practice-plans/${planId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: planPayload.items,
            workspaceId: planPayload.workspaceId,
            sourceNoteSlug: planPayload.sourceNoteSlug,
            sourceNoteTitle: planPayload.sourceNoteTitle,
          }),
        });
        if (!updateRes.ok) throw new Error("Failed to sync practice plan");
        toast.success("Practice plan synced");
      }

      const block = serializePracticeBlock({
        goal: goal || undefined,
        duration: duration || undefined,
        planId: planId || undefined,
        steps,
      });

      setDraft((prev) => {
        if (practiceModal.mode === "insert") {
          return insertAtPos(prev, practiceModal.pos, block);
        }
        if (!practiceModal.range) return prev;
        return replaceRange(
          prev,
          practiceModal.range.start,
          practiceModal.range.end,
          block,
        );
      });

      setDirty(true);
      setPracticeModal(null);
      await qc.invalidateQueries({ queryKey: ["practice-plans"] });

      requestAnimationFrame(() => {
        taRef.current?.focus();
      });
    } catch (err: any) {
      const message =
        typeof err?.message === "string"
          ? err.message
          : "Failed to sync practice plan";
      toast.error(message);
    } finally {
      setPracticeSyncing(false);
    }
  }

  return {
    practiceModal,
    setPracticeModal,
    practiceSyncing,
    practicePlanLoading,
    openInsertPractice,
    openEditPractice,
    handlePracticePlanSelect,
    applyPracticeModal,
  };
}
