import { type Dispatch, type FormEvent, type SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditClipForm = {
  startMs: number;
  durationMs: number;
  offsetInAssetMs: number;
};

type EditClipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  editClipForm: EditClipForm;
  setEditClipForm: Dispatch<SetStateAction<EditClipForm>>;
  editClipError: string | null;
};

export function EditClipDialog({
  open,
  onOpenChange,
  onSubmit,
  editClipForm,
  setEditClipForm,
  editClipError,
}: EditClipDialogProps) {
  const toSeconds = (ms: number) => ms / 1000;
  const toMs = (seconds: number) => Math.round(seconds * 1000);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit clip</DialogTitle>
          <DialogDescription>
            Adjust timing and offsets for this clip.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="edit-clip-start">Start (s)</Label>
            <Input
              id="edit-clip-start"
              type="number"
              min={0}
              step={0.001}
              value={toSeconds(editClipForm.startMs)}
              onChange={(event) =>
                setEditClipForm((prev) => ({
                  ...prev,
                  startMs: toMs(Number(event.target.value)),
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-clip-duration">Duration (s)</Label>
            <Input
              id="edit-clip-duration"
              type="number"
              min={0.001}
              step={0.001}
              value={toSeconds(editClipForm.durationMs)}
              onChange={(event) =>
                setEditClipForm((prev) => ({
                  ...prev,
                  durationMs: toMs(Number(event.target.value)),
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-clip-offset">Offset in asset (s)</Label>
            <Input
              id="edit-clip-offset"
              type="number"
              min={0}
              step={0.001}
              value={toSeconds(editClipForm.offsetInAssetMs)}
              onChange={(event) =>
                setEditClipForm((prev) => ({
                  ...prev,
                  offsetInAssetMs: toMs(Number(event.target.value)),
                }))
              }
            />
          </div>
          {editClipError && <div className="text-sm text-destructive">{editClipError}</div>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
