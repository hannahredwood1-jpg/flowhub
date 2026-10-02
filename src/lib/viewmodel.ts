// Pure assembly of dashboard data from plain rows. Used by the server loader AND the static preview.
import { buildIncomePlan, buildPassPlan, simulatePass, type Strategy } from "./planner";
import { computePace, memberRiskSummary } from "./pace";
import { STRATEGIES, STRATEGY_KEYS, strategyLabel } from "./strategies";
import type {
  AccountDTO, CoachDirectoryRow, DashboardData, FeedbackDTO, JournalDTO, PersonDTO, ProjectionDTO, RoadmapDTO, RulesDTO, Stage,
} from "./types";

export type RawAccount = {
  id: string; templateId: string; nickname: string | null; stage: Stage; startDate: string; quantity: number;
  targetPassDays: number | null; riskPerTradeOverride: number | null; dailyLossLimitOverride: number | null;
  rules: RulesDTO; // from ruleSnapshot
};

export type RawInput = {
  viewer: PersonDTO;
  trader: PersonDTO;
  today: string;
  roadmap: RoadmapDTO | null;
  accounts: RawAccount[];
  journal: Omit<JournalDTO, "accountLabel">[];
  feedback: FeedbackDTO[];
  projection?: ProjectionDTO | null;
};

const DEFAULT_STRATEGY: Strategy = { winRate: 0.5, avgRR: 40 / 15, tradesPerDay: 3, instrument: "MNQ", avgStopPoints: 15, tradingDaysPerWeek: 5 };

export const strategyOf = (r: RoadmapDTO | null): Strategy =>
  r ? { winRate: r.winRate, avgRR: r.avgRR, tradesPerDay: r.tradesPerDay, instrument: r.primaryInstrument, avgStopPoints: r.avgStopPoints, tradingDaysPerWeek: r.tradingDaysPerWeek } : DEFAULT_STRATEGY;

export const accountLabel = (a: { nickname: string | null; rules: RulesDTO }) =>
  a.nickname || `${shortFirm(a.rules.firm)} ${a.rules.planName.replace(/\s*\(.*\)/, "")} ${a.rules.accountSize / 1000}K`;

export function shortFirm(firm: string) {
  const map: Record<string, string> = {
    "My Funded Futures": "MFFU", "Lucid Trading": "Lucid", "Apex Trader Funding": "Apex", "Take Profit Trader": "TPT",
    "Alpha Futures": "Alpha", "FundedNext Futures": "FundedNext",
  };
  return map[firm] ?? firm;
}

const ACTIVE: Stage[] = ["EVALUATION", "PASSED", "FUNDED", "LIVE"];
const isFunded = (s: Stage) => s === "FUNDED" || s === "LIVE";

function weekStart(today: string) {
  const d = new Date(today + "T00:00:00Z");
  const wd = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - wd);
  return d.toISOString().slice(0, 10);
}
function daysAgo(today: string, n: number) {
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function buildDashboard(raw: RawInput): DashboardData {
  const strat = strategyOf(raw.roadmap);
  const active = raw.accounts.filter((a) => ACTIVE.includes(a.stage));

  const income =
    raw.roadmap && active.length
      ? buildIncomePlan(
          raw.roadmap.monthlyIncomeGoal,
          active.map((a) => ({ id: a.id, label: accountLabel(a), rules: a.rules, quantity: a.quantity, funded: isFunded(a.stage) })),
          strat,
        )
      : null;

  const accounts: AccountDTO[] = raw.accounts.map((a) => {
    const evalMode = !isFunded(a.stage) && a.rules.profitTarget != null;
    const passPlan = evalMode
      ? buildPassPlan(a.rules, strat, { targetDays: a.targetPassDays, riskOverride: a.riskPerTradeOverride, dllOverride: a.dailyLossLimitOverride })
      : null;
    const sim = passPlan && a.stage === "EVALUATION" ? simulatePass(a.rules, strat, passPlan, { runs: 1500 }) : null;
    const incomeTargets = income?.perAccount.find((p) => p.id === a.id) ?? null;
    const trades = raw.journal.filter((j) => j.memberAccountId === a.id).map((j) => ({ date: j.tradeDate, pnl: j.pnl }));
    const pace = computePace({
      rules: a.rules, trades, startDate: a.startDate, today: raw.today,
      mode: evalMode ? "EVAL" : "FUNDED",
      dailyGoal: evalMode ? passPlan?.dailyGoal ?? 0 : incomeTargets?.dailyGross ?? 0,
      monthlyGoal: incomeTargets?.monthlyGross,
    });
    return {
      id: a.id, templateId: a.templateId, label: accountLabel(a), nickname: a.nickname, stage: a.stage, startDate: a.startDate,
      quantity: a.quantity, rules: a.rules, targetPassDays: a.targetPassDays, riskPerTradeOverride: a.riskPerTradeOverride,
      dailyLossLimitOverride: a.dailyLossLimitOverride, passPlan, sim, pace, incomeTargets,
    };
  });

  const labels = new Map(accounts.map((a) => [a.id, a.label]));
  const journal: JournalDTO[] = [...raw.journal]
    .sort((x, y) => y.tradeDate.localeCompare(x.tradeDate))
    .map((j) => ({ ...j, accountLabel: j.memberAccountId ? labels.get(j.memberAccountId) ?? null : null }));

  const sum = (from: string) => journal.filter((j) => j.tradeDate >= from).reduce((s, j) => s + j.pnl, 0);
  const last30 = journal.filter((j) => j.tradeDate >= daysAgo(raw.today, 30));
  const decided = last30.filter((j) => j.outcome !== "BREAKEVEN");

  // Gamification: XP rewards process (logging, following the plan, green days), not just P/L.
  const greenDays = new Set(journal.filter((j) => j.pnl > 0).map((j) => j.tradeDate)).size;
  const xp = journal.length * 10 + journal.filter((j) => j.followedPlan).length * 15 + greenDays * 25 + (journal.filter((j) => j.screenshotUrl).length * 5);
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const nextLevelXp = level * level * 100;

  // Actual win rate per FLOWMTD strategy (journal "Strategy" field) vs its fixed win rate
  const strategyStats = STRATEGY_KEYS.map((key) => {
    const label = strategyLabel(key);
    const t = journal.filter((j) => j.setupType === label && j.outcome !== "BREAKEVEN");
    return { key, label, expected: STRATEGIES[key].winRate, trades: t.length, actual: t.length ? t.filter((j) => j.outcome === "WIN").length / t.length : null };
  }).filter((s) => s.trades > 0 || raw.roadmap?.strategies.includes(s.key));

  return {
    viewer: raw.viewer,
    trader: raw.trader,
    readOnly: raw.viewer.id !== raw.trader.id,
    today: raw.today,
    roadmap: raw.roadmap,
    accounts,
    income,
    journal,
    feedback: raw.feedback,
    strategyStats,
    projection: raw.projection ?? null,
    stats: {
      todayPnl: sum(raw.today),
      weekPnl: sum(weekStart(raw.today)),
      monthPnl: sum(raw.today.slice(0, 8) + "01"),
      trades30: last30.length,
      winRate30: decided.length ? decided.filter((j) => j.outcome === "WIN").length / decided.length : null,
      planFollowed30: last30.length ? last30.filter((j) => j.followedPlan).length / last30.length : null,
      level,
      xp,
      xpToNext: nextLevelXp - xp,
    },
  };
}

export function buildDirectoryRow(d: DashboardData): CoachDirectoryRow {
  const live = d.accounts.filter((a) => ACTIVE.includes(a.stage));
  const summary = memberRiskSummary(live.map((a) => a.pace));
  return {
    trader: d.trader,
    accounts: live.reduce((s, a) => s + a.quantity, 0),
    fundedAccounts: live.filter((a) => isFunded(a.stage)).reduce((s, a) => s + a.quantity, 0),
    drawdownRisk: summary.drawdownRisk,
    lastTradeDate: d.journal[0]?.tradeDate ?? null,
    consistencyFailures: summary.consistencyFailures,
    atRisk: summary.atRisk,
    behind: summary.behind,
    monthPnl: d.stats.monthPnl,
    unreadFeedback: d.feedback.filter((f) => !f.readAt).length,
    statuses: live.map((a) => ({ label: a.label, status: a.pace.status })),
  };
}

export type DirectorySort = "drawdown" | "recent" | "consistency";
export function sortDirectory(rows: CoachDirectoryRow[], sort: DirectorySort) {
  const r = [...rows];
  if (sort === "drawdown") r.sort((a, b) => b.drawdownRisk - a.drawdownRisk);
  if (sort === "recent") r.sort((a, b) => (b.lastTradeDate ?? "").localeCompare(a.lastTradeDate ?? ""));
  if (sort === "consistency") r.sort((a, b) => b.consistencyFailures - a.consistencyFailures || b.drawdownRisk - a.drawdownRisk);
  return r;
}
