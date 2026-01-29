import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">
          {dirty ? "Unsaved changes" : "Up to date"}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <Button size="sm" onClick={onSave} disabled={!dirty || isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
