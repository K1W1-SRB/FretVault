"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Description } from "@radix-ui/react-dialog";
import { Loader2, Newspaper } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

const createPlanSchema = z.object({
  name: z.string().min(2, "Title is required"),
  description: z.string().optional(),
});

type CreatePlanForm = z.infer<typeof createPlanSchema>;

export default function page() {
  const router = useRouter();

  const form = useForm<CreatePlanForm>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function onSubmit(values: CreatePlanForm) {
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_API + "/practice-plans",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );

      if (!res.ok) throw new Error("Failed to create Plan");
      toast.success("Plan created successfully!");
      router.push("/dashboard/practice");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create plan");
    }
  }

  const { handleSubmit, register, setValue, formState } = form;
  const { errors, isSubmitting } = formState;
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-start py-16 px-6">
      <div className="max-w-3xl text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Newspaper className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Create a New Plan
        </h1>
        <p className="text-muted-foreground">Add a new practice plan</p>
      </div>

      <Card className="w-full max-w-2xl border bg-background/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Plan information
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Morning Practice Plan"
                {...register("name")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Morning warmup practice"
                {...register("description")}
              />
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
                "Create Plan"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
