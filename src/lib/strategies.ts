// FLOWMTD strategy catalog — fixed win rates used by the planner instead of asking members for a win rate.
// To change a number, edit it here; every plan recalculates on next load.

export type Session = "ASIA" | "NY";
export type StrategyKey = "DAILY_LEVELS" | "INVERTIX" | LegacyStrategyKey;
/** Retired setups of the old NYFLOW / ASIAFLOW indicators: kept only so old roadmaps and journal rows still resolve. Not selectable. */
export type LegacyStrategyKey = "ESC_VLCTY" | "ASIAFLOW_PO3" | "ASIAFLOW_A3IA" | "NYFLOW_PO3" | "NYFLOW_HL";
export type StrategyMode = "DAILY_LEVELS" | "INDICATORS";

export type Strategy = { key: StrategyKey; indicator: string; name: string; winRate: number; sessions: Session[] };

export const STRATEGIES: Record<StrategyKey, Strategy> = {
  DAILY_LEVELS:  { key: "DAILY_LEVELS",  indicator: "ECHO X ORBIT", name: "ECHO X ORBIT", winRate: 0.94,  sessions: [] },
  // Planner win rates (used for the maths only, never shown).
  INVERTIX:      { key: "INVERTIX",      indicator: "INVERTIX",     name: "INVERTIX",     winRate: 0.65,  sessions: ["ASIA", "NY"] },
  ESC_VLCTY:     { key: "ESC_VLCTY",     indicator: "ESC VLCTY",    name: "ESC VLCTY",    winRate: 0.47,  sessions: ["NY", "ASIA"] }, // retired
  ASIAFLOW_PO3:  { key: "ASIAFLOW_PO3",  indicator: "ASIAFLOW",     name: "PO3",          winRate: 0.70,  sessions: ["ASIA"] },
  ASIAFLOW_A3IA: { key: "ASIAFLOW_A3IA", indicator: "ASIAFLOW",     name: "A3IA",         winRate: 0.81,  sessions: ["ASIA"] },
  NYFLOW_PO3:    { key: "NYFLOW_PO3",    indicator: "NYFLOW",       name: "PO3",          winRate: 0.745, sessions: ["NY"] },
  NYFLOW_HL:     { key: "NYFLOW_HL",     indicator: "NYFLOW",       name: "H/L",          winRate: 0.84,  sessions: ["NY"] },
};

/** The indicator models a member can pick in "indicators" mode (ECHO X ORBIT is its own mode). */
export const INDICATORS: { name: string; sessions: string; strategies: StrategyKey[] }[] = [
  { name: "INVERTIX", sessions: "Asia · New York", strategies: ["INVERTIX"] },
];

export const STRATEGY_KEYS = Object.keys(STRATEGIES) as StrategyKey[];
export const RETIRED_STRATEGIES: StrategyKey[] = ["ESC_VLCTY", "ASIAFLOW_PO3", "ASIAFLOW_A3IA", "NYFLOW_PO3", "NYFLOW_HL"];
export const SELECTABLE_STRATEGY_KEYS = STRATEGY_KEYS.filter((k) => !RETIRED_STRATEGIES.includes(k));
export const strategyLabel = (k: StrategyKey) => (RETIRED_STRATEGIES.includes(k) ? `${STRATEGIES[k].indicator} · ${STRATEGIES[k].name}` : STRATEGIES[k].name);

export type StrategySelection = { mode: StrategyMode; multiSession: boolean; strategies: StrategyKey[] };

/** Keeps a selection consistent: daily-levels mode ignores indicators; retired setups are dropped. */
export function normalizeSelection(sel: StrategySelection): StrategySelection {
  if (sel.mode === "DAILY_LEVELS") return { mode: "DAILY_LEVELS", multiSession: false, strategies: ["DAILY_LEVELS"] };
  const picks = [...new Set(sel.strategies)].filter((k) => k !== "DAILY_LEVELS" && STRATEGIES[k] && !RETIRED_STRATEGIES.includes(k));
  return { mode: "INDICATORS", multiSession: sel.multiSession, strategies: picks };
}

/** Planner win rate = average of the chosen setups' fixed win rates (each setup assumed to be traded equally often). */
export function blendedWinRate(sel: StrategySelection): number {
  const s = normalizeSelection(sel).strategies;
  if (!s.length) return STRATEGIES.DAILY_LEVELS.winRate;
  return s.reduce((sum, k) => sum + STRATEGIES[k].winRate, 0) / s.length;
}

export function sessionsOf(sel: StrategySelection): Session[] {
  return [...new Set(normalizeSelection(sel).strategies.flatMap((k) => STRATEGIES[k].sessions))];
}

/** Journal "setup" choices: one per strategy, so actual results can be compared to the fixed win rates. */
export const JOURNAL_SETUPS = SELECTABLE_STRATEGY_KEYS.map(strategyLabel);
