"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  Music2,
  PauseCircle,
} from "lucide-react";

const tunings = {
  "Standard EADGBE": ["E2", "A2", "D3", "G3", "B3", "E4"],
  "Drop D": ["D2", "A2", "D3", "G3", "B3", "E4"],
  "Half Step Down": ["D#2", "G#2", "C#3", "F#3", "A#3", "D#4"],
};

const noteStrings = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export default function GuitarTuner() {
  const [selectedTuning, setSelectedTuning] = useState("Standard EADGBE");
  const [currentStringIndex, setCurrentStringIndex] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [cents, setCents] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);

  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Float32Array | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const getNoteData = (frequency: number) => {
    const noteNumber = 12 * (Math.log(frequency / 440) / Math.log(2)) + 69;
    const n = Math.round(noteNumber);
    return {
      name: noteStrings[n % 12],
      octave: Math.floor(n / 12) - 1,
      diff: Math.floor((noteNumber - n) * 100),
    };
  };

  const autoCorrelate = (buf: Float32Array, sampleRate: number) => {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.0025) return -1; // lower threshold for laptop mics

    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE - i; j++) c[i] += buf[j] * buf[j + i];

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1,
      maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    if (maxpos <= 0) return -1;
    return sampleRate / maxpos;
  };

  const startTuner = async () => {
    if (isListening) return stopTuner();

    try {
      setIsListening(true);
      audioCtx.current = new AudioContext();

      // ✅ Ensure context actually runs after a gesture
      await audioCtx.current.resume();

      const storedDeviceId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("fv-settings-audio-input")
          : null;
      const constraints =
        storedDeviceId && storedDeviceId !== "default"
          ? { audio: { deviceId: { exact: storedDeviceId } } }
          : { audio: true };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;
      source.current = audioCtx.current.createMediaStreamSource(stream);
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 2048;
      dataArray.current = new Float32Array(analyser.current.fftSize);

      // keep the graph alive
      source.current.connect(analyser.current);

      const detectPitch = () => {
        if (!analyser.current || !dataArray.current || !audioCtx.current)
          return;
        analyser.current.getFloatTimeDomainData(
          dataArray.current as Float32Array<ArrayBuffer>
        );

        const freq = autoCorrelate(
          dataArray.current,
          audioCtx.current.sampleRate
        );
        if (freq !== -1 && freq < 1500) {
          const { name, octave, diff } = getNoteData(freq);
          setNote(`${name}${octave}`);
          setFrequency(Math.round(freq));
          setCents(diff);
        }
        rafRef.current = requestAnimationFrame(detectPitch);
      };

      detectPitch();
    } catch (err) {
      console.error("Error accessing mic:", err);
      setIsListening(false);
    }
  };

  const stopTuner = () => {
    setIsListening(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtx.current) {
      audioCtx.current.close();
      audioCtx.current = null;
    }
  };

  const tuningNotes = tunings[selectedTuning as keyof typeof tunings];
  const targetNote = tuningNotes[currentStringIndex];

  const goNextString = () => {
    setCurrentStringIndex((prev) => Math.min(prev + 1, tuningNotes.length - 1));
  };

  const goPrevString = () => {
    setCurrentStringIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-[80vh] p-6 space-y-6">
      <div className="max-w-3xl text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Music2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Guitar Tuner</h1>
        <p className="text-muted-foreground">
          Select a preset and strum your string.
        </p>
      </div>

      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            Tunning
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 ">
          <div className="flex justify-center">
            <Select
              value={selectedTuning}
              onValueChange={(v) => {
                setSelectedTuning(v);
                setCurrentStringIndex(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tuning" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(tunings).map((tuning) => (
                  <SelectItem key={tuning} value={tuning}>
                    {tuning}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={goPrevString}
              disabled={currentStringIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="text-center">
              <p className="text-muted-foreground text-sm">Target String</p>
              <p className="text-3xl font-bold">{targetNote}</p>
            </div>

            <Button
              variant="outline"
              onClick={goNextString}
              disabled={currentStringIndex === tuningNotes.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Detected Note</p>
            <p className="text-5xl font-bold">{note ?? "--"}</p>
            <p className="text-lg text-muted-foreground">
              {frequency ? `${frequency} Hz` : "--"}
            </p>
            <div
              className={`text-sm ${
                Math.abs(cents) < 5 ? "text-green-500" : "text-red-500"
              }`}
            >
              {cents > 0 ? "+" : ""}
              {cents} cents
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={startTuner}
              className="flex items-center gap-2"
              variant={isListening ? "destructive" : "default"}
            >
              {isListening ? (
                <>
                  <PauseCircle className="w-5 h-5" /> Stop
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" /> Start
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
