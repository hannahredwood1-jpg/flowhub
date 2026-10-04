// Trading plan: the member's written rules, built in Trading Plan → Build your plan.
// It shows on the dashboard, feeds the pre-session checklist, and coaches can read it.

export const PLAN_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const PLAN_SESSIONS = { ASIA: "Asia · 8 PM–12 AM", LONDON: "London · 2–5 AM", NY: "New York · 7–10 AM" } as const;
export const PLAN_MODELS = { ECHO_X_ORBIT: "ECHO x ORBIT (Discord calls)", NYFLOW_HL: "NYFlow · H/L", NYFLOW_PO3: "NYFlow · PO3", ASIAFLOW_PO3: "AsiaFlow · PO3" } as const;
export const PLAN_ENTRY = { limit: "Limit at the level when it qualifies", confirmation: "Wait for confirmation", both: "Limit when it qualifies, otherwise confirmation" } as const;
export type PlanSession = keyof typeof PLAN_SESSIONS;
export type PlanModel = keyof typeof PLAN_MODELS;

export type TradingPlanInput = {
  schedule: { days: (typeof PLAN_DAYS)[number][]; sessions: PlanSession[]; start: string; end: string };
  models: PlanModel[];
  entries: { entry: keyof typeof PLAN_ENTRY; stopPts: number; targetPts: number; beAt1R: boolean; partials: boolean };
  risk: { instrument: "MNQ" | "NQ"; contracts: number; maxLossesPerDay: number; maxTradesPerDay: number; dailyProfitStop: number | null; noNews: boolean };
  numbers: { monthlyGoal: number; tradingDays: number };
  rules: string[];
};
export type TradingPlanDTO = TradingPlanInput & { done: true; updatedAt: string };

export const POINT_VALUE = { MNQ: 2, NQ: 20 } as const;
export const planRiskPerTrade = (p: TradingPlanInput) => p.entries.stopPts * POINT_VALUE[p.risk.instrument] * p.risk.contracts;
export const planRewardPerTrade = (p: TradingPlanInput) => p.entries.targetPts * POINT_VALUE[p.risk.instrument] * p.risk.contracts;
export const planMaxDailyLoss = (p: TradingPlanInput) => planRiskPerTrade(p) * p.risk.maxLossesPerDay;
export const fmtTime = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };

/** Pre-session checklist lines generated from the plan (falls back to the generic list when there's no plan). */
export function planChecklist(p: TradingPlanInput): string[] {
  const models = p.models.map((m) => PLAN_MODELS[m].replace(" (Discord calls)", "")).join(" / ");
  const lines = [
    `Today is a plan day and I'm inside my window: ${fmtTime(p.schedule.start)}–${fmtTime(p.schedule.end)} ET.`,
    p.risk.noNews ? "Checked the news calendar. No trading into red-folder news." : "Checked the news calendar.",
    `Only my models: ${models}. Levels and draws marked.`,
    `Bracket ready: ${p.entries.stopPts}-pt stop, ${p.entries.targetPts}-pt target, ${p.risk.contracts} ${p.risk.instrument}.`,
    `Daily stop: ${p.risk.maxLossesPerDay} loss${p.risk.maxLossesPerDay > 1 ? "es" : ""} or ${p.risk.maxTradesPerDay} trade${p.risk.maxTradesPerDay > 1 ? "s" : ""} = done.`,
    "Calm and rested. Not trying to win back yesterday.",
  ];
  return [...lines, ...p.rules];
}
