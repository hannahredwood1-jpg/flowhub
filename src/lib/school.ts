// Trading School progress, summarised for coaches. Mirrors the module list in school/src/content/*.js
// (a test keeps the two in step). The page itself saves progress under `state.v2`; the older keys
// (ch, dives, ck, ex) belong to the Classic school and are left untouched.
export const SCHOOL_MODULES = [
  { id: "m01", n: 1, title: "Trading Mindset" },
  { id: "m02", n: 2, title: "Chart Reading Basics" },
  { id: "m03", n: 3, title: "Liquidity Explained" },
  { id: "m04", n: 4, title: "Advanced Liquidity Concepts" },
  { id: "m05", n: 5, title: "Break of Structure" },
  { id: "m06", n: 6, title: "Fair Value Gaps" },
  { id: "m07", n: 7, title: "Advanced Imbalance Concepts" },
  { id: "m08", n: 8, title: "Inverse Fair Value Gaps" },
  { id: "m09", n: 9, title: "Equilibrium: Premium & Discount" },
  { id: "m10", n: 10, title: "SMT Divergence" },
  { id: "m11", n: 11, title: "Time Theory & Session Timing" },
  { id: "m12", n: 12, title: "Funded Accounts & Prop Firms" },
  { id: "m13", n: 13, title: "Building Daily Bias" },
  { id: "m14", n: 14, title: "Risk Management" },
  { id: "m15", n: 15, title: "Trading Psychology & Discipline" },
  { id: "m16", n: 16, title: "Full Strategy: The Order Flow Model" },
  { id: "m17", n: 17, title: "Range, Sweep, Reversal (H/L · NY ATM)" },
  { id: "m18", n: 18, title: "AMD / PO3: Accumulation, Manipulation, Distribution" },
] as const;
export const SCHOOL_MODULE_IDS = SCHOOL_MODULES.map((m) => m.id) as string[];

/** What the school page saves for each module: steps done ("1101"), passed, best score %, attempt number, exam tries, last attempt time. */
export type ModuleProgress = { s?: string; p?: number; sc?: number; a?: number; n?: number; at?: number };
type Best = { best?: number; pass?: boolean; n?: number; at?: number };
export type SchoolState = {
  v2?: { m?: Record<string, ModuleProgress> };
  // Classic school (earlier page)
  ch?: string[]; dives?: Record<string, Record<string, number>>; ck?: Record<string, Best>; ex?: Record<string, Best>;
};
export type SchoolAttemptRow = { kind: string; ref: string; score: number; total: number; pass: boolean; createdAt: Date | string };
export type SchoolSummary = {
  modules: { id: string; n: number; title: string; stepsDone: number; passed: boolean; best: number; tries: number; attempt: number; manualUnlock: boolean }[];
  passed: number; total: number;
  current: string;
  attempts: { label: string; pct: number; pass: boolean; at: string }[];
};

export function summarizeSchool(state: SchoolState | null, unlocks: string[], attempts: SchoolAttemptRow[]): SchoolSummary {
  const m = state?.v2?.m ?? {};
  const modules = SCHOOL_MODULES.map((def) => {
    const p = m[def.id] ?? {};
    return {
      id: def.id, n: def.n, title: def.title,
      stepsDone: String(p.s ?? "").split("").filter((c) => c === "1").length,
      passed: p.p === 1, best: p.p === 1 ? Math.max(0, Math.min(100, p.sc ?? 0)) : 0, tries: p.n ?? 0, attempt: p.a ?? 1,
      manualUnlock: unlocks.includes(def.id),
    };
  });
  const passed = modules.filter((x) => x.passed).length;
  const unlocked = (i: number) => i === 0 || modules[i - 1].passed || modules[i].manualUnlock;
  const cur = modules.findIndex((x, i) => !x.passed && unlocked(i));
  const label = (ref: string) => { const d = SCHOOL_MODULES.find((x) => x.id === ref); return d ? `Module ${d.n} exam · ${d.title}` : ref; };
  return {
    modules, passed, total: modules.length,
    current: passed === modules.length ? "Course complete" : cur >= 0 ? `Module ${modules[cur].n}` : "Not started",
    attempts: attempts.filter((a) => a.kind === "ex" && SCHOOL_MODULE_IDS.includes(a.ref)).slice(0, 12).map((a) => ({
      label: label(a.ref), pct: a.total ? a.score / a.total : 0, pass: a.pass, at: new Date(a.createdAt).toISOString(),
    })),
  };
}
