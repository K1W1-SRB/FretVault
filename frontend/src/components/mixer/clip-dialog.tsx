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

import { type ClipFormState } from "./types";

type ClipUploadStep = "idle" | "presign" | "upload" | "finalize" | "create";

type ClipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipTrackName: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  clipRecording: boolean;
  clipUploadStep: ClipUploadStep;
  clipRecordingUrl: string | null;
  clipInputLevel: number;
  clipRecordingError: string | null;
  clipMetadataLoading: boolean;
  clipBusyLabel: string;
  clipBusy: boolean;
  clipForm: ClipFormState;
  clipFormError: string | null;
  setClipForm: Dispatch<SetStateAction<ClipFormState>>;
  onClipFileChange: (file: File | null) => void;
  onClipRecordStart: () => void;
  onClipRecordStop: () => void;
  onClearRecording: () => void;
};

export function ClipDialog({
  open,
  onOpenChange,
  clipTrackName,
  onSubmit,
  clipRecording,
  clipUploadStep,
  clipRecordingUrl,
  clipInputLevel,
  clipRecordingError,
  clipMetadataLoading,
  clipBusyLabel,
  clipBusy,
  clipForm,
  clipFormError,
  setClipForm,
  onClipFileChange,
  onClipRecordStart,
  onClipRecordStop,
  onClearRecording,
}: ClipDialogProps) {
  const toSeconds = (ms: number) => ms / 1000;
  const toMs = (seconds: number) => Math.round(seconds * 1000);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add clip</DialogTitle>
          <DialogDescription>Upload audio for {clipTrackName}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label>Record</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={clipRecording ? "destructive" : "secondary"}
                onClick={() =>
                  clipRecording ? onClipRecordStop() : onClipRecordStart()
                }
                disabled={clipUploadStep !== "idle"}
              >
                {clipRecording ? "Stop recording" : "Start recording"}
              </Button>
              {clipRecordingUrl && !clipRecording && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClearRecording}
                  disabled={clipBusy}
                >
                  Clear recording
                </Button>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round(clipInputLevel * 100)}%` }}
              />
            </div>
            {clipRecordingError && (
              <div className="text-xs text-destructive">{clipRecordingError}</div>
            )}
            {clipRecordingUrl && !clipRecording && (
              <audio className="w-full" controls src={clipRecordingUrl} />
            )}
            {clipRecording && (
              <p className="text-xs text-muted-foreground">
                Recording... speak or play for at least a second.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="clip-file">Audio file</Label>
            <Input
              id="clip-file"
              type="file"
              accept="audio/*"
              onChange={(event) => onClipFileChange(event.target.files?.[0] ?? null)}
              disabled={clipBusy}
            />
            {clipMetadataLoading && (
              <p className="text-xs text-muted-foreground">
                Detecting audio metadata...
              </p>
            )}
            {clipForm.file && (
              <p className="text-xs text-muted-foreground">{clipForm.file.name}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="clip-start">Start (s)</Label>
              <Input
                id="clip-start"
                type="number"
                min={0}
                step={0.001}
                value={toSeconds(clipForm.startMs)}
                onChange={(event) =>
                  setClipForm((prev) => ({
                    ...prev,
                    startMs: toMs(Number(event.target.value)),
                  }))
                }
                disabled={clipBusy}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clip-duration">Clip duration (s)</Label>
              <Input
                id="clip-duration"
                type="number"
                min={0.001}
                step={0.001}
                value={toSeconds(clipForm.clipDurationMs)}
                onChange={(event) =>
                  setClipForm((prev) => ({
                    ...prev,
                    clipDurationMs: toMs(Number(event.target.value)),
                  }))
                }
                disabled={clipBusy}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="clip-offset">Offset in asset (s)</Label>
              <Input
                id="clip-offset"
                type="number"
                min={0}
                step={0.001}
                value={toSeconds(clipForm.offsetInAssetMs)}
                onChange={(event) =>
                  setClipForm((prev) => ({
                    ...prev,
                    offsetInAssetMs: toMs(Number(event.target.value)),
                  }))
                }
                disabled={clipBusy}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-duration">Asset duration (s)</Label>
              <Input
                id="asset-duration"
                type="number"
                min={0.001}
                step={0.001}
                value={
                  clipForm.assetDurationMs == null
                    ? ""
                    : toSeconds(clipForm.assetDurationMs)
                }
                onChange={(event) =>
                  setClipForm((prev) => ({
                    ...prev,
                    assetDurationMs:
                      event.target.value === ""
                        ? null
                        : toMs(Number(event.target.value)),
                  }))
                }
                disabled={clipBusy}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="asset-sample-rate">Sample rate (Hz)</Label>
              <Input
                id="asset-sample-rate"
                type="number"
                min={8000}
                value={clipForm.sampleRate}
                onChange={(event) =>
                  setClipForm((prev) => ({
                    ...prev,
                    sampleRate: Number(event.target.value),
                  }))
                }
                disabled={clipBusy}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-channels">Channels</Label>
              <Input
                id="asset-channels"
                type="number"
                min={1}
                max={8}
                value={clipForm.channels}
                onChange={(event) =>
                  setClipForm((prev) => ({
                    ...prev,
                    channels: Number(event.target.value),
                  }))
                }
                disabled={clipBusy}
              />
            </div>
          </div>
          {clipBusyLabel && (
            <div className="text-xs text-muted-foreground">{clipBusyLabel}</div>
          )}
          {clipFormError && <div className="text-sm text-destructive">{clipFormError}</div>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={clipBusy}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={clipBusy}>
              {clipBusy ? "Uploading..." : "Upload clip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
