type MdNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
};

const INTERNAL_LINK_RE = /\[\[([a-z0-9_-]+)(?:\|([^\]]+))?\]\]/g;

function isSafeInternalToken(source: string, start: number, end: number) {
  const before = start > 0 ? source[start - 1] : "";
  const after = end < source.length ? source[end] : "";
  if (before === "[" || after === "]") return false;
  if (after === "(") return false;
  return true;
}

function splitInternalLinks(value: string) {
  const parts: Array<
    | { type: "text"; value: string }
    | { type: "internal"; slug: string; label: string }
  > = [];

  INTERNAL_LINK_RE.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INTERNAL_LINK_RE.exec(value)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (!isSafeInternalToken(value, start, end)) continue;

    if (start > lastIndex) {
      parts.push({ type: "text", value: value.slice(lastIndex, start) });
    }

    const slug = match[1];
    const alias = match[2]?.trim();
    parts.push({ type: "internal", slug, label: alias || slug });
    lastIndex = end;
  }

  if (lastIndex < value.length) {
    parts.push({ type: "text", value: value.slice(lastIndex) });
  }

  return parts;
}

function stripCode(markdown: string) {
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, "");
  return withoutFences.replace(/`[^`]*`/g, "");
}

export function extractInternalLinkSlugs(markdown: string) {
  const cleaned = stripCode(markdown ?? "");
  const slugs = new Set<string>();

  INTERNAL_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INTERNAL_LINK_RE.exec(cleaned)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (!isSafeInternalToken(cleaned, start, end)) continue;
    slugs.add(match[1]);
  }

  return Array.from(slugs).sort();
}

export function remarkInternalLinks() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (!node.children || node.children.length === 0) return;

      const nextChildren: MdNode[] = [];

      for (const child of node.children) {
        if (child.type === "code" || child.type === "inlineCode") {
          nextChildren.push(child);
          continue;
        }

        if (
          child.type === "link" ||
          child.type === "linkReference" ||
          child.type === "definition"
        ) {
          nextChildren.push(child);
          continue;
        }

        if (child.type === "text") {
          const parts = splitInternalLinks(child.value ?? "");
          if (parts.length === 1 && parts[0].type === "text") {
            nextChildren.push(child);
            continue;
          }

          for (const part of parts) {
            if (part.type === "text") {
              if (part.value) {
                nextChildren.push({ type: "text", value: part.value });
              }
              continue;
            }

            nextChildren.push({
              type: "link",
              url: `internal:${part.slug}`,
              children: [{ type: "text", value: part.label }],
            });
          }

          continue;
        }

        walk(child);
        nextChildren.push(child);
      }

      node.children = nextChildren;
    };

    walk(tree);
  };
}
