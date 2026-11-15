// The Trading School is three separate places, each with its own page, progress, pace and certificate:
//   fundamentals: the school (/school) · orderflow: its own page (/orderflow), opened by the fundamentals certificate
//   invertix (/invertix) and exo (the ECHO and ORBIT vault, /vault) open only after every Orderflow module test is passed
import { SCHOOL_MODULES } from "./school";
import { VAULT_MODULES } from "./vaultModules";

export type TrackId = "fundamentals" | "orderflow" | "invertix" | "exo";
export const TRACK_IDS: TrackId[] = ["fundamentals", "orderflow", "invertix", "exo"];
export const TRACK_NAME: Record<TrackId, string> = { fundamentals: "Trading Fundamentals", orderflow: "Orderflow", invertix: "INVERTIX", exo: "ECHO and ORBIT" };
export const TRACK_URL: Record<TrackId, string> = { fundamentals: "/school", orderflow: "/orderflow", invertix: "/invertix", exo: "/vault" };
export const isTrack = (t: unknown): t is TrackId => typeof t === "string" && (TRACK_IDS as string[]).includes(t);

/** Mirrors school/src/content/12-orderflow.js (a test keeps the two in step). Every module has an exam; passing all of them opens every strategy. */
export const ORDERFLOW_MODULES = [
  { id: "f01", n: 1, title: "What Orderflow Is" },
  { id: "f02", n: 2, title: "The Tape and the DOM" },
  { id: "f03", n: 3, title: "The Footprint Chart" },
  { id: "f04", n: 4, title: "Delta and Cumulative Delta" },
  { id: "f05", n: 5, title: "Imbalances and Stacks" },
  { id: "f06", n: 6, title: "Absorption, Exhaustion and Trapped Traders" },
  { id: "f07", n: 7, title: "Auction Theory, Value and the Volume Profile" },
  { id: "f08", n: 8, title: "Orderflow at Sweeps: Where ECHO and ORBIT Begin" },
  { id: "f09", n: 9, title: "Orderflow at Gaps and Levels: Where INVERTIX Begins" },
  { id: "f10", n: 10, title: "Putting Flow Beside the Strategies" },
] as const;
export const ORDERFLOW_MODULE_IDS = ORDERFLOW_MODULES.map((m) => m.id) as string[];

/** Mirrors school/src/content/11-invertix.js (a test keeps the two in step). */
export const INVERTIX_MODULES = [
  { id: "m43", n: 1, title: "INVERTIX: The Idea and the Sections" },
  { id: "m44", n: 2, title: "INVERTIX: The Key Level" },
  { id: "m45", n: 3, title: "INVERTIX: The Flip, Entry and Stop" },
  { id: "m46", n: 4, title: "INVERTIX: Target, Break-even and Size" },
  { id: "m51", n: 5, title: "INVERTIX: PRIME Signals and EARLY" },
  { id: "m52", n: 6, title: "INVERTIX: H/L and PO3" },
  { id: "m53", n: 7, title: "INVERTIX: News Fade and FOMC Evening" },
  { id: "m47", n: 8, title: "INVERTIX: The Daily Playbook" },
] as const;
export const INVERTIX_MODULE_IDS = INVERTIX_MODULES.map((m) => m.id) as string[];

/** The ECHO X ORBIT course modules (x... for ECHO and b... for ORBIT), without the sealed Orderflow room (o...). */
export const EXO_MODULES = VAULT_MODULES.filter((m) => m.id.startsWith("x") || m.id.startsWith("b"));
export const EXO_MODULE_IDS = EXO_MODULES.map((m) => m.id) as string[];

export const trackModules = (t: TrackId): readonly { id: string; title: string }[] => (t === "fundamentals" ? SCHOOL_MODULES : t === "orderflow" ? ORDERFLOW_MODULES : t === "invertix" ? INVERTIX_MODULES : EXO_MODULES);
export const trackTotal = (t: TrackId) => trackModules(t).length;
export const trackFinishText = (t: TrackId) => (t === "fundamentals" ? "your Fundamentals certificate" : t === "orderflow" ? "your Orderflow certificate" : t === "invertix" ? "your INVERTIX certificate" : "your ECHO X ORBIT certificate");

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
/** Orderflow opens with the fundamentals certificate (every fundamentals module passed). */
export const fundamentalsComplete = (fundState: unknown) => passedIn(fundState, new Set(SCHOOL_MODULES.map((m) => m.id))) >= SCHOOL_MODULES.length;
export const orderflowOpen = (fundState: unknown) => fundamentalsComplete(fundState);
/** Every Orderflow module passed (each one needs a passed exam). This is what unlocks the strategies. */
export const orderflowComplete = (ofState: unknown) => passedIn(ofState, new Set(ORDERFLOW_MODULE_IDS)) >= ORDERFLOW_MODULE_IDS.length;
/** INVERTIX opens with the Orderflow certificate. A student who had already passed an INVERTIX module before this gate existed keeps their way in. */
export const invertixOpen = (ofState: unknown, invState: unknown) => orderflowComplete(ofState) || passedIn(invState, new Set(INVERTIX_MODULE_IDS)) > 0;
/** ECHO and ORBIT (the vault) open with the Orderflow certificate too, on top of the mentorship role and code. Someone already partway through the vault keeps their way in. */
export const vaultStrategiesOpen = (ofState: unknown, vaultState: unknown) => orderflowComplete(ofState) || passedIn(vaultState, new Set(EXO_MODULE_IDS)) > 0;
