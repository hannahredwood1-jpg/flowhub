// Browser → API client. All authorization happens server-side; this is just typed fetch.
import type { CatalogFirm, CoachDirectoryRow, DashboardData } from "./types";

export type UsageRow = { id: string; name: string; role: string; lastSeen: string | null; lastLogin: string | null; sessions7: number; minutes7: number };
export type UsageDetail = { days: number; sessions: { startedAt: string; lastSeenAt: string; minutes: number }[]; sections: { area: string; section: string; minutes: number; lastDay: string }[] };

export type PaceRow = { id: string; track: "fundamentals" | "invertix" | "exo"; name: string; perWeek: number; preset: string | null; passed: number; total: number; expected: number; status: "done" | "ahead" | "on" | "behind"; finish: string | null; lastActive: string | null; setAt: string; changes: number; emails: boolean; hasEmail: boolean; nudges: number; lastNudgeAt: string | null };
export type PathRow = { id: string; name: string; start: string; prop: string; committedAt: string; locked: boolean; prove: number; learn: number; proofPassed: number; proofFailed: number; tested: number; passed: number; total: number; fast: number; lastProofAt: string | null };
export type GexHealth = { lastTry: string | null; lastError: string | null; lastOk: string | null };
export type GexLatest = { current: { day: string; feedLabel: string | null; feedAt: string | null; fetchedAt: string; levels: { spot: number; export: string; all: { callWall: number | null; flip: number | null; putWall: number | null } } } | null; today: string; health?: GexHealth };
export type VaultRow = { id: string; name: string; role: string; mentorship: boolean; override: boolean; code: "none" | "issued" | "opened" | "revoked"; hint: string | null; issuedAt: string | null; redeemedAt: string | null; orderflow: boolean; passed: number };

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

export type LocalAccountRow = { id: string; username: string; email: string | null; name: string; disabled: boolean; active: boolean; days: number | null; expiresAt: string | null; lastLoginAt: string | null; createdAt: string };
export const api = {
  localAccounts: () => call<LocalAccountRow[]>("/api/local-accounts"),
  createLocal: (data: { email: string; name: string; days: number | null }) => call<{ id: string; emailed: boolean; link?: string }>("/api/local-accounts", send("POST", data)),
  patchLocal: (id: string, data: { disabled?: boolean; days?: number | null; resend?: boolean; name?: string }) => call<{ ok: boolean; emailed?: boolean; link?: string }>(`/api/local-accounts/${id}`, send("PATCH", data)),
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
  usageOverview: () => call<UsageRow[]>("/api/coach/usage"),
  usageDetail: (userId: string, days = 30) => call<UsageDetail>(`/api/coach/usage/${userId}?days=${days}`),
  paceList: () => call<{ rows: PaceRow[]; unset: number }>("/api/coach/pace"),
  paceSet: (userId: string, body: { track?: string; perWeek?: number; reset?: boolean }) => call(`/api/coach/pace/${userId}`, send("POST", body)),
  pathList: () => call<{ rows: PathRow[]; unbuilt: number }>("/api/coach/paths"),
  pathReset: (userId: string) => call(`/api/coach/path/${userId}/reset`, send("POST", {})),
  gexLatest: () => call<GexLatest>("/api/gex/latest"),
  gexRun: () => call<{ ok: boolean; message: string }>("/api/coach/gex/run", send("POST", {})),
  vaultList: () => call<VaultRow[]>("/api/coach/vault"),
  vaultCode: (userId: string, mentorship: boolean) => call<{ code: string }>(`/api/coach/vault/${userId}/code`, send("POST", { mentorship })),
  vaultRevoke: (userId: string) => call(`/api/coach/vault/${userId}/revoke`, send("POST", {})),
  vaultOrderflow: (userId: string, on: boolean) => call(`/api/coach/vault/${userId}/orderflow`, send("POST", { on })),
  schoolUnlock: (userId: string, level: string, on: boolean) => call(`/api/coach/members/${userId}/unlock`, send("POST", { level, on })),
  giveFeedback: (data: unknown) => call<{ id: string }>("/api/coach/feedback", send("POST", data)),
};
