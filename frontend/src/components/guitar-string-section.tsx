"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";

let audioCtx: AudioContext | null = null;
function getAudioContext() {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playGuitarString(frequency: number) {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.round(sampleRate / frequency);
  const noiseBuffer = new Float32Array(bufferSize);
  for (let i = 0; i < bufferSize; i++) noiseBuffer[i] = Math.random() * 2 - 1;

  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  buffer.copyToChannel(noiseBuffer, 0);

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 1.5);
}

export default function GuitarStringsSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const [activeString, setActiveString] = useState<number | null>(null);
  const stringFrequencies = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63]; // EADGBE

  const handlePluck = (index: number) => {
    playGuitarString(stringFrequencies[index]);
    setActiveString(index);
    setTimeout(() => setActiveString(null), 1200); // reset state naturally
  };

  const createWavePath = (amp: number, phase: number) => {
    const segments = 10;
    let path = "M 0 0";
    for (let i = 1; i <= segments; i++) {
      const x = (i / segments) * 800;
      const y = Math.sin((i + phase) * Math.PI * 0.5) * amp;
      path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return path;
  };

  return (
    <section
      ref={ref}
      className="relative h-[80vh] flex flex-col items-center justify-center bg-[#0B0B0B] overflow-hidden border-y border-neutral-900"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00BFA6]/10 to-transparent pointer-events-none" />

      <div className="absolute top-1/2 -translate-y-1/2 text-center px-6 z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Feel Every String
        </h2>
        <p className="text-neutral-400 max-w-xl mx-auto">
          Hover to pluck — all six strings ripple and resonate in EADGBE tuning.
        </p>
      </div>

      <div className="relative flex flex-col justify-center h-full w-full space-y-6 md:space-y-8">
        {[...Array(6)].map((_, i) => {
          const y = useTransform(
            scrollYProgress,
            [0, 1],
            [0, i % 2 === 0 ? 4 : -4]
          );
          const isPlucked = activeString === i;
          const baseAmp = isPlucked ? 12 : 0;
          const phaseOffset = i * 1.5; // gives each string unique movement

          return (
            <motion.svg
              key={i}
              style={{ y }}
              onMouseEnter={() => handlePluck(i)}
              className="w-full h-[6px] overflow-visible cursor-pointer"
              viewBox="0 0 800 10"
              preserveAspectRatio="none"
            >
              <motion.path
                fill="none"
                stroke="#00BFA6"
                strokeWidth="3"
                strokeLinecap="round"
                animate={{
                  d: isPlucked
                    ? [
                        createWavePath(baseAmp, phaseOffset),
                        createWavePath(baseAmp * 0.8, phaseOffset + 1),
                        createWavePath(baseAmp * 0.5, phaseOffset + 2),
                        createWavePath(baseAmp * 0.3, phaseOffset + 3),
                        createWavePath(0, phaseOffset + 4),
                      ]
                    : [createWavePath(0, phaseOffset)],
                  filter: isPlucked
                    ? "drop-shadow(0 0 12px #00BFA6)"
                    : "drop-shadow(0 0 6px #00BFA6)",
                }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                }}
              />
            </motion.svg>
          );
        })}
      </div>
    </section>
  );
}
