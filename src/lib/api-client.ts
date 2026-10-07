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

export type LocalAccountRow = { id: string; username: string; name: string; disabled: boolean; expiresAt: string | null; lastLoginAt: string | null; createdAt: string };
export const api = {
  localAccounts: () => call<LocalAccountRow[]>("/api/local-accounts"),
  createLocal: (data: { username: string; name: string; password: string; days: number | null }) => call<{ id: string }>("/api/local-accounts", send("POST", data)),
  patchLocal: (id: string, data: { disabled?: boolean; days?: number | null; password?: string; name?: string }) => call(`/api/local-accounts/${id}`, send("PATCH", data)),
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
  plan: () => call<{ plan: import("./tradingPlan").TradingPlanDTO | null }>("/api/plan"),
  savePlan: (data: unknown) => call("/api/plan", send("PUT", data)),
  logs: () => call<LogEntry[]>("/api/log"),
  saveLog: (e: LogEntry) => call("/api/log", send("PUT", e)),
  markFeedbackRead: (id: string) => call(`/api/feedback/${id}/read`, send("POST")),
  // Coach / Admin
  members: (q: string, sort: string) => call<CoachDirectoryRow[]>(`/api/coach/members?q=${encodeURIComponent(q)}&sort=${sort}`),
  member: (userId: string) => call<DashboardData>(`/api/coach/members/${userId}`),
  schoolUnlock: (userId: string, level: string, on: boolean) => call(`/api/coach/members/${userId}/unlock`, send("POST", { level, on })),
  giveFeedback: (data: unknown) => call<{ id: string }>("/api/coach/feedback", send("POST", data)),
};
