"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExportPerformanceMp4Input } from "@/lib/performance-api";

type ExportProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: ExportPerformanceMp4Input) => Promise<void> | void;
};

type ExportFormState = {
  fileName: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  trackNumber: string;
  composer: string;
  comment: string;
  coverImage: File | null;
};

function createInitialForm(projectName: string): ExportFormState {
  const trimmed = projectName.trim() || "performance-export";
  return {
    fileName: trimmed,
    title: trimmed,
    artist: "",
    album: "",
    genre: "",
    year: "",
    trackNumber: "",
    composer: "",
    comment: "",
    coverImage: null,
  };
}

export function ExportProjectDialog({
  open,
  onOpenChange,
  projectName,
  submitting,
  error,
  onSubmit,
}: ExportProjectDialogProps) {
  const [form, setForm] = useState<ExportFormState>(() =>
    createInitialForm(projectName),
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(createInitialForm(projectName));
    setFormError(null);
  }, [open, projectName]);

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setForm((current) => ({ ...current, coverImage: null }));
      return;
    }

    const type = file.type.toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
      setFormError("Cover image must be a JPG, PNG, or WEBP file.");
      event.target.value = "";
      return;
    }

    setFormError(null);
    setForm((current) => ({ ...current, coverImage: file }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const fileName = form.fileName.trim();
    const title = form.title.trim();
    const artist = form.artist.trim();
    const album = form.album.trim();
    const genre = form.genre.trim();
    const composer = form.composer.trim();
    const comment = form.comment.trim();

    if (!fileName) {
      setFormError("Final file name is required.");
      return;
    }
    if (!title) {
      setFormError("Song title is required.");
      return;
    }
    if (!artist) {
      setFormError("Artist is required.");
      return;
    }

    const payload: ExportPerformanceMp4Input = {
      fileName,
      title,
      artist,
      album: album || undefined,
      genre: genre || undefined,
      composer: composer || undefined,
      comment: comment || undefined,
      coverImage: form.coverImage,
    };

    if (form.year.trim()) {
      const year = Number(form.year);
      if (!Number.isInteger(year) || year < 1000 || year > 3000) {
        setFormError("Year must be between 1000 and 3000.");
        return;
      }
      payload.year = year;
    }

    if (form.trackNumber.trim()) {
      const trackNumber = Number(form.trackNumber);
      if (
        !Number.isInteger(trackNumber) ||
        trackNumber < 1 ||
        trackNumber > 999
      ) {
        setFormError("Track number must be between 1 and 999.");
        return;
      }
      payload.trackNumber = trackNumber;
    }

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Project as MP4</DialogTitle>
          <DialogDescription>
            Set filename, metadata, and optional cover artwork for the final
            MP4.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="export-file-name">File name</Label>
            <Input
              id="export-file-name"
              value={form.fileName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fileName: event.target.value,
                }))
              }
              placeholder="my-performance"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="export-title">Title</Label>
              <Input
                id="export-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Song title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="export-artist">Artist</Label>
              <Input
                id="export-artist"
                value={form.artist}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    artist: event.target.value,
                  }))
                }
                placeholder="Artist name"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="export-album">Album</Label>
              <Input
                id="export-album"
                value={form.album}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    album: event.target.value,
                  }))
                }
                placeholder="Album name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="export-genre">Genre</Label>
              <Input
                id="export-genre"
                value={form.genre}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    genre: event.target.value,
                  }))
                }
                placeholder="Genre"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="export-year">Year</Label>
              <Input
                id="export-year"
                type="number"
                min={1000}
                max={3000}
                value={form.year}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    year: event.target.value,
                  }))
                }
                placeholder="2026"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="export-track-number">Track number</Label>
              <Input
                id="export-track-number"
                type="number"
                min={1}
                max={999}
                value={form.trackNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    trackNumber: event.target.value,
                  }))
                }
                placeholder="1"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="export-composer">Composer</Label>
            <Input
              id="export-composer"
              value={form.composer}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  composer: event.target.value,
                }))
              }
              placeholder="Composer (optional)"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="export-comment">Comment</Label>
            <Textarea
              id="export-comment"
              value={form.comment}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  comment: event.target.value,
                }))
              }
              placeholder="Notes for this version"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="export-cover-image">Cover image (optional)</Label>
            <Input
              id="export-cover-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
            />
            <p className="text-xs text-muted-foreground">
              {form.coverImage
                ? `Selected: ${form.coverImage.name}`
                : "If omitted, a default square cover is generated."}
            </p>
          </div>

          {(formError || error) && (
            <p className="text-sm text-destructive">{formError || error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Exporting..." : "Export MP4"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
