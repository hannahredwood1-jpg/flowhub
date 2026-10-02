// Browser → API client. All authorization happens server-side; this is just typed fetch.
import type { CatalogFirm, CoachDirectoryRow, DashboardData } from "./types";

export type LogEntry = { kind: "checklist" | "review"; day: string; data: Record<string, unknown> };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}
const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  dashboard: () => call<DashboardData>("/api/dashboard"),
  catalog: () => call<CatalogFirm[]>("/api/catalog"),
  saveRoadmap: (data: unknown) => call("/api/roadmap", send("PUT", data)),
  addAccount: (data: unknown) => call<{ id: string }>("/api/accounts", send("POST", data)),
  updateAccount: (id: string, data: unknown) => call(`/api/accounts/${id}`, send("PATCH", data)),
  deleteAccount: (id: string) => call(`/api/accounts/${id}`, send("DELETE")),
  addTrade: (data: unknown) => call<{ id: string }>("/api/journal", send("POST", data)),
  updateTrade: (id: string, data: unknown) => call(`/api/journal/${id}`, send("PATCH", data)),
  deleteTrade: (id: string) => call(`/api/journal/${id}`, send("DELETE")),
  saveProjection: (data: unknown) => call("/api/projection", send("PUT", data)),
  deleteProjection: () => call("/api/projection", send("DELETE")),
  logs: () => call<LogEntry[]>("/api/log"),
  saveLog: (e: LogEntry) => call("/api/log", send("PUT", e)),
  markFeedbackRead: (id: string) => call(`/api/feedback/${id}/read`, send("POST")),
  // Coach / Admin
  members: (q: string, sort: string) => call<CoachDirectoryRow[]>(`/api/coach/members?q=${encodeURIComponent(q)}&sort=${sort}`),
  member: (userId: string) => call<DashboardData>(`/api/coach/members/${userId}`),
  giveFeedback: (data: unknown) => call<{ id: string }>("/api/coach/feedback", send("POST", data)),
};
