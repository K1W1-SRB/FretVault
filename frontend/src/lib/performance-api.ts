export type PerformanceProject = {
  id: string;
  workspaceId: string;
  name: string;
  bpm: number;
  sampleRate: number;
  createdAt: string;
  updatedAt: string;
};

export type PerformanceProjectStatus = "Draft" | "Ready";

export type PerformanceProjectListItem = PerformanceProject & {
  tracks: number;
  status: PerformanceProjectStatus;
};

export type CreatePerformanceProjectInput = {
  name: string;
  bpm: number;
  sampleRate: number;
};

export type UpdatePerformanceProjectInput = Partial<
  Pick<PerformanceProject, "name" | "bpm" | "sampleRate">
>;

export type ExportPerformanceMp4Input = {
  fileName: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  composer?: string;
  comment?: string;
  coverImage?: File | null;
};

export type ExportPerformanceMp4Result = {
  blob: Blob;
  fileName: string;
};

export type PerformanceAssetStatus =
  | "PENDING_UPLOAD"
  | "UPLOADED"
  | "VERIFIED"
  | "FAILED";

export type PerformanceAssetSummary = {
  id: string;
  contentType: string;
  byteSize: number | null;
  durationMs: number | null;
  status: PerformanceAssetStatus;
  waveformPeaks?: unknown;
};

export type PerformanceClip = {
  id: string;
  workspaceId: string;
  projectId: string;
  trackId: string;
  assetId: string;
  startMs: number;
  durationMs: number;
  offsetInAssetMs: number;
  createdAt: string;
  updatedAt: string;
  asset: PerformanceAssetSummary;
};

export type PerformanceTrack = {
  id: string;
  workspaceId: string;
  projectId: string;
  index: number;
  name: string;
  gainDb: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  createdAt: string;
  updatedAt: string;
  clips: PerformanceClip[];
};

export type PerformanceTimeline = {
  project: PerformanceProject;
  tracks: PerformanceTrack[];
};

export type CreatePerformanceTrackInput = {
  projectId: string;
  index: number;
  name: string;
  gainDb?: number;
  pan?: number;
  mute?: boolean;
  solo?: boolean;
};

export type UpdatePerformanceTrackInput = Partial<
  Pick<PerformanceTrack, "name" | "gainDb" | "pan" | "mute" | "solo" | "index">
>;

export type CreatePerformanceClipInput = {
  assetId: string;
  startMs: number;
  durationMs: number;
  offsetInAssetMs?: number;
};

export type UpdatePerformanceClipInput = Partial<
  Pick<PerformanceClip, "startMs" | "durationMs" | "offsetInAssetMs">
>;

export type PresignAssetInput = {
  workspaceId: string;
  contentType: string;
  fileExt: string;
  byteSizeEstimate?: number;
};

export type PresignAssetResponse = {
  assetId: string;
  key: string;
  putUrl: string;
  expiresAt: string;
};

export type AssetDownloadUrlResponse = {
  assetId: string;
  key: string;
  contentType: string;
  byteSize: number | null;
  url: string;
  expiresAt: string;
};

export type FinalizeAssetInput = {
  byteSize: number;
  sha256?: string;
  durationMs: number;
  sampleRate: number;
  channels: number;
  waveformPeaks?: number[];
};

type ApiError = { message: string; status?: number };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function parseFileNameFromContentDisposition(value: string | null) {
  if (!value) return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = /filename=\"([^\"]+)\"/i.exec(value);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = /filename=([^;]+)/i.exec(value);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return null;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let msg = "Request failed";
    try {
      const body = await res.json();
      msg = body?.message ?? msg;
    } catch {}
    const err: ApiError = { message: msg, status: res.status };
    throw err;
  }
  return res.json() as Promise<T>;
}

export const performanceProjectsApi = {
  list: (workspaceId: string) =>
    http<PerformanceProjectListItem[]>(
      `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
    ),

  create: (workspaceId: string, payload: CreatePerformanceProjectInput) =>
    http<PerformanceProject>(
      `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
      {
        method: "POST",
        body: JSON.stringify({ ...payload, workspaceId }),
      },
    ),

  update: (
    workspaceId: string,
    projectId: string,
    payload: UpdatePerformanceProjectInput,
  ) =>
    http<PerformanceProject>(
      `/workspaces/${encodeURIComponent(
        workspaceId,
      )}/projects/${encodeURIComponent(projectId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  remove: (workspaceId: string, projectId: string) =>
    http<void>(
      `/workspaces/${encodeURIComponent(
        workspaceId,
      )}/projects/${encodeURIComponent(projectId)}`,
      {
        method: "DELETE",
      },
    ),

  exportMp4: async (
    projectId: string,
    payload: ExportPerformanceMp4Input,
  ): Promise<ExportPerformanceMp4Result> => {
    const formData = new FormData();
    formData.set("fileName", payload.fileName.trim());
    formData.set("title", payload.title.trim());
    formData.set("artist", payload.artist.trim());

    const album = payload.album?.trim();
    const genre = payload.genre?.trim();
    const composer = payload.composer?.trim();
    const comment = payload.comment?.trim();

    if (album) formData.set("album", album);
    if (genre) formData.set("genre", genre);
    if (composer) formData.set("composer", composer);
    if (comment) formData.set("comment", comment);

    if (payload.year != null) {
      formData.set("year", String(payload.year));
    }
    if (payload.trackNumber != null) {
      formData.set("trackNumber", String(payload.trackNumber));
    }
    if (payload.coverImage) {
      formData.set("coverImage", payload.coverImage);
    }

    const timeoutMs =
      Number(process.env.NEXT_PUBLIC_EXPORT_MP4_TIMEOUT_MS ?? `${6 * 60 * 1000}`) ||
      6 * 60 * 1000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(
        `${API_BASE}/performance/projects/${encodeURIComponent(projectId)}/export-mp4`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        const err: ApiError = {
          message: `Export timed out after ${Math.round(timeoutMs / 1000)}s. Try a shorter project or retry.`,
          status: 408,
        };
        throw err;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let msg = "Request failed";
      try {
        const body = await res.json();
        msg = body?.message ?? msg;
      } catch {}
      const err: ApiError = { message: msg, status: res.status };
      throw err;
    }

    const fallbackName = `${
      payload.fileName.trim() || "performance-export"
    }.mp4`;
    const fileName =
      parseFileNameFromContentDisposition(
        res.headers.get("content-disposition"),
      ) ?? fallbackName;

    return {
      blob: await res.blob(),
      fileName,
    };
  },
};

export const performanceTimelineApi = {
  get: (projectId: string) =>
    http<PerformanceTimeline>(
      `/performance/projects/${encodeURIComponent(projectId)}`,
    ),
};

export const performanceTracksApi = {
  create: (workspaceId: string, payload: CreatePerformanceTrackInput) =>
    http<PerformanceTrack>(
      `/workspaces/${encodeURIComponent(workspaceId)}/tracks`,
      {
        method: "POST",
        body: JSON.stringify({ ...payload, workspaceId }),
      },
    ),

  update: (
    workspaceId: string,
    trackId: string,
    payload: UpdatePerformanceTrackInput,
  ) =>
    http<PerformanceTrack>(
      `/workspaces/${encodeURIComponent(
        workspaceId,
      )}/tracks/${encodeURIComponent(trackId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  remove: (workspaceId: string, trackId: string) =>
    http<void>(
      `/workspaces/${encodeURIComponent(
        workspaceId,
      )}/tracks/${encodeURIComponent(trackId)}`,
      {
        method: "DELETE",
      },
    ),
};

export const performanceClipsApi = {
  create: (trackId: string, payload: CreatePerformanceClipInput) =>
    http<PerformanceClip>(
      `/performance/tracks/${encodeURIComponent(trackId)}/clips`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  update: (clipId: string, payload: UpdatePerformanceClipInput) =>
    http<PerformanceClip>(
      `/performance/clips/${encodeURIComponent(clipId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),

  remove: (clipId: string) =>
    http<void>(`/performance/clips/${encodeURIComponent(clipId)}`, {
      method: "DELETE",
    }),
};

export const assetsApi = {
  presign: (payload: PresignAssetInput) =>
    http<PresignAssetResponse>(`/assets/presign`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  finalize: (assetId: string, payload: FinalizeAssetInput) =>
    http<PerformanceAssetSummary>(
      `/assets/${encodeURIComponent(assetId)}/finalize`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  downloadUrl: (assetId: string) =>
    http<AssetDownloadUrlResponse>(
      `/assets/${encodeURIComponent(assetId)}/download-url`,
    ),
};
