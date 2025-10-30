"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LampDesk, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Exercise = {
  id: number;
  title: string;
  description: string;
  duration: number; // seconds
};

export default function PracticePage() {
  const params = useParams();
  const id = params?.id;
  const [practiceItems, setPracticeItems] = useState([]);
  const [loading, setLoading] = useState(true);

  let index = 0;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/practice-items/plans/${id}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("failed to fetch items");

        const resJson = await res.json();

        if (cancelled) return;

        setPracticeItems(resJson);
      } catch (e) {
        console.error(e);
        setPracticeItems(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  console.log(practiceItems[0]);

  if (loading) {
    return (
      <section className="min-h-[70vh] grid place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading data
        </div>
      </section>
    );
  }
  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-start py-16 px-6">
      <div className="max-w-3xl text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <LampDesk />
          </div>
        </div>
        <h1 className="text-3xl m font-bold tracking-tight mb-2">
          Practice Session
        </h1>
        <p>Select what you wanna practice in this session</p>
      </div>

      <Card className="w-full max-w-2xl border bg-background/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-center font-semibold">
            {practiceItems[index].title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-full border-green-300 border-2 w-52 h-52 mx-auto flex align-middle justify-center items-center">
            <p className="text-2xl">{practiceItems[index].duration}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
