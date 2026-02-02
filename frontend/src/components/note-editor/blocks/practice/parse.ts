import { PracticeBlockData, PracticeStep } from "./types";

function parseHeaderLine(line: string, out: Record<string, string>) {
  const idx = line.indexOf(":");
  if (idx === -1) return;

  const key = line.slice(0, idx).trim().toLowerCase();
  const val = line.slice(idx + 1).trim();
  if (!key) return;

  if (key === "goal" || key === "duration") {
    out[key] = val;
    return;
  }

  if (key === "plan" || key === "planid" || key === "plan_id") {
    out.planId = val;
  }
}

function parseDuration(text: string): { duration?: string; rest: string } {
  const match = text.match(
    /^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i,
  );
  if (!match) return { rest: text };

  const value = match[1];
  const unit = match[2].toLowerCase().startsWith("h") ? "h" : "m";
  const duration = `${value}${unit}`;
  const rest = text.slice(match[0].length).trim();
  return { duration, rest };
}

function parseBlockRef(text: string): {
  block?: { type: string; name: string };
  rest: string;
} {
  const lower = text.toLowerCase();
  const blockIdx = lower.indexOf("block:");
  if (blockIdx === -1) return { rest: text };

  const before = text.slice(0, blockIdx).trimEnd();
  const after = text.slice(blockIdx + "block:".length).trim();
  const tokens = before.split(/\s+/).filter(Boolean);
  const type = tokens.pop();
  const prefix = tokens.join(" ").trim();

  if (!type || !after) return { rest: text };

  return {
    block: { type: type.toLowerCase(), name: after },
    rest: prefix,
  };
}

function parseStepLine(raw: string): PracticeStep {
  let text = raw.trim();
  let checked: boolean | undefined;

  const checkMatch = text.match(/^\[(x|X| )\]\s*/);
  if (checkMatch) {
    checked = checkMatch[1].toLowerCase() === "x";
    text = text.slice(checkMatch[0].length).trim();
  }

  const durationParsed = parseDuration(text);
  text = durationParsed.rest;

  const blockParsed = parseBlockRef(text);
  text = blockParsed.rest;

  return {
    raw: raw.trim(),
    text: text.trim(),
    duration: durationParsed.duration,
    checked,
    block: blockParsed.block,
  };
}

export function parsePracticeBlockBody(rawBody: string): PracticeBlockData {
  const raw = String(rawBody ?? "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  const headerObj: Record<string, string> = {};
  const steps: PracticeStep[] = [];
  let inSteps = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!inSteps) {
      if (trimmed.toLowerCase().startsWith("steps:")) {
        inSteps = true;
        const rest = trimmed.slice("steps:".length).trim();
        if (rest) {
          const stepLine = rest.replace(/^[-*]\s+/, "");
          steps.push(parseStepLine(stepLine));
        }
        continue;
      }

      parseHeaderLine(trimmed, headerObj);
      continue;
    }

    const stepMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (stepMatch) {
      steps.push(parseStepLine(stepMatch[1]));
      continue;
    }

    if (/^[a-z0-9_-]+\s*:/i.test(trimmed)) {
      parseHeaderLine(trimmed, headerObj);
      continue;
    }

    if (steps.length > 0) {
      const prev = steps[steps.length - 1];
      prev.text = [prev.text, trimmed].filter(Boolean).join(" ");
      continue;
    }
  }

  return {
    goal: headerObj.goal,
    duration: headerObj.duration,
    planId: headerObj.planId,
    steps,
  };
}
