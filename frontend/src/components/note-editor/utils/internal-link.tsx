import * as React from "react";
import { cn } from "@/lib/utils";

export type ResolvedInternalLink = {
  id: string;
  title: string;
  slug: string;
};

export function InternalLink({
  slug,
  resolvedNote,
  onNavigate,
  children,
}: {
  slug: string;
  resolvedNote?: ResolvedInternalLink | null;
  onNavigate?: (slug: string) => void;
  children?: React.ReactNode;
}) {
  const targetSlug = resolvedNote?.slug ?? slug;
  const isResolved = !!resolvedNote;
  const isMissing = resolvedNote === null;
  const canNavigate = !isMissing;
  const label = children ?? slug;
  const title = isResolved
    ? resolvedNote?.title || resolvedNote?.slug
    : isMissing
      ? `Missing note: ${slug}`
      : `Resolving ${slug}`;

  return (
    <button
      type="button"
      className={cn(
        "underline underline-offset-4 transition-colors",
        isResolved
          ? "text-primary hover:text-primary/80"
          : isMissing
            ? "text-destructive/70 decoration-dashed cursor-not-allowed"
            : "text-muted-foreground hover:text-muted-foreground/80",
      )}
      title={title}
      aria-disabled={!canNavigate}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canNavigate) return;
        onNavigate?.(targetSlug);
      }}
    >
      {label}
    </button>
  );
}
