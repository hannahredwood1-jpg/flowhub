// Pace tracking — compares journal results to the plan for one account.
// Used by the member dashboard (status chips) and the coach portal (sorting + flags).
import type { RuleSet } from "./planner";

export type DayTrade = { date: string; pnl: number }; // date = "YYYY-MM-DD"

export type PaceStatus = "PASSED" | "AHEAD" | "ON_PACE" | "BEHIND" | "AT_RISK" | "FAILED" | "NO_TRADES";

export type AccountPace = {
  status: PaceStatus;
  profit: number;
  balance: number;
  daysTraded: number;
  tradingDaysElapsed: number;
  expectedProfit: number;       // where the plan says they should be today
  progressPct: number;          // profit / target (eval) or / monthly goal (funded)
  floor: number;                // current max-loss floor (balance at which the account fails)
  drawdownRoom: number;         // balance - floor
  drawdownRoomPct: number;      // room / maxLoss (1 = untouched, 0 = failed)
  bestDay: number;
  bestDayShare: number;         // bestDay / total profit
  consistencyOk: boolean;
  lastTradeDate: string | null;
  flags: string[];
};

/** Mon–Fri days between two ISO dates, inclusive. */
export function weekdaysBetween(startISO: string, endISO: string) {
  const start = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  let n = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

export function dailyTotals(trades: DayTrade[]) {
  const byDay = new Map<string, number>();
  for (const t of trades) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl);
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, pnl]) => ({ date, pnl }));
}

export function computePace(args: {
  rules: RuleSet;
  trades: DayTrade[];
  startDate: string;
  today: string;
  dailyGoal: number;            // from the pass plan (eval) or income plan (funded, per account)
  mode: "EVAL" | "FUNDED";
  monthlyGoal?: number;         // funded mode: this account's monthly gross goal
}): AccountPace {
  const { rules, startDate, today, dailyGoal, mode } = args;
  const days = dailyTotals(args.trades.filter((t) => t.date >= startDate));
  const size = rules.accountSize;

  // Replay end-of-day balances to find the trailing floor.
  // Intraday-trailing accounts are approximated at EOD granularity (journal has no tick data) — conservative enough for pacing.
  let bal = size, floor = size - rules.maxLoss, breached = false, bestDay = 0;
  for (const d of days) {
    bal += d.pnl;
    if (bal <= floor) breached = true;
    bestDay = Math.max(bestDay, d.pnl);
    if (rules.drawdownModel !== "STATIC") floor = Math.min(size, Math.max(floor, bal - rules.maxLoss));
  }

  const profit = bal - size;
  const room = bal - floor;
  const roomPct = Math.max(0, Math.min(1, room / rules.maxLoss));
  const bestDayShare = profit > 0 ? bestDay / profit : 0;
  const consistencyOk = mode === "FUNDED" || !rules.consistencyPct || profit <= 0 || bestDayShare <= rules.consistencyPct / 100;
  const elapsed = weekdaysBetween(startDate, today);

  let goal: number;
  let expected: number;
  if (mode === "EVAL") {
    goal = rules.profitTarget ?? 0;
    expected = Math.min(goal, dailyGoal * elapsed);
  } else {
    goal = args.monthlyGoal ?? dailyGoal * 21;
    const monthStart = today.slice(0, 8) + "01";
    expected = dailyGoal * weekdaysBetween(monthStart > startDate ? monthStart : startDate, today);
  }
  const progressBase = mode === "EVAL" ? profit : days.filter((d) => d.date >= today.slice(0, 8) + "01").reduce((s, d) => s + d.pnl, 0);

  const flags: string[] = [];
  let status: PaceStatus;
  if (breached) {
    status = "FAILED";
    flags.push("Max loss breached");
  } else if (!days.length) {
    status = "NO_TRADES";
  } else if (mode === "EVAL" && goal > 0 && profit >= goal && days.length >= rules.minDays && consistencyOk) {
    status = "PASSED";
  } else if (roomPct < 0.25) {
    status = "AT_RISK";
    flags.push(`Only $${Math.round(room)} of drawdown left`);
  } else if (!consistencyOk) {
    status = "AT_RISK";
    flags.push(`Best day is ${Math.round(bestDayShare * 100)}% of profit (limit ${rules.consistencyPct}%)`);
  } else if (progressBase >= expected * 1.1 && expected > 0) {
    status = "AHEAD";
  } else if (progressBase >= expected * 0.85) {
    status = "ON_PACE";
  } else {
    status = "BEHIND";
    flags.push(`$${Math.round(expected - progressBase)} behind plan`);
  }
  if (roomPct < 0.5 && status !== "AT_RISK" && status !== "FAILED") flags.push("Drawdown under 50%");

  return {
    status,
    profit,
    balance: bal,
    daysTraded: days.length,
    tradingDaysElapsed: elapsed,
    expectedProfit: Math.round(expected),
    progressPct: goal > 0 ? Math.max(0, progressBase / goal) : 0,
    floor,
    drawdownRoom: room,
    drawdownRoomPct: roomPct,
    bestDay,
    bestDayShare,
    consistencyOk,
    lastTradeDate: days.at(-1)?.date ?? null,
    flags,
  };
}

/** Coach-portal sort keys for one member, rolled up across their active accounts. */
export function memberRiskSummary(paces: AccountPace[]) {
  const active = paces.filter((p) => p.status !== "FAILED");
  return {
    drawdownRisk: active.length ? 1 - Math.min(...active.map((p) => p.drawdownRoomPct)) : 0, // 0 safe → 1 about to fail
    lastTradeDate: paces.map((p) => p.lastTradeDate).filter(Boolean).sort().at(-1) ?? null,
    consistencyFailures: paces.filter((p) => !p.consistencyOk).length,
    atRisk: paces.filter((p) => p.status === "AT_RISK").length,
    behind: paces.filter((p) => p.status === "BEHIND").length,
  };
}
