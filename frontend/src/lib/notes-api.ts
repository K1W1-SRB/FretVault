import { Note, NoteListItem } from "@/app/dashboard/notebook/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type WorkspaceMembership = {
  role: "OWNER" | "MEMBER";
  workspace: {
    id: string;
    name: string;
    slug: string;
    type: "BAND" | "PERSONAL";
    createdAt: string;
    updatedAt: string;
    _count?: { members: number };
  };
};

type ApiError = { message: string; status?: number };

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

export const workspacesApi = {
  me: () => http<WorkspaceMembership[]>(`/workspaces/me`),
};

export const notesApi = {
  list: (workspaceId: string, q?: string) =>
    http<NoteListItem[]>(
      `/workspaces/${encodeURIComponent(workspaceId)}/notes${
        q ? `?q=${encodeURIComponent(q)}` : ""
      }`
    ),

  getBySlug: (workspaceId: string, slug: string) =>
    http<Note>(
      `/workspaces/${encodeURIComponent(
        workspaceId
      )}/notes/by-slug/${encodeURIComponent(slug)}`
    ),

  create: (
    workspaceId: string,
    payload: { title: string; contentMd: string; tags: string[] }
  ) =>
    http<Note>(`/workspaces/${encodeURIComponent(workspaceId)}/notes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (
    workspaceId: string,
    id: string,
    payload: Partial<Pick<Note, "title" | "contentMd" | "tags">>
  ) =>
    http<Note>(
      `/workspaces/${encodeURIComponent(
        workspaceId
      )}/notes/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    ),

  remove: (workspaceId: string, id: string) =>
    http<void>(
      `/workspaces/${encodeURIComponent(
        workspaceId
      )}/notes/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    ),
};
