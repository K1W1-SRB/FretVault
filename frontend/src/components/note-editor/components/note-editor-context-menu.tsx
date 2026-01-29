import type { ContextMenuState } from "../types";

type NoteEditorContextMenuProps = {
  menu: ContextMenuState;
  onInsertChord: (pos: number) => void;
  onEditChord: (pos: number) => void;
  onInsertTab: (pos: number) => void;
  onEditTab: (pos: number) => void;
  onInsertProgression: (pos: number) => void;
  onEditProgression: (pos: number) => void;
  onInsertPractice: (pos: number) => void;
  onEditPractice: (pos: number) => void;
};

export function NoteEditorContextMenu({
  menu,
  onInsertChord,
  onEditChord,
  onInsertTab,
  onEditTab,
  onInsertProgression,
  onEditProgression,
  onInsertPractice,
  onEditPractice,
}: NoteEditorContextMenuProps) {
  return (
    <div
      className="fixed z-50 w-56 rounded border bg-background p-1 shadow"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
        onClick={() => onInsertChord(menu.pos)}
      >
        Insert chord block
      </button>

      <button
        className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
        disabled={!menu.hasChordBlock}
        onClick={() => onEditChord(menu.pos)}
      >
        Edit chord block
      </button>

      <button
        className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
        onClick={() => onInsertTab(menu.pos)}
      >
        Insert tab block
      </button>

      <button
        className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
        disabled={!menu.hasTabBlock}
        onClick={() => onEditTab(menu.pos)}
      >
        Edit tab block
      </button>

      <button
        className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
        onClick={() => onInsertProgression(menu.pos)}
      >
        Insert progression block
      </button>

      <button
        className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
        disabled={!menu.hasProgBlock}
        onClick={() => onEditProgression(menu.pos)}
      >
        Edit progression block
      </button>

      <button
        className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
        onClick={() => onInsertPractice(menu.pos)}
      >
        Insert practice routine block
      </button>

      <button
        className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
        disabled={!menu.hasPracticeBlock}
        onClick={() => onEditPractice(menu.pos)}
      >
        Edit practice routine block
      </button>
    </div>
  );
}
