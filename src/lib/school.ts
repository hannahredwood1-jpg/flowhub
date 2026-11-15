// Trading School progress, summarised for coaches. Mirrors the module list in school/src/content/*.js
// (a test keeps the two in step). The page itself saves progress under `state.v2`; the older keys
// (ch, dives, ck, ex) belong to the Classic school and are left untouched.
export const SCHOOL_MODULES = [
  { id: "m37", n: 1, title: "Market Basics" },
  { id: "m02", n: 2, title: "Chart Reading Basics" },
  { id: "m19", n: 3, title: "TradingView & Platform Setup" },
  { id: "m20", n: 4, title: "How Futures & NQ Work" },
  { id: "m21", n: 5, title: "Orders & Your First Trade" },
  { id: "m39", n: 6, title: "Your Demo Account: Open It and Use It" },
  { id: "m41", n: 7, title: "Sessions & Economic News" },
  { id: "m12", n: 8, title: "Funded Accounts & Prop Firms" },
  { id: "m14", n: 9, title: "Risk Management" },
  { id: "m01", n: 10, title: "Mindset and One Trade Per Session" },
] as const;
export const SCHOOL_MODULE_IDS = SCHOOL_MODULES.map((m) => m.id) as string[];
/** Every Foundations module can be proved with one exam (the GEX lesson, the only exception, has left the Foundations). */
export const SCHOOL_NO_PROOF = [] as string[];
export const SCHOOL_PROVABLE_IDS = SCHOOL_MODULE_IDS.filter((id) => !SCHOOL_NO_PROOF.includes(id));

/** What the school page saves for each module: steps done ("1101"), passed, best score %, attempt number, exam tries, last attempt time. */
export type ModuleProgress = { s?: string; p?: number; sc?: number; a?: number; n?: number; at?: number; t?: number };
type Best = { best?: number; pass?: boolean; n?: number; at?: number };
export type SchoolState = {
  v2?: { m?: Record<string, ModuleProgress> };
  // Classic school (earlier page)
  ch?: string[]; dives?: Record<string, Record<string, number>>; ck?: Record<string, Best>; ex?: Record<string, Best>;
};
export type SchoolAttemptRow = { kind: string; ref: string; score: number; total: number; pass: boolean; createdAt: Date | string };
export type SchoolSummary = {
  modules: { id: string; n: number; title: string; stepsDone: number; passed: boolean; tested: boolean; best: number; tries: number; attempt: number; manualUnlock: boolean }[];
  passed: number; total: number;
  current: string;
  attempts: { label: string; pct: number; pass: boolean; at: string }[];
};

/** Beginner Basics (the first five) are always open, and so is the first Foundations module. After that each module opens when the one before it is passed
 *  (or a coach unlocks it). */
export const SCHOOL_FIRST_CORE = 5;
export function schoolOpen(modules: { id: string; passed: boolean; manualUnlock: boolean }[], i: number): boolean {
  if (modules[i].manualUnlock) return true;
  return i <= SCHOOL_FIRST_CORE || modules[i - 1].passed;
}

export function summarizeSchool(state: SchoolState | null, unlocks: string[], attempts: SchoolAttemptRow[]): SchoolSummary {
  const m = state?.v2?.m ?? {};
  const modules = SCHOOL_MODULES.map((def) => {
    const p = m[def.id] ?? {};
    return {
      id: def.id, n: def.n, title: def.title,
      stepsDone: String(p.s ?? "").slice(0, 3).split("").filter((c) => c === "1").length,
      passed: p.p === 1, tested: p.p === 1 && p.t === 1, best: p.p === 1 ? Math.max(0, Math.min(100, p.sc ?? 0)) : 0, tries: p.n ?? 0, attempt: p.a ?? 1,
      manualUnlock: unlocks.includes(def.id),
    };
  });
  const passed = modules.filter((x) => x.passed).length;
  const unlocked = (i: number) => schoolOpen(modules, i);
  const cur = modules.findIndex((x, i) => !x.passed && unlocked(i));
  const label = (ref: string) => { const d = SCHOOL_MODULES.find((x) => x.id === ref); return d ? `Module ${d.n} · ${d.title}` : ref; };
  return {
    modules, passed, total: modules.length,
    current: passed === modules.length ? "Course complete" : cur >= 0 ? `Module ${modules[cur].n}` : "Not started",
    attempts: attempts.filter((a) => (a.kind === "ex" || a.kind === "po") && SCHOOL_MODULE_IDS.includes(a.ref)).slice(0, 12).map((a) => ({
      label: label(a.ref), pct: a.total ? a.score / a.total : 0, pass: a.pass, at: new Date(a.createdAt).toISOString(),
    })),
  };
}
