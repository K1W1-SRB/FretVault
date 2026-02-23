export type Channel = {
  id: string;
  label: string;
  type: "midi" | "audio" | "return" | "master";
  accent: string;
  gain: number;
  pan: number;
  armed?: boolean;
  monitor?: boolean;
  muted?: boolean;
  solo?: boolean;
};

export type TrackFormState = {
  name: string;
  gainDb: number;
  pan: number;
  mute: boolean;
  solo: boolean;
};

export type ClipFormState = {
  file: File | null;
  contentType: string;
  fileExt: string;
  startMs: number;
  clipDurationMs: number;
  offsetInAssetMs: number;
  assetDurationMs: number | null;
  sampleRate: number;
  channels: number;
  waveformPeaks: number[] | null;
};

export const defaultTrackForm: TrackFormState = {
  name: "",
  gainDb: 0,
  pan: 0,
  mute: false,
  solo: false,
};

export const defaultClipForm: ClipFormState = {
  file: null,
  contentType: "",
  fileExt: "",
  startMs: 0,
  clipDurationMs: 0,
  offsetInAssetMs: 0,
  assetDurationMs: null,
  sampleRate: 44100,
  channels: 2,
  waveformPeaks: null,
};
