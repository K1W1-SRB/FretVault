"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notesApi } from "@/lib/notes-api";
import { useSelectedWorkspace } from "@/hooks/selected-workspace-provider";

function normalizeMd(input: string) {
  let s = input ?? "";

  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      s = JSON.parse(s);
    } catch {
      s = s.slice(1, -1);
    }
  }

  s = s.replace(/\\n/g, "\n");
  return s;
}

// --- fenced payload parser: "key: value" per line ---
function parseBlockPayload(body: string) {
  const obj: Record<string, any> = {};
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    obj[key] = value;
  }
  return obj;
}

type StringValue = number | "x"; // 0=open, x=muted, >0 fretted
type FingerValue = number | "x"; // 0 or x means “no finger label”, >0 shows label

function parseCsvLineToStringValues(line?: string): StringValue[] | null {
  if (!line) return null;
  const parts = line
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!parts.length) return null;

  return parts.map((p) => {
    if (p.toLowerCase() === "x") return "x";
    const n = Number(p);
    return Number.isFinite(n) ? n : "x";
  });
}

function parseCsvLineToFingerValues(line?: string): FingerValue[] | null {
  // same parsing rules, just typed differently
  return parseCsvLineToStringValues(line) as FingerValue[] | null;
}

function shapeToStrings(shape?: string): StringValue[] | null {
  // Backwards compat for old: shape: x57565
  // Assumes each char is x or digit(s) — your existing format is ambiguous for 10+ frets.
  // v1: handle single-char frets only.
  if (!shape) return null;
  const s = shape.trim();
  if (!s) return null;

  const out: StringValue[] = [];
  for (const ch of s) {
    if (ch.toLowerCase() === "x") out.push("x");
    else if (ch >= "0" && ch <= "9") out.push(Number(ch));
  }

  return out.length === 6 ? out : null;
}

function ensureSix<T>(arr: T[] | null, fallback: T): T[] {
  if (!arr || arr.length !== 6)
    return Array.from({ length: 6 }).map(() => fallback);
  return arr;
}

function serializeChordBlock(data: {
  name: string;
  strings: StringValue[];
  fingers?: FingerValue[];
}) {
  const name = (data.name ?? "").trim();
  const strings = ensureSix(data.strings, "x" as StringValue);
  const fingers = data.fingers
    ? ensureSix(data.fingers, "x" as FingerValue)
    : null;

  const stringsLine = strings.map(String).join(",");
  const lines = ["```chord", `name: ${name}`, `strings: ${stringsLine}`];

  if (fingers) {
    const fingersLine = fingers.map(String).join(",");
    lines.push(`fingers: ${fingersLine}`);
  }

  lines.push("```", "");
  return lines.join("\n");
}

// Find a ```chord fenced block around a cursor position.
function findChordBlockAtPos(
  md: string,
  pos: number,
): null | {
  start: number;
  end: number;
  bodyStart: number;
  bodyEnd: number;
  body: string;
  data: {
    name?: string;
    strings?: StringValue[];
    fingers?: FingerValue[];
    shape?: string;
  };
} {
  const openRe = /```chord[ \t]*\n/g;
  let openMatch: RegExpExecArray | null = null;

  while (true) {
    const m = openRe.exec(md);
    if (!m) break;
    if (m.index <= pos) openMatch = m;
    else break;
  }
  if (!openMatch) return null;

  const start = openMatch.index;
  const bodyStart = openRe.lastIndex;

  const closeIdx = md.indexOf("\n```", bodyStart);
  if (closeIdx === -1) return null;

  const end = closeIdx + "\n```".length;
  const endWithNl = md[end] === "\n" ? end + 1 : end;

  if (pos < start || pos > endWithNl) return null;

  const bodyEnd = closeIdx;
  const body = md.slice(bodyStart, bodyEnd).replace(/\n$/, "");
  const parsed = parseBlockPayload(body);

  const strings =
    parseCsvLineToStringValues(parsed.strings) ??
    shapeToStrings(parsed.shape) ??
    null;
  const fingers = parseCsvLineToFingerValues(parsed.fingers);

  return {
    start,
    end: endWithNl,
    bodyStart,
    bodyEnd,
    body,
    data: {
      name: parsed.name,
      strings: strings ?? undefined,
      fingers: fingers ?? undefined,
      shape: parsed.shape,
    },
  };
}

function replaceRange(s: string, start: number, end: number, insert: string) {
  return s.slice(0, start) + insert + s.slice(end);
}

function insertAtPos(md: string, pos: number, insert: string) {
  const before = md.slice(0, pos);
  const after = md.slice(pos);

  const needsLeadingNl = before.length > 0 && !before.endsWith("\n\n");
  const leading = needsLeadingNl ? (before.endsWith("\n") ? "\n" : "\n\n") : "";

  const needsTrailingNl = after.length > 0 && !after.startsWith("\n");
  const trailing = needsTrailingNl ? "\n" : "";

  return before + leading + insert + trailing + after;
}

/** ---- SVG CHORD DIAGRAM (matches typical chord chart style) ---- */

function getWindow(strings: StringValue[], fretsToShow: number) {
  const fretted = strings.filter(
    (v) => typeof v === "number" && v > 0,
  ) as number[];
  const min = fretted.length ? Math.min(...fretted) : 1;
  const max = fretted.length ? Math.max(...fretted) : 1;

  if (!fretted.length) return { startFret: 1, showNut: true };
  if (max <= fretsToShow) return { startFret: 1, showNut: true };

  return { startFret: min, showNut: false };
}

function ChordDiagram({
  name,
  strings,
  fingers,
  fretsToShow = 4,
}: {
  name: string;
  strings: StringValue[];
  fingers?: FingerValue[];
  fretsToShow?: number;
}) {
  const W = 150;
  const H = 190;

  const padTop = 28;
  const padLeft = 18;
  const padRight = 18;

  const stroke = "#ffffff";
  const text = "#ffffff";
  const dot = "#ffffff";
  const fingerText = "#ffffff";

  const markerY = padTop + 8;
  const gridTop = padTop + 20;
  const gridBottom = H - 18;
  const gridLeft = padLeft;
  const gridRight = W - padRight;

  const stringCount = 6;
  const fretCount = fretsToShow;

  const gridW = gridRight - gridLeft;
  const gridH = gridBottom - gridTop;

  const stringGap = gridW / (stringCount - 1);
  const fretGap = gridH / fretCount;

  const fixedStrings = ensureSix(strings, "x" as StringValue);
  const fixedFingers = fingers ? ensureSix(fingers, "x" as FingerValue) : null;

  const { startFret, showNut } = getWindow(fixedStrings, fretsToShow);

  const xForString = (i: number) => gridLeft + i * stringGap; // i=0 lowE ... 5 highE
  const yForFretLine = (f: number) => gridTop + f * fretGap; // f=0..fretCount
  const yForFretCenter = (f: number) => gridTop + (f - 0.5) * fretGap; // f=1..fretCount

  const dotR = 7;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block"
      role="img"
      aria-label={`Chord diagram ${name}`}
    >
      {/* Name */}
      <text
        x={W / 2}
        y={16}
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fill={text}
      >
        {name}
      </text>

      {/* Start fret label when not showing nut */}
      {!showNut && (
        <text x={gridLeft - 10} y={gridTop + 12} textAnchor="end" fontSize="10">
          {startFret}
        </text>
      )}

      {/* X / O markers */}
      {fixedStrings.map((v, i) => {
        const x = xForString(i);
        let txt = "";
        if (v === "x") txt = "X";
        else if (typeof v === "number" && v === 0) txt = "O";
        if (!txt) return null;

        return (
          <text
            key={`m-${i}`}
            x={x}
            y={markerY}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill={text}
          >
            {txt}
          </text>
        );
      })}

      {/* Strings */}
      {Array.from({ length: stringCount }).map((_, i) => (
        <line
          key={`s-${i}`}
          x1={xForString(i)}
          y1={gridTop}
          x2={xForString(i)}
          y2={gridBottom}
          stroke={stroke}
          strokeWidth={1}
          color="white"
          className="text-white"
        />
      ))}

      {/* Frets */}
      {Array.from({ length: fretCount + 1 }).map((_, f) => (
        <line
          key={`f-${f}`}
          x1={gridLeft}
          y1={yForFretLine(f)}
          x2={gridRight}
          y2={yForFretLine(f)}
          stroke={stroke}
          strokeWidth={f === 0 && showNut ? 4 : 1}
        />
      ))}

      {/* Dots + finger numbers */}
      {fixedStrings.map((v, i) => {
        if (v === "x") return null;
        if (typeof v === "number" && v === 0) return null;

        const absoluteFret = v as number;
        const relFret = absoluteFret - startFret + 1;
        if (relFret < 1 || relFret > fretsToShow) return null;

        const cx = xForString(i);
        const cy = yForFretCenter(relFret);

        const finger =
          fixedFingers &&
          fixedFingers[i] !== "x" &&
          typeof fixedFingers[i] === "number"
            ? (fixedFingers[i] as number)
            : null;

        return (
          <g key={`d-${i}`}>
            <circle cx={cx} cy={cy} r={dotR} fill={dot} />
            {finger && finger > 0 ? (
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill={fingerText}
              >
                {finger}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function ChordBlockPreview({ data }: { data: any }) {
  const name = data.name ?? "Unnamed chord";

  const strings =
    parseCsvLineToStringValues(data.strings) ??
    shapeToStrings(data.shape) ??
    null;
  const fingers = parseCsvLineToFingerValues(data.fingers);

  const fixedStrings = ensureSix(strings, "x" as StringValue);

  return (
    <div className="mb-3 inline-block rounded border p-3 text-white">
      <ChordDiagram
        name={name}
        strings={fixedStrings}
        fingers={fingers ?? undefined}
      />
    </div>
  );
}

const mdComponents = {
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
  code: ({ inline, className, children, ...props }: any) => {
    if (inline) {
      return (
        <code {...props} className="rounded bg-muted px-1 py-0.5 text-white">
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

    return (
      <pre className="overflow-auto rounded bg-muted p-3 text-sm">
        <code className="font-mono">{raw}</code>
      </pre>
    );
  },
};

function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <select
      className={
        className ?? "h-9 w-full rounded-md border bg-background px-2 text-sm"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function NoteEditor({ activeSlug }: { activeSlug: string | null }) {
  const qc = useQueryClient();
  const { selectedWorkspaceId } = useSelectedWorkspace();

  const noteQuery = useQuery({
    queryKey: ["note", selectedWorkspaceId, activeSlug],
    queryFn: () =>
      notesApi.getBySlug(selectedWorkspaceId as string, activeSlug as string),
    enabled: !!selectedWorkspaceId && !!activeSlug,
  });

  const [draft, setDraft] = React.useState("");
  const [dirty, setDirty] = React.useState(false);

  const taRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [menu, setMenu] = React.useState<null | {
    x: number;
    y: number;
    pos: number;
    hasChordBlock: boolean;
  }>(null);

  const [chordModal, setChordModal] = React.useState<null | {
    mode: "insert" | "edit";
    pos: number;
    range?: { start: number; end: number };
    name: string;
    strings: StringValue[];
    fingers: FingerValue[];
    includeFingers: boolean;
  }>(null);

  React.useEffect(() => {
    if (noteQuery.data) {
      setDraft(normalizeMd(noteQuery.data.contentMd ?? ""));
      setDirty(false);
      return;
    }
    if (selectedWorkspaceId || activeSlug) {
      setDraft("");
      setDirty(false);
    }
  }, [noteQuery.data?.id, selectedWorkspaceId, activeSlug]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkspaceId) return;
      if (!noteQuery.data) return;

      return notesApi.update(selectedWorkspaceId, noteQuery.data.id, {
        contentMd: draft,
      });
    },
    onSuccess: async (updated) => {
      if (!updated) return;

      qc.setQueryData(["note", selectedWorkspaceId, activeSlug], updated);

      await qc.invalidateQueries({
        queryKey: ["notes", selectedWorkspaceId],
      });

      setDirty(false);
    },
  });

  function openContextMenu(e: React.MouseEvent) {
    e.preventDefault();

    const el = taRef.current;
    if (!el) return;

    const pos = el.selectionStart ?? 0;
    const chord = findChordBlockAtPos(draft, pos);

    setMenu({
      x: e.clientX,
      y: e.clientY,
      pos,
      hasChordBlock: !!chord,
    });
  }

  function closeContextMenu() {
    setMenu(null);
  }

  function openInsertChord(pos: number) {
    closeContextMenu();
    setChordModal({
      mode: "insert",
      pos,
      name: "",
      strings: ["x", "x", "x", "x", "x", "x"],
      fingers: ["x", "x", "x", "x", "x", "x"],
      includeFingers: false,
    });
  }

  function openEditChord(pos: number) {
    closeContextMenu();
    const chord = findChordBlockAtPos(draft, pos);
    if (!chord) return;

    const strings = ensureSix(chord.data.strings ?? null, "x" as StringValue);
    const fingers = ensureSix(chord.data.fingers ?? null, "x" as FingerValue);

    setChordModal({
      mode: "edit",
      pos,
      range: { start: chord.start, end: chord.end },
      name: chord.data.name ?? "",
      strings,
      fingers,
      includeFingers: (chord.data.fingers?.length ?? 0) === 6,
    });
  }

  function applyChordModal() {
    if (!chordModal) return;

    const block = serializeChordBlock({
      name: chordModal.name.trim(),
      strings: chordModal.strings,
      fingers: chordModal.includeFingers ? chordModal.fingers : undefined,
    });

    setDraft((prev) => {
      if (chordModal.mode === "insert") {
        return insertAtPos(prev, chordModal.pos, block);
      }
      if (!chordModal.range) return prev;
      return replaceRange(
        prev,
        chordModal.range.start,
        chordModal.range.end,
        block,
      );
    });

    setDirty(true);
    setChordModal(null);

    requestAnimationFrame(() => {
      taRef.current?.focus();
    });
  }

  const fretOptions = React.useMemo(() => {
    // keep v1 simple. expand later.
    const nums = Array.from({ length: 25 }).map((_, i) => String(i)); // 0..24
    return ["x", ...nums];
  }, []);

  const fingerOptions = React.useMemo(() => {
    // x = no label; 1..4 are typical
    return ["x", "1", "2", "3", "4"];
  }, []);

  if (!activeSlug) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Pick a note from the left.
      </div>
    );
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a workspace.
      </div>
    );
  }

  if (noteQuery.isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading note...</div>
    );
  }

  if (noteQuery.isError || !noteQuery.data) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Failed to load note.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" onClick={closeContextMenu}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {noteQuery.data.title || "Untitled"}
          </div>
          <div className="text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : "Up to date"}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="write" className="h-full">
          <div className="border-b px-3 py-2">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="write" className="m-0 h-[calc(100%-48px)] p-3">
            <Textarea
              ref={taRef as any}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDirty(true);
              }}
              onContextMenu={openContextMenu}
              className="h-full resize-none font-mono"
              placeholder="Write markdown... Right-click to insert/edit chord blocks."
            />

            {menu && (
              <div
                className="fixed z-50 w-56 rounded border bg-background p-1 shadow"
                style={{ left: menu.x, top: menu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => openInsertChord(menu.pos)}
                >
                  Insert chord block
                </button>

                <button
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  disabled={!menu.hasChordBlock}
                  onClick={() => openEditChord(menu.pos)}
                >
                  Edit chord block
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="preview"
            className="m-0 h-[calc(100%-48px)] overflow-auto p-4"
          >
            <div className="prose max-w-none">
              <ReactMarkdown components={mdComponents}>
                {normalizeMd(draft) || "_Nothing to preview._"}
              </ReactMarkdown>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {chordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setChordModal(null)}
        >
          <div
            className="w-full max-w-lg rounded border bg-background p-4 shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium">
              {chordModal.mode === "insert" ? "Insert chord" : "Edit chord"}
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">Name</div>
                <Input
                  value={chordModal.name}
                  onChange={(e) =>
                    setChordModal((m) =>
                      m ? { ...m, name: e.target.value } : m,
                    )
                  }
                  placeholder="Dm7"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">
                  Strings (low E → high E)
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {chordModal.strings.map((v, idx) => (
                    <div key={`s-${idx}`} className="grid gap-1">
                      <div className="text-[10px] text-muted-foreground text-center">
                        {["E", "A", "D", "G", "B", "e"][idx]}
                      </div>
                      <Select
                        value={String(v)}
                        options={fretOptions}
                        onChange={(val) => {
                          const parsed: StringValue =
                            val === "x" ? "x" : (Number(val) as number);
                          setChordModal((m) => {
                            if (!m) return m;
                            const next = m.strings.slice();
                            next[idx] = parsed;
                            return { ...m, strings: next };
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="text-xs text-muted-foreground">
                    Finger numbers (optional)
                  </div>
                  <button
                    className="text-xs underline"
                    onClick={() =>
                      setChordModal((m) =>
                        m ? { ...m, includeFingers: !m.includeFingers } : m,
                      )
                    }
                  >
                    {chordModal.includeFingers ? "Disable" : "Enable"}
                  </button>
                </div>

                {chordModal.includeFingers && (
                  <div className="grid grid-cols-6 gap-2">
                    {chordModal.fingers.map((v, idx) => (
                      <div key={`f-${idx}`} className="grid gap-1">
                        <div className="text-[10px] text-muted-foreground text-center">
                          {["E", "A", "D", "G", "B", "e"][idx]}
                        </div>
                        <Select
                          value={String(v)}
                          options={fingerOptions}
                          onChange={(val) => {
                            const parsed: FingerValue =
                              val === "x" ? "x" : (Number(val) as number);
                            setChordModal((m) => {
                              if (!m) return m;
                              const next = m.fingers.slice();
                              next[idx] = parsed;
                              return { ...m, fingers: next };
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2">
                  Preview:
                </div>
                <div className="rounded border p-3 inline-block">
                  <ChordDiagram
                    name={chordModal.name || "Chord"}
                    strings={chordModal.strings}
                    fingers={
                      chordModal.includeFingers ? chordModal.fingers : undefined
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setChordModal(null)}>
                Cancel
              </Button>
              <Button onClick={applyChordModal}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
