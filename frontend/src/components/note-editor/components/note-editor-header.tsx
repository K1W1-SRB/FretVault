import { Button } from "@/components/ui/button";

type NoteEditorHeaderProps = {
  title: string;
  dirty: boolean;
  isSaving: boolean;
  onSave: () => void;
};

export function NoteEditorHeader({
  title,
  dirty,
  isSaving,
  onSave,
}: NoteEditorHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">
          {dirty ? "Unsaved changes" : "Up to date"}
        </div>
      </div>

      <Button size="sm" onClick={onSave} disabled={!dirty || isSaving}>
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
