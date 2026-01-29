import type { NoteSuggestion } from "../types";

type NoteEditorLinkSuggestionsProps = {
  suggestions: NoteSuggestion[];
  activeIndex: number;
  onSelect: (slug: string) => void;
};

export function NoteEditorLinkSuggestions({
  suggestions,
  activeIndex,
  onSelect,
}: NoteEditorLinkSuggestionsProps) {
  return (
    <div className="absolute bottom-3 left-3 z-50 w-64 rounded border bg-background shadow">
      <div className="px-2 py-1 text-xs text-muted-foreground">Link to note</div>
      <div className="max-h-48 overflow-auto py-1">
        {suggestions.map((n, idx) => (
          <button
            key={n.id}
            type="button"
            className={`w-full px-2 py-1 text-left text-sm hover:bg-muted ${
              idx === activeIndex ? "bg-muted" : ""
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(n.slug);
            }}
          >
            <div className="font-medium">{n.title || n.slug}</div>
            <div className="text-xs text-muted-foreground">{n.slug}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
