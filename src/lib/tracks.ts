// The Trading School is three separate places, each with its own page, progress, pace and certificate:
//   fundamentals: the school (/school) · invertix: its own page (/invertix), opened by the fundamentals certificate · exo: the ECHO X ORBIT vault (/vault)
import { SCHOOL_MODULES } from "./school";
import { VAULT_MODULES } from "./vaultModules";

export type TrackId = "fundamentals" | "invertix" | "exo";
export const TRACK_IDS: TrackId[] = ["fundamentals", "invertix", "exo"];
export const TRACK_NAME: Record<TrackId, string> = { fundamentals: "Trading Fundamentals", invertix: "INVERTIX", exo: "ECHO X ORBIT" };
export const TRACK_URL: Record<TrackId, string> = { fundamentals: "/school", invertix: "/invertix", exo: "/vault" };
export const isTrack = (t: unknown): t is TrackId => typeof t === "string" && (TRACK_IDS as string[]).includes(t);

/** Mirrors school/src/content/11-invertix.js (a test keeps the two in step). */
export const INVERTIX_MODULES = [
  { id: "m43", n: 1, title: "INVERTIX: The Idea and the Pieces" },
  { id: "m44", n: 2, title: "INVERTIX: The Key Level" },
  { id: "m45", n: 3, title: "INVERTIX: The Flip, Entry and Stop" },
  { id: "m46", n: 4, title: "INVERTIX: Targets, Windows and Size" },
  { id: "m47", n: 5, title: "INVERTIX: The Daily Playbook" },
] as const;
export const INVERTIX_MODULE_IDS = INVERTIX_MODULES.map((m) => m.id) as string[];

/** The ECHO X ORBIT course modules (x...), without the sealed Orderflow room (o...). */
export const EXO_MODULES = VAULT_MODULES.filter((m) => m.id.startsWith("x"));
export const EXO_MODULE_IDS = EXO_MODULES.map((m) => m.id) as string[];

export const trackModules = (t: TrackId): readonly { id: string; title: string }[] => (t === "fundamentals" ? SCHOOL_MODULES : t === "invertix" ? INVERTIX_MODULES : EXO_MODULES);
export const trackTotal = (t: TrackId) => trackModules(t).length;
export const trackFinishText = (t: TrackId) => (t === "fundamentals" ? "your Fundamentals certificate" : t === "invertix" ? "your INVERTIX certificate" : "your ECHO X ORBIT certificate");

/** Counts passed modules (p = 1) of a saved `state.v2.m` for the given module ids. */
export function passedIn(state: unknown, ids: ReadonlySet<string>): number {
  const st = state ? ((typeof state === "string" ? JSON.parse(state) : state) as { v2?: { m?: Record<string, { p?: number }> } }) : null;
  return Object.entries(st?.v2?.m ?? {}).filter(([k, v]) => ids.has(k) && v?.p === 1).length;
}
/** The first module of a track that has not been passed yet (or the first one if everything is passed). */
export function nextModule(t: TrackId, state: unknown) {
  const st = state ? ((typeof state === "string" ? JSON.parse(state) : state) as { v2?: { m?: Record<string, { p?: number }> } }) : null;
  const mods = trackModules(t);
  const i = mods.findIndex((m) => st?.v2?.m?.[m.id]?.p !== 1);
  return { n: (i < 0 ? 0 : i) + 1, title: mods[i < 0 ? 0 : i].title };
}
/** INVERTIX opens with the fundamentals certificate (every fundamentals module passed). A student who had already passed an INVERTIX module before it moved keeps their way in. */
export const fundamentalsComplete = (fundState: unknown) => passedIn(fundState, new Set(SCHOOL_MODULES.map((m) => m.id))) >= SCHOOL_MODULES.length;
export const invertixOpen = (fundState: unknown, invState: unknown) => fundamentalsComplete(fundState) || passedIn(invState, new Set(INVERTIX_MODULE_IDS)) > 0;
