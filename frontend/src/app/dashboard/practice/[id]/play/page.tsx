"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LampDesk } from "lucide-react";

type Exercise = {
  id: number;
  name: string;
  description: string;
  duration: number; // seconds
};

const practicePlan: Exercise[] = [
  {
    id: 1,
    name: "Warm-up: Spider Exercise",
    description:
      "A finger independence exercise to warm up both hands. Play slowly and evenly.",
    duration: 120,
  },
  {
    id: 2,
    name: "Chord Practice",
    description:
      "Practice chord transitions between G, C, D, and E minor. Focus on clean changes.",
    duration: 600,
  },
];

export default function PracticePage() {
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
            Spider Exercise
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-full border-green-300 border-2 w-52 h-52 mx-auto flex align-middle justify-center items-center">
            <p className="text-2xl">5:00</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
