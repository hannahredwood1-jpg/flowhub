// The Trading School is three separate places, each with its own page, progress, pace and certificate:
//   fundamentals: the school (/school) · orderflow: its own page (/orderflow), opened by the fundamentals certificate
//   invertix (/invertix) and exo (the ECHO and ORBIT vault, /vault) open only after every Orderflow module test is passed
import { SCHOOL_MODULES } from "./school";
import { VAULT_MODULES } from "./vaultModules";

export type TrackId = "fundamentals" | "orderflow" | "invertix" | "lumen" | "exo";
export const TRACK_IDS: TrackId[] = ["fundamentals", "orderflow", "invertix", "lumen", "exo"];
export const TRACK_NAME: Record<TrackId, string> = { fundamentals: "Trading Fundamentals", orderflow: "Orderflow", invertix: "INVERTIX", lumen: "LUMEN", exo: "ECHO x ORBIT" };
export const TRACK_URL: Record<TrackId, string> = { fundamentals: "/school", orderflow: "/orderflow", invertix: "/invertix", lumen: "/lumen", exo: "/vault" };
export const isTrack = (t: unknown): t is TrackId => typeof t === "string" && (TRACK_IDS as string[]).includes(t);

/** Mirrors school/src/content/12-orderflow.js (a test keeps the two in step). Every module has an exam; passing all of them opens every strategy. */
export const ORDERFLOW_MODULES = [
  { id: "f00", n: 1, title: "Price in Plain Words" },
  { id: "f01", n: 2, title: "What Orderflow Is" },
  { id: "f02", n: 3, title: "The Tape and the DOM" },
  { id: "f03", n: 4, title: "The Footprint Chart" },
  { id: "f04", n: 5, title: "Delta and Cumulative Delta" },
  { id: "f05", n: 6, title: "Imbalances and Stacks" },
  { id: "f06", n: 7, title: "Absorption, Exhaustion and Trapped Traders" },
  { id: "f07", n: 8, title: "Auction Theory, Value and the Volume Profile" },
  { id: "f09", n: 9, title: "Orderflow on News: Where INVERTIX Begins" },
  { id: "f08", n: 10, title: "Orderflow at Highs, Lows and Zones: Where LUMEN and ECHO x ORBIT Begin" },
  { id: "f10", n: 11, title: "Putting Flow Beside the Strategies" },
] as const;
export const ORDERFLOW_MODULE_IDS = ORDERFLOW_MODULES.map((m) => m.id) as string[];
/** Lessons added to the Orderflow course after it opened. A student already past one is not held up by it, and it is not needed for the certificate or to open the strategies. */
export const ORDERFLOW_OPTIONAL_MODULES = [{ id: "f11", title: "Volume Analysis" }] as const;
export const ORDERFLOW_OPTIONAL_IDS = ORDERFLOW_OPTIONAL_MODULES.map((m) => m.id) as string[];

/** Mirrors school/src/content/11-invertix.js (a test keeps the two in step). */
export const INVERTIX_MODULES = [
  { id: "n01", n: 1, title: "The News Fade: Just Enough to Know the Trade" },
  { id: "n02", n: 2, title: "Reading the Rush: The 60-Second Flow Check" },
  { id: "n03", n: 3, title: "Size Small, Then the Routine" },
] as const;
export const INVERTIX_MODULE_IDS = INVERTIX_MODULES.map((m) => m.id) as string[];

/** Mirrors school/src/content/13-lumen.js (a test keeps the two in step). */
export const LUMEN_MODULES = [
  { id: "l01", n: 1, title: "LUMEN in Plain Words" },
  { id: "l02", n: 2, title: "Moment 1: The Zone Tap" },
  { id: "l03", n: 3, title: "Moment 2: The Break Candle" },
  { id: "l04", n: 4, title: "Moment 3: After You Are In" },
  { id: "l05", n: 5, title: "How to Act, and Your Routine" },
] as const;
export const LUMEN_MODULE_IDS = LUMEN_MODULES.map((m) => m.id) as string[];

/** The ECHO x ORBIT course modules (e01 to e05). */
export const EXO_MODULES = VAULT_MODULES.filter((m) => m.id.startsWith("e"));
export const EXO_MODULE_IDS = EXO_MODULES.map((m) => m.id) as string[];

export const trackModules = (t: TrackId): readonly { id: string; title: string }[] => (t === "fundamentals" ? SCHOOL_MODULES : t === "orderflow" ? ORDERFLOW_MODULES : t === "invertix" ? INVERTIX_MODULES : t === "lumen" ? LUMEN_MODULES : EXO_MODULES);
export const trackTotal = (t: TrackId) => trackModules(t).length;
export const trackFinishText = (t: TrackId) => (t === "fundamentals" ? "your Fundamentals certificate" : t === "orderflow" ? "your Orderflow certificate" : t === "invertix" ? "your INVERTIX certificate" : t === "lumen" ? "your LUMEN certificate" : "your ECHO x ORBIT certificate");

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
/** Every strategy opens only with the Orderflow certificate, so nobody skips ahead: passing every Orderflow test is the key. Progress in a strategy course does not open it. */
export const invertixOpen = (ofState: unknown) => orderflowComplete(ofState);
export const lumenOpen = (ofState: unknown) => orderflowComplete(ofState);
/** ECHO x ORBIT (the vault) needs the Orderflow certificate too, on top of the mentorship role and the code. */
export const vaultStrategiesOpen = (ofState: unknown) => orderflowComplete(ofState);

/** Progress is kept in order. The first `open` modules of a track can be done in any order; after that a module only counts as passed if the one before it is.
 *  Anything passed beyond the first gap is set back, so nobody skips ahead and an old save is brought to where the student really is. */
export function normalizeOrder<T extends { p?: number; s?: string }>(ids: readonly string[], m: Record<string, T | undefined>, open = 0, skip: ReadonlySet<string> = new Set()): Record<string, T | undefined> {
  const out = { ...m };
  for (let i = open + 1; i < ids.length; i++) {
    if (skip.has(ids[i])) continue;
    const prev = out[ids[i - 1]];
    if (!(prev && prev.p === 1) && out[ids[i]]?.p === 1) out[ids[i]] = { ...(out[ids[i]] as T), p: 0, s: "000" };
  }
  return out;
}
/** How many modules at the start of a track can be done in any order (the beginner basics of Foundations). */
export const OPEN_FIRST: Record<TrackId, number> = { fundamentals: 4, orderflow: 0, invertix: 0, lumen: 0, exo: 0 };
