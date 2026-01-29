import * as React from "react";

import { replaceRange } from "../utils/markdown";
import type { LinkContext } from "../types";

function getLinkContext(value: string, cursor: number): LinkContext | null {
  if (!value) return null;
  const before = value.slice(0, cursor);
  const lastOpen = before.lastIndexOf("[[");
  if (lastOpen === -1) return null;

  const sinceOpen = before.slice(lastOpen + 2);
  const closeIndex = sinceOpen.indexOf("]]");
  if (closeIndex !== -1) return null;

  const aliasIdx = sinceOpen.indexOf("|");
  const slugPart = aliasIdx === -1 ? sinceOpen : sinceOpen.slice(0, aliasIdx);
  if (!/^[a-z0-9_-]*$/.test(slugPart)) return null;

  return {
    replaceStart: lastOpen + 2,
    replaceEnd: lastOpen + 2 + slugPart.length,
    query: slugPart,
  };
}

type NoteLike = {
  id?: string | number;
  slug?: string | null;
  title?: string | null;
};

export function useLinkSuggestions({
  draft,
  setDraft,
  setDirty,
  taRef,
  notes,
}: {
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  notes: NoteLike[];
}) {
  const [linkContext, setLinkContext] = React.useState<LinkContext | null>(
    null,
  );
  const [activeSuggestion, setActiveSuggestion] = React.useState(0);

  const noteSuggestions = React.useMemo(() => {
    const query = linkContext?.query ?? "";
    if (!linkContext) return [];
    if (!notes.length) return [];
    const q = query.toLowerCase();
    const filtered = notes
      .filter((n) => n.slug)
      .filter((n) => !q || n.slug?.toLowerCase().includes(q))
      .slice(0, 6)
      .map((n, idx) => ({
        id: n.id ?? n.slug ?? String(idx),
        slug: n.slug ?? "",
        title: n.title ?? n.slug ?? "",
      }));
    return filtered;
  }, [notes, linkContext]);

  function updateLinkState(value: string, cursor: number | null) {
    if (cursor === null) {
      setLinkContext(null);
      return;
    }
    const ctx = getLinkContext(value, cursor);
    setLinkContext(ctx);
    setActiveSuggestion(0);
  }

  function applySuggestion(slug: string) {
    if (!linkContext) return;
    const text = draft;
    const next = replaceRange(
      text,
      linkContext.replaceStart,
      linkContext.replaceEnd,
      slug,
    );
    setDraft(next);
    setDirty(true);
    const nextPos = linkContext.replaceStart + slug.length;
    requestAnimationFrame(() => {
      if (!taRef.current) return;
      taRef.current.focus();
      taRef.current.selectionStart = nextPos;
      taRef.current.selectionEnd = nextPos;
      updateLinkState(next, nextPos);
    });
  }

  return {
    linkContext,
    noteSuggestions,
    activeSuggestion,
    setActiveSuggestion,
    updateLinkState,
    applySuggestion,
  };
}
