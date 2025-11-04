"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LampDesk, Loader2, Play, Pause, CheckCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

type Exercise = {
  id: number;
  title: string;
  description: string | null;
  duration: number; // in minutes
  order: number;
};

export default function PracticePage() {
  const params = useParams();
  const id = params?.id;
  const [practiceItems, setPracticeItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch practice items
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

        const sorted = resJson.sort(
          (a: Exercise, b: Exercise) => a.order - b.order
        );
        setPracticeItems(sorted);
        setTimeLeft(sorted[0]?.duration * 60 || 0);
      } catch (e) {
        console.error(e);
        setPracticeItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const handlePlayPause = () => {
    setIsRunning((prev) => !prev);
  };

  const handleNext = () => {
    setIsRunning(false);
    setCurrentIndex((prev) => {
      const nextIndex = Math.min(prev + 1, practiceItems.length - 1);
      setTimeLeft(practiceItems[nextIndex]?.duration * 60 || 0);
      return nextIndex;
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <section className="min-h-[70vh] grid place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading data
        </div>
      </section>
    );
  }

  if (!practiceItems.length) {
    return (
      <section className="min-h-[70vh] grid place-items-center">
        <p className="text-muted-foreground">No practice items found.</p>
      </section>
    );
  }

  const currentItem = practiceItems[currentIndex];
  const isLast = currentIndex === practiceItems.length - 1;

  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-start py-16 px-6">
      <div className="max-w-3xl text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <LampDesk />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Practice Session
        </h1>
        <p>Click play to start your current exercise timer.</p>
      </div>

      <Card className="w-full max-w-2xl border bg-background/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-center font-semibold">
            {currentItem.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <div className="rounded-full border-green-300 border-2 w-52 h-52 mx-auto flex items-center justify-center">
            <p className="text-4xl font-mono">{formatTime(timeLeft)}</p>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={handlePlayPause}>
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Play
                </>
              )}
            </Button>

            {!isRunning && timeLeft === 0 && !isLast && (
              <Button onClick={handleNext} className="">
                Next
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            {currentIndex + 1} / {practiceItems.length} exercises
          </p>

          {isLast && timeLeft === 0 && (
            <div className="flex flex-col items-center text-green-600 mt-4">
              <CheckCircle className="w-8 h-8 mb-2" />
              <p className="font-semibold">All exercises complete!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
