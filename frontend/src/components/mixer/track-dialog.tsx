import { type Dispatch, type FormEvent, type SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { type PerformanceTrack } from "@/lib/performance-api";

import { type TrackFormState } from "./types";

type TrackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTrack: PerformanceTrack | null;
  trackForm: TrackFormState;
  setTrackForm: Dispatch<SetStateAction<TrackFormState>>;
  trackFormError: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
};

export function TrackDialog({
  open,
  onOpenChange,
  editingTrack,
  trackForm,
  setTrackForm,
  trackFormError,
  onSubmit,
  submitting,
}: TrackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingTrack ? "Edit track" : "New track"}</DialogTitle>
          <DialogDescription>
            Configure the core mix controls for this track.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="track-name">Track name</Label>
            <Input
              id="track-name"
              value={trackForm.name}
              onChange={(event) =>
                setTrackForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Guitar"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="track-gain">Gain (dB)</Label>
              <Input
                id="track-gain"
                type="number"
                min={-60}
                max={12}
                step={0.1}
                value={trackForm.gainDb}
                onChange={(event) =>
                  setTrackForm((prev) => ({
                    ...prev,
                    gainDb: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="track-pan">Pan</Label>
              <Input
                id="track-pan"
                type="number"
                min={-1}
                max={1}
                step={0.05}
                value={trackForm.pan}
                onChange={(event) =>
                  setTrackForm((prev) => ({
                    ...prev,
                    pan: Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={trackForm.mute}
                onCheckedChange={(value) =>
                  setTrackForm((prev) => ({
                    ...prev,
                    mute: Boolean(value),
                  }))
                }
              />
              Mute
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={trackForm.solo}
                onCheckedChange={(value) =>
                  setTrackForm((prev) => ({
                    ...prev,
                    solo: Boolean(value),
                  }))
                }
              />
              Solo
            </label>
          </div>
          {trackFormError && (
            <div className="text-sm text-destructive">{trackFormError}</div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {editingTrack ? "Save changes" : "Create track"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
