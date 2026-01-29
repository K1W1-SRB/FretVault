export type PracticeCategory =
  | "WARMUP"
  | "CHORDS"
  | "SCALES"
  | "SONGS"
  | "THEORY"
  | "EAR_TRAINING"
  | "COOL_DOWN";

export type PracticeItemPayload = {
  title: string;
  category: PracticeCategory;
  duration: number;
  description?: string;
  order: number;
};

export type PracticePlanOption = {
  id: number;
  name: string;
  description?: string | null;
  workspaceId?: string | null;
  sourceNoteSlug?: string | null;
  sourceNoteTitle?: string | null;
};

export type PracticePlanItem = {
  id: number;
  title: string;
  description?: string | null;
  category: PracticeCategory;
  duration: number;
  order: number;
};

function getBackendBase() {
  return process.env.NEXT_PUBLIC_BACKEND_API ?? "http://localhost:4000";
}

export async function fetchPracticePlans(): Promise<PracticePlanOption[]> {
  const res = await fetch(`${getBackendBase()}/practice-plans`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch practice plans");
  }
  return res.json();
}

export async function fetchPracticeItems(planId: string) {
  const res = await fetch(`${getBackendBase()}/practice-items/plans/${planId}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch practice items");
  }
  return res.json() as Promise<PracticePlanItem[]>;
}

export async function createPracticeItems(
  planId: string,
  items: PracticeItemPayload[],
) {
  const results = await Promise.all(
    items.map(async (item) => {
      const res = await fetch(`${getBackendBase()}/practice-items/plans/${planId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Failed to create practice item");
      return res.json();
    }),
  );
  return results;
}

export function parseDurationToMinutes(raw?: string) {
  if (!raw) return null;
  const match = raw.match(
    /^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i,
  );
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const isHours = match[2].toLowerCase().startsWith("h");
  return Math.max(1, Math.round(isHours ? value * 60 : value));
}

export function pickCategoryFromText(raw: string): PracticeCategory {
  const text = raw.toLowerCase();
  if (text.includes("warm")) return "WARMUP";
  if (text.includes("cool")) return "COOL_DOWN";
  if (text.includes("ear")) return "EAR_TRAINING";
  if (text.includes("theory")) return "THEORY";
  if (text.includes("chord")) return "CHORDS";
  if (text.includes("scale")) return "SCALES";
  if (text.includes("song") || text.includes("riff") || text.includes("lick")) {
    return "SONGS";
  }
  if (text.includes("improv") || text.includes("backing")) {
    return "SONGS";
  }
  return "WARMUP";
}

export function mapStepToItem(step: {
  text?: string;
  raw?: string;
  duration?: string;
  block?: { type: string; name: string };
}): { title: string; description?: string; category: PracticeCategory; duration: number } {
  const text = step.text?.trim() || "";
  const raw = step.raw?.trim() || "";
  const blockType = step.block?.type?.trim() || "";
  const blockName = step.block?.name?.trim() || "";

  const title = blockName || text || raw || "Practice step";
  const description =
    blockName && text ? text : raw && raw !== title ? raw : undefined;
  const category = pickCategoryFromText(blockType || text || raw);
  const duration = parseDurationToMinutes(step.duration) ?? 5;

  return { title, description, category, duration };
}

export function categoryToBlockType(category: PracticeCategory) {
  switch (category) {
    case "WARMUP":
      return "warmup";
    case "COOL_DOWN":
      return "cooldown";
    case "EAR_TRAINING":
      return "ear";
    case "THEORY":
      return "theory";
    case "CHORDS":
      return "chord";
    case "SCALES":
      return "scale";
    case "SONGS":
      return "song";
    default:
      return "practice";
  }
}

export function minutesToDuration(minutes?: number) {
  if (!minutes || minutes <= 0) return "";
  return `${Math.round(minutes)}m`;
}
