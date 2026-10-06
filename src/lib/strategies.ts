// FLOWMTD strategy catalog — fixed win rates used by the planner instead of asking members for a win rate.
// To change a number, edit it here; every plan recalculates on next load.

export type Session = "ASIA" | "NY";
export type StrategyKey = "DAILY_LEVELS" | "ASIAFLOW_PO3" | "ASIAFLOW_A3IA" | "NYFLOW_PO3" | "NYFLOW_HL";
export type StrategyMode = "DAILY_LEVELS" | "INDICATORS";

export type Strategy = { key: StrategyKey; indicator: string; name: string; winRate: number; session: Session | null };

export const STRATEGIES: Record<StrategyKey, Strategy> = {
  DAILY_LEVELS:  { key: "DAILY_LEVELS",  indicator: "ECHO X ORBIT", name: "ECHO X ORBIT", winRate: 0.94,  session: null },
  ASIAFLOW_PO3:  { key: "ASIAFLOW_PO3",  indicator: "ASIAFLOW",     name: "PO3",          winRate: 0.70,  session: "ASIA" },
  // A3IA is retired: kept only so old roadmaps and journal rows still resolve. Not selectable.
  ASIAFLOW_A3IA: { key: "ASIAFLOW_A3IA", indicator: "ASIAFLOW",     name: "A3IA",         winRate: 0.81,  session: "ASIA" },
  NYFLOW_PO3:    { key: "NYFLOW_PO3",    indicator: "NYFLOW",       name: "PO3",          winRate: 0.745, session: "NY" },
  NYFLOW_HL:     { key: "NYFLOW_HL",     indicator: "NYFLOW",       name: "H/L",          winRate: 0.84,  session: "NY" },
};

export const INDICATORS: { name: string; session: Session; strategies: StrategyKey[] }[] = [
  { name: "ASIAFLOW", session: "ASIA", strategies: ["ASIAFLOW_PO3"] },
  { name: "NYFLOW", session: "NY", strategies: ["NYFLOW_PO3", "NYFLOW_HL"] },
];

export const STRATEGY_KEYS = Object.keys(STRATEGIES) as StrategyKey[];
export const RETIRED_STRATEGIES: StrategyKey[] = ["ASIAFLOW_A3IA"];
export const SELECTABLE_STRATEGY_KEYS = STRATEGY_KEYS.filter((k) => !RETIRED_STRATEGIES.includes(k));
export const strategyLabel = (k: StrategyKey) => (k === "DAILY_LEVELS" ? "ECHO X ORBIT" : `${STRATEGIES[k].indicator} · ${STRATEGIES[k].name}`);

export type StrategySelection = { mode: StrategyMode; multiSession: boolean; strategies: StrategyKey[] };

/** Keeps a selection consistent: daily-levels mode ignores indicators; single-session keeps one indicator's setups. */
export function normalizeSelection(sel: StrategySelection): StrategySelection {
  if (sel.mode === "DAILY_LEVELS") return { mode: "DAILY_LEVELS", multiSession: false, strategies: ["DAILY_LEVELS"] };
  let picks = [...new Set(sel.strategies)].filter((k) => k !== "DAILY_LEVELS" && STRATEGIES[k] && !RETIRED_STRATEGIES.includes(k));
  if (!sel.multiSession && picks.length) {
    const session = STRATEGIES[picks[0]].session;
    picks = picks.filter((k) => STRATEGIES[k].session === session);
  }
  return { mode: "INDICATORS", multiSession: sel.multiSession, strategies: picks };
}

/** Planner win rate = average of the chosen setups' fixed win rates (each setup assumed to be traded equally often). */
export function blendedWinRate(sel: StrategySelection): number {
  const s = normalizeSelection(sel).strategies;
  if (!s.length) return STRATEGIES.DAILY_LEVELS.winRate;
  return s.reduce((sum, k) => sum + STRATEGIES[k].winRate, 0) / s.length;
}

export function sessionsOf(sel: StrategySelection): Session[] {
  return [...new Set(normalizeSelection(sel).strategies.map((k) => STRATEGIES[k].session).filter((x): x is Session => !!x))];
}

/** Journal "setup" choices: one per strategy, so actual results can be compared to the fixed win rates. */
export const JOURNAL_SETUPS = SELECTABLE_STRATEGY_KEYS.map(strategyLabel);

/** ECHO X ORBIT research stays private: never show its win rate (or anything derived from it) to members. */
export const hideRate = (mode: string) => mode === "DAILY_LEVELS";
