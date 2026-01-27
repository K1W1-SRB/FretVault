import * as React from "react";
import { ChordBlockPreview, parseBlockPayload } from "../blocks/chords";
import { TabBlockPreview, parseTabBlockBody } from "../blocks/tab";
import {
  parseProgressionBlockBody,
  ProgressionBlockPreview,
} from "../blocks/progression";
import { InternalLink, ResolvedInternalLink } from "./internal-link";

export function createMdComponents({
  onInternalNavigate,
  internalLinks,
}: {
  onInternalNavigate?: (slug: string) => void;
  internalLinks?: Record<string, ResolvedInternalLink | null>;
}) {
  const isSlugHref = (href: string) =>
    /^[a-z0-9_-]+$/.test(href) &&
    !href.startsWith("http://") &&
    !href.startsWith("https://") &&
    !href.startsWith("mailto:") &&
    !href.startsWith("#");

  return {
    h1: ({ children, ...props }: any) => (
      <h1 {...props} className="mb-4 text-3xl font-bold">
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 {...props} className="mb-3 text-2xl font-semibold">
        {children}
      </h2>
    ),
    p: ({ children, ...props }: any) => (
      <p {...props} className="mb-3 leading-7">
        {children}
      </p>
    ),
    a: ({ href, children, ...props }: any) => {
      if (typeof href === "string") {
        if (href.startsWith("internal:")) {
          const slug = href.slice("internal:".length);
          return (
            <InternalLink
              slug={slug}
              resolvedNote={internalLinks?.[slug]}
              onNavigate={onInternalNavigate}
            >
              {children}
            </InternalLink>
          );
        }

        if (isSlugHref(href)) {
          return (
            <InternalLink
              slug={href}
              resolvedNote={internalLinks?.[href]}
              onNavigate={onInternalNavigate}
            >
              {children}
            </InternalLink>
          );
        }
      }

      return (
        <a {...props} href={href} className="underline underline-offset-4">
          {children}
        </a>
      );
    },
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code {...props} className="rounded bg-muted px-1 py-0.5">
            {children}
          </code>
        );
      }

      const lang = (className || "").match(/language-(\w+)/)?.[1];
      const raw = String(children ?? "").replace(/\n$/, "");

      if (lang === "chord") {
        const data = parseBlockPayload(raw);
        return <ChordBlockPreview data={data} />;
      }
      if (lang === "tab") {
        const data = parseTabBlockBody(raw);
        return <TabBlockPreview data={data} />;
      }
      if (lang === "prog") {
        const data = parseProgressionBlockBody(raw);
        return <ProgressionBlockPreview data={data} />;
      }

      return (
        <pre className="overflow-auto rounded bg-muted p-3 text-sm">
          <code className="font-mono">{raw}</code>
        </pre>
      );
    },
  };
}
