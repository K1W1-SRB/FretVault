"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Guitar } from "lucide-react";
import { toast } from "sonner";

const createTabSchema = z.object({
  title: z.string().min(2, "Title is required"),
  tuning: z
    .string()
    .regex(/^[A-Ga-g,0-9#b ]+$/, "Invalid tuning format")
    .default("E4,B3,G3,D3,A2,E2"),
  tempo: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? Number(val) : null)),
  timeSigTop: z
    .union([z.string(), z.number()])
    .default("4")
    .transform((val) => Number(val)),
  timeSigBot: z
    .union([z.string(), z.number()])
    .default("4")
    .transform((val) => Number(val)),
  capo: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? Number(val) : 0)),
});

type CreateTabForm = z.infer<typeof createTabSchema>;

export default function NewTabPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const songId = Number(params.id);

  const form = useForm<CreateTabForm>({
    resolver: zodResolver(createTabSchema),
    defaultValues: {
      title: "",
      tuning: "E4,B3,G3,D3,A2,E2",
      tempo: null,
      timeSigTop: 4,
      timeSigBot: 4,
      capo: 0,
    },
  });

  const { register, handleSubmit, setValue, formState } = form;
  const { errors, isSubmitting } = formState;

  async function onSubmit(values: CreateTabForm) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/tabs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, songId }),
      });

      if (!res.ok) throw new Error("Failed to create tab");

      toast.success("Tab created successfully!");
      router.push(`/dashboard/song-library/${songId}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create tab");
    }
  }

  return (
    <section className="flex items-center justify-center min-h-[80vh] p-6">
      <Card className="w-full max-w-2xl border bg-background/60 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Guitar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">
                Create New Tab
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Add a new tab arrangement for this song.
              </p>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Tab Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Main Guitar Part"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tuning">Tuning</Label>
              <Input
                id="tuning"
                placeholder="E4,B3,G3,D3,A2,E2"
                {...register("tuning")}
              />
              {errors.tuning && (
                <p className="text-sm text-destructive">
                  {errors.tuning.message}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="capo">Capo</Label>
                <Input
                  id="capo"
                  type="number"
                  min={0}
                  max={12}
                  {...register("capo")}
                />
              </div>

              <div className="grid gap-2">
                <Label>Preset Templates</Label>
                <Select
                  onValueChange={(v) => {
                    if (v === "E Standard")
                      setValue("tuning", "E4,B3,G3,D3,A2,E2");
                    if (v === "Drop D") setValue("tuning", "E4,B3,G3,D3,A2,D2");
                    if (v === "D Standard")
                      setValue("tuning", "D4,A3,F3,C3,G2,D2");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose preset tuning" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E Standard">E Standard</SelectItem>
                    <SelectItem value="Drop D">Drop D</SelectItem>
                    <SelectItem value="D Standard">D Standard</SelectItem>
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
                "Create Tab"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
