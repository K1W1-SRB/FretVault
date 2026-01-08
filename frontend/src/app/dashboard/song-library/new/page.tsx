"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Music2 } from "lucide-react";
import { toast } from "sonner";

const createSongSchema = z.object({
  title: z.string().min(2, "Title is required"),
  artist: z.string().optional(),
  key: z.string().optional(),
  tempo: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val === undefined || val === "" ? null : Number(val))),
  timeSigTop: z
    .union([z.string(), z.number()])
    .default("4")
    .transform((val) => (val === undefined || val === "" ? null : Number(val))),
  timeSigBot: z
    .union([z.string(), z.number()])
    .default("4")
    .transform((val) => (val === undefined || val === "" ? null : Number(val))),
  visibility: z.enum(["PRIVATE", "PUBLIC", "UNLISTED"]),
});

type CreateSongFormInput = z.input<typeof createSongSchema>;
type CreateSongForm = z.output<typeof createSongSchema>; // transformed output

export default function NewSongPage() {
  const router = useRouter();

  const form = useForm<CreateSongFormInput, unknown, CreateSongForm>({
    resolver: zodResolver(createSongSchema),
    defaultValues: {
      title: "",
      artist: "",
      key: "",
      tempo: undefined,
      timeSigTop: 4,
      timeSigBot: 4,
      visibility: "PRIVATE",
    },
  });

  async function onSubmit(values: CreateSongForm) {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_API + "/songs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to create song");
      toast.success("Song created successfully!");
      router.push("/dashboard/song-library");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create song");
    }
  }

  const { handleSubmit, register, setValue, formState } = form;
  const { errors, isSubmitting } = formState;

  return (
    <section className="relative min-h-[80vh]  flex flex-col items-center justify-start py-16 px-6">
      {/* Header / Hero */}
      <div className="max-w-3xl text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Music2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Create a New Song
        </h1>
        <p className="text-muted-foreground">
          Add a new song to your library and start building your tabs.
        </p>
      </div>

      {/* Form */}
      <Card className="w-full max-w-2xl border bg-background/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Song Information
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. My Kind of Woman"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                placeholder="e.g. Mac DeMarco"
                {...register("artist")}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  placeholder="e.g. A major"
                  {...register("key")}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tempo">Tempo (BPM)</Label>
                <Input
                  id="tempo"
                  type="number"
                  min={40}
                  max={300}
                  placeholder="e.g. 92"
                  {...register("tempo")}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>Time Signature</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    {...register("timeSigTop")}
                    className="text-center"
                  />
                  <span className="text-xl font-medium">/</span>
                  <Input
                    type="number"
                    min={1}
                    max={16}
                    {...register("timeSigBot")}
                    className="text-center"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  onValueChange={(v) =>
                    setValue(
                      "visibility",
                      v as "PRIVATE" | "PUBLIC" | "UNLISTED"
                    )
                  }
                  defaultValue="PRIVATE"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="UNLISTED">Unlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t mt-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Create Song"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
