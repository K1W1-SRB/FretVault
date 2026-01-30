import { Button } from "@/components/ui/button";

type NoteEditorToolbarProps = {
  onPrefixLines: (prefix: string) => void;
  onWrapSelection: (prefix: string, suffix: string, placeholder: string) => void;
  onInsertCodeBlock: () => void;
  onInsertLink: () => void;
  onInsertChordBlock: () => void;
  onInsertScaleBlock: () => void;
  onInsertTabBlock: () => void;
  onInsertProgressionBlock: () => void;
  onInsertPracticeBlock: () => void;
};

export function NoteEditorToolbar({
  onPrefixLines,
  onWrapSelection,
  onInsertCodeBlock,
  onInsertLink,
  onInsertChordBlock,
  onInsertScaleBlock,
  onInsertTabBlock,
  onInsertProgressionBlock,
  onInsertPracticeBlock,
}: NoteEditorToolbarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onPrefixLines("# ")}
        >
          H1
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onPrefixLines("## ")}
        >
          H2
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onPrefixLines("### ")}
        >
          H3
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onWrapSelection("**", "**", "bold text")}
        >
          Bold
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onWrapSelection("*", "*", "italic text")}
        >
          Italic
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onWrapSelection("`", "`", "code")}
        >
          Code
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onInsertCodeBlock}>
          Code block
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onInsertLink}>
          Link
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onPrefixLines("> ")}
        >
          Quote
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onPrefixLines("- ")}
        >
          Bulleted
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onPrefixLines("1. ")}
        >
          Numbered
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onInsertChordBlock}>
          Chord block
        </Button>
        <Button type="button" size="sm" onClick={onInsertScaleBlock}>
          Scale block
        </Button>
        <Button type="button" size="sm" onClick={onInsertTabBlock}>
          Tab block
        </Button>
        <Button type="button" size="sm" onClick={onInsertProgressionBlock}>
          Progression
        </Button>
        <Button type="button" size="sm" onClick={onInsertPracticeBlock}>
          Practice routine
        </Button>
      </div>
    </div>
  );
}
