// Trading School progress, summarised for coaches. Mirrors the module list in school/src/content/*.js
// (a test keeps the two in step). The page itself saves progress under `state.v2`; the older keys
// (ch, dives, ck, ex) belong to the Classic school and are left untouched.
export const SCHOOL_MODULES = [
  { id: "m37", n: 1, title: "Market Basics" },
  { id: "m01", n: 2, title: "Trading Mindset" },
  { id: "m19", n: 3, title: "TradingView & Platform Setup" },
  { id: "m38", n: 4, title: "Your First 20 Minutes on a Chart" },
  { id: "m20", n: 5, title: "How Futures & NQ Work" },
  { id: "m02", n: 6, title: "Chart Reading Basics" },
  { id: "m40", n: 7, title: "Support, Resistance & Trend Lines" },
  { id: "m41", n: 8, title: "Sessions & Economic News" },
  { id: "m21", n: 9, title: "Orders & Your First Trade" },
  { id: "m39", n: 10, title: "Your Demo Account: Open It and Use It" },
  { id: "m42", n: 11, title: "One Trade Per Session" },
  { id: "m03", n: 12, title: "Liquidity Explained" },
  { id: "m04", n: 13, title: "Advanced Liquidity Concepts" },
  { id: "m05", n: 14, title: "Break of Structure" },
  { id: "m06", n: 15, title: "Fair Value Gaps" },
  { id: "m07", n: 16, title: "Advanced Imbalance Concepts" },
  { id: "m08", n: 17, title: "Inverse Fair Value Gaps" },
  { id: "m09", n: 18, title: "Equilibrium: Premium & Discount" },
  { id: "m10", n: 19, title: "SMT Divergence" },
  { id: "m11", n: 20, title: "Time Theory & Session Timing" },
  { id: "m12", n: 21, title: "Funded Accounts & Prop Firms" },
  { id: "m13", n: 22, title: "Building Daily Bias" },
  { id: "m14", n: 23, title: "Risk Management" },
  { id: "m23", n: 24, title: "Trade Management & Spot the Mistake" },
  { id: "m24", n: 25, title: "Why the Math Works" },
  { id: "m15", n: 26, title: "Trading Psychology & Discipline" },
  { id: "m25", n: 27, title: "A Day in the Life & Your Trading Plan" },
  { id: "m16", n: 28, title: "Putting It All Together: The Complete Read" },
  { id: "m31", n: 29, title: "ESC VLCTY: The Idea" },
  { id: "m32", n: 30, title: "ESC VLCTY: The New York Half" },
  { id: "m33", n: 31, title: "ESC VLCTY: The Asia Half" },
  { id: "m34", n: 32, title: "ESC VLCTY: Sizing & Risk Modes" },
  { id: "m35", n: 33, title: "ESC VLCTY: Setup, Fills & Your Routine" },
  { id: "m36", n: 34, title: "ESC VLCTY: Worked Trades & Make the Call" },
  { id: "m27", n: 35, title: "ECHO X ORBIT: Two Engines & the Shared Rules" },
  { id: "m28", n: 36, title: "Echo" },
  { id: "m29", n: 37, title: "Orbit" },
  { id: "m30", n: 38, title: "ECHO X ORBIT: Make the Call (Final Exam)" },
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
