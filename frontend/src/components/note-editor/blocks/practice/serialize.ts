import { PracticeBlockData, PracticeStep } from "./types";

function formatStep(step: PracticeStep) {
  const parts: string[] = [];

  if (step.checked !== undefined) {
    parts.push(step.checked ? "[x]" : "[ ]");
  }

  if (step.duration) parts.push(step.duration);

  const text = step.text?.trim();
  if (text) parts.push(text);

  if (step.block) {
    const label = `${step.block.type} block: ${step.block.name}`.trim();
    if (text) {
      parts.push("-");
    }
    parts.push(label);
  }

  if (parts.length === 0) return step.raw || "";
  return parts.join(" ");
}

export function serializePracticeBlock(data: PracticeBlockData) {
  const lines: string[] = [];

  lines.push("```practice");

  if (data.goal) lines.push(`goal: ${data.goal}`);
  if (data.duration) lines.push(`duration: ${data.duration}`);
  if (data.planId) lines.push(`planId: ${data.planId}`);

  lines.push("steps:");

  const steps = data.steps ?? [];
  if (steps.length) {
    for (const step of steps) {
      lines.push(`- ${formatStep(step)}`);
    }
  } else {
    lines.push("- ");
  }

  lines.push("```");
  lines.push("");

  return lines.join("\n");
}
