import type { PracticeSummary } from "./practice";
import type { SchoolSummary } from "./school";
import type { TradingPlanDTO } from "./tradingPlan";
// Shared data shapes between server loaders, API routes and client components (no server imports here).
import type { IncomePlan, PassPlan, RuleSet, SimResult, Instrument, DrawdownModel } from "./planner";
import type { RiskLevel, StartPhase } from "./projection";
import type { AccountPace } from "./pace";
import type { StrategyKey, StrategyMode } from "./strategies";

export const Instruments = ["NQ", "MNQ", "ES", "MES", "YM", "MYM", "RTY", "M2K", "CL", "MCL", "GC", "MGC"] as const;
export const Emotions = ["CALM", "CONFIDENT", "FOCUSED", "HESITANT", "FEARFUL", "FOMO", "FRUSTRATED", "REVENGE", "BORED", "EUPHORIC"] as const;
export const Stages = ["EVALUATION", "PASSED", "FUNDED", "LIVE", "FAILED", "ARCHIVED"] as const;

export type AppRole = "MEMBER" | "COACH" | "ADMIN";
export type Stage = "EVALUATION" | "PASSED" | "FUNDED" | "LIVE" | "FAILED" | "ARCHIVED";

export type PersonDTO = { id: string; name: string; avatarUrl: string; role: AppRole; discordId: string };

export type RoadmapDTO = {
  monthlyIncomeGoal: number;
  tradingDaysPerWeek: number;
  strategyMode: StrategyMode;
  multiSession: boolean;
  strategies: StrategyKey[];
  winRate: number;               // derived from the strategies (fixed win rates), not entered
  avgRR: number;
  tradesPerDay: number;
  primaryInstrument: Instrument;
  avgStopPoints: number;
};

export type RulesDTO = RuleSet & {
  firm: string;
  planName: string;
  drawdownNote: string;
  dailyLossNote: string;
  consistencyNote: string;
  notes: string | null;
  sourceUrl: string;
  dataStatus: "OFFICIAL" | "SECONDARY" | "VERIFY";
};

export type AccountDTO = {
  id: string;
  templateId: string;
  label: string;               // "MFFU Rapid 50K" or nickname
  nickname: string | null;
  stage: Stage;
  startDate: string;
  quantity: number;
  rules: RulesDTO;
  targetPassDays: number | null;
  riskPerTradeOverride: number | null;
  dailyLossLimitOverride: number | null;
  passPlan: PassPlan | null;
  sim: SimResult | null;
  pace: AccountPace;
  incomeTargets: IncomePlan["perAccount"][number] | null;
};

export type JournalDTO = {
  id: string;
  memberAccountId: string | null;
  accountLabel: string | null;
  tradeDate: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  setupType: string;
  contracts: number | null;
  riskPct: number | null;
  riskDollars: number | null;
  rrPlanned: number | null;
  rrRealized: number | null;
  outcome: "WIN" | "LOSS" | "BREAKEVEN";
  pnl: number;
  emotion: string;
  followedPlan: boolean;
  screenshotUrl: string | null;
  notes: string | null;
  feedbackCount: number;
};

export type FeedbackDTO = {
  id: string;
  coach: { name: string; avatarUrl: string };
  kind: "NOTE" | "PRAISE" | "WARNING" | "ACTION_ITEM";
  body: string;
  journalEntryId: string | null;
  memberAccountId: string | null;
  createdAt: string;
  readAt: string | null;
};

export type DashboardData = {
  viewer: PersonDTO;
  trader: PersonDTO;
  readOnly: boolean;           // true when a coach is viewing someone else's dashboard
  today: string;
  roadmap: RoadmapDTO | null;
  accounts: AccountDTO[];
  income: IncomePlan | null;
  journal: JournalDTO[];
  feedback: FeedbackDTO[];
  strategyStats: { key: StrategyKey; label: string; expected: number; actual: number | null; trades: number }[];
  projection: ProjectionDTO | null; // saved income projection = the member's trading plan
  practice: PracticeSummary | null; // Practice tab results (coaches see this)
  school: SchoolSummary | null;    // Trading School progress (coaches see this)
  tradingPlan: TradingPlanDTO | null; // written plan from Trading Plan → Build your plan
  stats: { todayPnl: number; weekPnl: number; monthPnl: number; trades30: number; winRate30: number | null; planFollowed30: number | null};
};

export type CatalogSize = {
  id: string; accountSize: number; profitTarget: number | null; maxLoss: number; dailyLossLimit: number | null;
  consistencyPct: number | null; minDays: number; drawdownNote: string; dataStatus: "OFFICIAL" | "SECONDARY" | "VERIFY";
  drawdownModel: DrawdownModel; maxMinis: number; maxMicros: number; profitSplit: string | null;
};
export type CatalogFirm = { firm: string; plans: { plan: string; sizes: CatalogSize[] }[] };

/** One line of a projection: N identical copy-traded accounts of one catalog template. */
export type ProjectionRowInput = {
  templateId: string;
  quantity: number;
  start: StartPhase;           // EVAL = still to pass · FUNDED = already funded
  costPerAttempt: number;      // $ per account per evaluation attempt (fee / reset / activation)
  monthlyFee: number;          // $ per account per month while evaluating
  payoutCap: number | null;    // $ gross per account per month the firm pays out; null = no cap
};
export type ProjectionDTO = {
  name: string;
  months: number;
  riskLevel: RiskLevel;
  rebuyOnFail: boolean;
  rows: ProjectionRowInput[];
  updatedAt: string | null;
};

export type CoachDirectoryRow = {
  trader: PersonDTO;
  accounts: number;
  fundedAccounts: number;
  drawdownRisk: number;        // 0 safe → 1 about to fail
  lastTradeDate: string | null;
  consistencyFailures: number;
  atRisk: number;
  behind: number;
  monthPnl: number;
  unreadFeedback: number;
  statuses: { label: string; status: AccountPace["status"] }[];
  school: { current: string; pct: number; certified: boolean } | null; // Trading School progress
};

/** Trading day in New York time (futures session dates). */
export function todayET(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}
