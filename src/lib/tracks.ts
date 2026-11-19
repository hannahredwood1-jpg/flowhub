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

/** Saved progress can come back as an object, a JSON string, or (from older saves) a list of JSON strings, one per save. Returns the real object, later saves winning. */
export function unwrapState(raw: unknown): Record<string, unknown> | null {
  let v = raw;
  for (let i = 0; i < 3 && typeof v === "string"; i++) { try { v = JSON.parse(v); } catch { return null; } }
  if (Array.isArray(v)) {
    const out: Record<string, unknown> = {};
    for (const e of v) { const o = unwrapState(e); if (o) Object.assign(out, o); }
    return Object.keys(out).length ? out : null;
  }
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}
type Mods = { v2?: { m?: Record<string, { p?: number; s?: string; sc?: number }> } };
/** A saved state with every module that has a passing exam attempt on record marked passed (the attempt log is the server's proof, so a lost or stale save cannot hide a pass). */
export function withPasses(state: unknown, refs: Iterable<string> | undefined): Record<string, unknown> {
  const st = (unwrapState(state) ?? {}) as Mods & Record<string, unknown>;
  const m = { ...(st.v2?.m ?? {}) };
  for (const r of refs ?? []) if (m[r]?.p !== 1) m[r] = { s: "111", sc: 100, ...(m[r] ?? {}), p: 1 };
  return { ...st, v2: { ...(st.v2 ?? {}), m } };
}
/** Counts passed modules (p = 1) of a saved `state.v2.m` for the given module ids. */
export function passedIn(state: unknown, ids: ReadonlySet<string>): number {
  const st = unwrapState(state) as Mods | null;
  return Object.entries(st?.v2?.m ?? {}).filter(([k, v]) => ids.has(k) && v?.p === 1).length;
}
/** The first module of a track that has not been passed yet (or the first one if everything is passed). */
export function nextModule(t: TrackId, state: unknown) {
  const st = unwrapState(state) as Mods | null;
  const mods = trackModules(t);
  const i = mods.findIndex((m) => st?.v2?.m?.[m.id]?.p !== 1);
  return { n: (i < 0 ? 0 : i) + 1, title: mods[i < 0 ? 0 : i].title };
}
/** Orderflow opens with the fundamentals certificate (every fundamentals module passed). */
export const fundamentalsComplete = (fundState: unknown) => passedIn(fundState, new Set(SCHOOL_MODULES.map((m) => m.id))) >= SCHOOL_MODULES.length;
export const orderflowOpen = (fundState: unknown) => fundamentalsComplete(fundState);

/** After Foundations a student chooses a path. "orderflow" (the default for everyone who has not chosen) is the full course: Orderflow first, then every strategy lesson.
 *  "basic" goes straight to the strategies and takes only the lessons that are rules and sizing (no order-flow reading). */
export type LearnPath = "orderflow" | "basic";
export const LEARN_PATHS: LearnPath[] = ["orderflow", "basic"];
export const isLearnPath = (v: unknown): v is LearnPath => v === "orderflow" || v === "basic";
export const LEARN_PATH_NAME: Record<LearnPath, string> = { orderflow: "Orderflow Path", basic: "Basic Path" };
/** Lessons written only for the Basic Path (trading the strategy on TradingView alone). They are not part of the Orderflow Path or its totals. */
export const BASIC_ONLY_MODULES = {
  lumen: [
    { id: "bl3", title: "Zones: Finding the Supply or Demand Zone on TradingView" },
    { id: "bl4", title: "The Four Opens on TradingView" },
    { id: "bl1", title: "Reading the Tap and the Break on TradingView" },
    { id: "bl5", title: "The Models, the Tags, and Your Stop and Target" },
    { id: "bl2", title: "Your LUMEN Day on TradingView: Size, Checklist and Routine" },
  ],
  invertix: [
    { id: "bn3", title: "The News Calendar and the Clock" },
    { id: "bn1", title: "Reading the News Spike on TradingView" },
    { id: "bn4", title: "Placing the Fade on the Chart" },
    { id: "bn5", title: "The FOMC Evening Trade (Optional)" },
    { id: "bn2", title: "Size Small, Then the Routine (TradingView)" },
  ],
  exo: [
    { id: "be4", title: "Echo Step 1: Build the Narrative" },
    { id: "be5", title: "Echo Step 2: Delivery Out of a Gap" },
    { id: "be1", title: "Echo on TradingView: Is the Rejection Clean?" },
    { id: "be6", title: "CISD and the Rejection Retest" },
    { id: "be7", title: "Grading a Setup: A, A+ and A++" },
    { id: "be2", title: "The Return to Your Limit, on TradingView" },
    { id: "be8", title: "Why Echo Trades Lose, and the Daily Rules" },
    { id: "bo1", title: "Orbit Step 1: The Area of Interest" },
    { id: "bo2", title: "Orbit Step 2: The 5-Minute Inversion" },
    { id: "be3", title: "Orbit Step 3: The Internal Range and Your Limit" },
    { id: "bo3", title: "Orbit Step 4: Your Orbit Day" },
  ],
} as const;
export const BASIC_ONLY_IDS: Record<"invertix" | "lumen" | "exo", string[]> = { lumen: BASIC_ONLY_MODULES.lumen.map((m) => m.id), invertix: BASIC_ONLY_MODULES.invertix.map((m) => m.id), exo: BASIC_ONLY_MODULES.exo.map((m) => m.id) };
/** The strategy lessons on the Basic Path: the lessons that are rules, plus the Basic-only lessons (a test keeps school/src/tracks.js in step with this). */
export const BASIC_MODULES: Record<"invertix" | "lumen" | "exo", string[]> = { invertix: ["n01", ...BASIC_ONLY_IDS.invertix], lumen: ["l01", ...BASIC_ONLY_IDS.lumen], exo: ["e01", ...BASIC_ONLY_IDS.exo] };
/** Every lesson id a track can save progress for, in order: the Orderflow Path lessons, then the Basic-only lessons. */
export const isBasicTrack = (t: TrackId): t is "invertix" | "lumen" | "exo" => t === "invertix" || t === "lumen" || t === "exo";
export const trackModuleIds = (t: TrackId): string[] => [...trackModules(t).map((m) => m.id), ...(isBasicTrack(t) ? BASIC_ONLY_IDS[t] : [])];
/** How many lessons a track has for someone on the given path. */
export const trackTotalFor = (t: TrackId, path: LearnPath) => (path === "basic" && isBasicTrack(t) ? BASIC_MODULES[t].length : trackTotal(t));
/** Lessons passed on the given path (only the Basic lessons count on the Basic path). */
export const passedOnPath = (state: unknown, t: TrackId, path: LearnPath) => passedIn(state, new Set(path === "basic" && isBasicTrack(t) ? BASIC_MODULES[t] : trackModules(t).map((m) => m.id)));
/** A strategy is done on a path when every lesson of that path is passed. LUMEN opens after INVERTIX is done, and ECHO x ORBIT after LUMEN is done (on both paths). */
export const strategyDone = (state: unknown, t: TrackId, path: LearnPath) => passedOnPath(state, t, path) >= trackTotalFor(t, path);
/** A Basic lesson whose lesson before it in the full course is not a Basic lesson is exempt from the "in order" rule. */
export function basicOrderSkip(t: TrackId): ReadonlySet<string> {
  if (!isBasicTrack(t)) return new Set();
  const ids = trackModuleIds(t), basic = new Set(BASIC_MODULES[t]);
  return new Set(ids.filter((id, i) => basic.has(id) && i > 0 && !basic.has(ids[i - 1])));
}
/** The strategies open with the Orderflow certificate, or on the Basic path with the Foundations certificate. */
export const strategyOpen = (ofState: unknown, fundState: unknown, path: LearnPath) => orderflowComplete(ofState) || (path === "basic" && fundamentalsComplete(fundState));
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
