// Income projection engine — pure functions, no DB/React imports, unit-tested.
//
// A member lays out any mix of prop firm accounts (e.g. 3× Lucid Flex 50K in evaluation + 2× Apex 100K funded).
// From their FLOWMTD strategy (fixed win rates, their R:R, trades/day, stop) we build:
//   1. planAccount       → per-account daily plan: risk per trade, contracts, daily target, daily stop, loss limit
//   2. expectedIncome    → straight-line expected monthly/weekly/daily income once everything is funded
//   3. simulateProjection→ Monte Carlo month-by-month income (bad / typical / good month), including evals that
//                          fail, re-buys, payouts and costs. Every account trades the SAME trade sequence each day
//                          (members copy their entries across accounts), so results are correlated like real life.

import {
  contractsFor, expectancyR, minDaysForConsistency, parseSplit, riskLimits,
  type RuleSet, type Strategy,
} from "./planner";

export type RiskLevel = "CONSERVATIVE" | "STANDARD" | "AGGRESSIVE";
export const RISK_LEVELS: { key: RiskLevel; label: string; mult: number; note: string }[] = [
  { key: "CONSERVATIVE", label: "Low", mult: 0.75, note: "Conservative: 75% of the safe risk cap" },
  { key: "STANDARD", label: "Standard", mult: 1, note: "Standard: the safe risk cap" },
  { key: "AGGRESSIVE", label: "High", mult: 1.35, note: "Aggressive: 135% of the safe cap. Faster, but more blow-ups" },
];
const multOf = (r: RiskLevel) => RISK_LEVELS.find((x) => x.key === r)?.mult ?? 1;

export type StartPhase = "EVAL" | "FUNDED";

export type ProjectionRow = {
  key: string;             // stable id for React / results
  label: string;           // "Lucid Flex 50K"
  rules: RuleSet;
  quantity: number;        // identical copy-traded accounts
  start: StartPhase;       // starting in evaluation, or already funded
  costPerAttempt: number;  // eval fee / reset / activation per attempt, per account ($)
  monthlyFee: number;      // subscription while in evaluation, per account per month ($)
  payoutCap: number | null; // most a firm pays out per account per month (gross); null = no cap
};

/** Starting payout cap when a member hasn't entered their firm's: 6% of account size (50K → $3,000/month). */
export const defaultPayoutCap = (accountSize: number) => Math.max(500, Math.round((accountSize * 0.06) / 500) * 500);

export type ProjectionConfig = {
  months: number;          // 1–12
  riskLevel: RiskLevel;
  rebuyOnFail: boolean;    // buy a new evaluation when an account fails
};

const floorTo = (n: number, step = 1) => Math.floor(n / step) * step;
const round = (n: number, step = 1) => Math.round(n / step) * step;
export const tradingDaysPerMonth = (s: Strategy) => (s.tradingDaysPerWeek * 52) / 12;

// ─────────────────────────────────────────────────────────────
// 1. Per-account daily plan
// ─────────────────────────────────────────────────────────────

export type PhasePlan = {
  riskPerTrade: number;
  contracts: ReturnType<typeof contractsFor>;
  dailyTarget: number;     // eval: pace to pass · funded: expected day at this risk
  dailyStop: number;       // personal stop (≤ firm DLL)
  maxLosses: number;       // full losses in a day before stopping
  walkAway: number;        // stop for the day once up this much
  bestDayCap: number | null; // eval consistency: never make more than this in a day
  lossesToFail: number;    // full-size losses in a row that would fail the account
};

export type AccountPlan = {
  eval: (PhasePlan & { daysToPass: number | null; minDays: number }) | null; // null if no evaluation (instant funded)
  funded: PhasePlan & { expectedMonthlyGross: number; expectedMonthlyTakeHome: number };
  split: number;
  warnings: string[];
};

function phasePlan(rules: RuleSet, strat: Strategy, risk: number, dailyStop: number, dailyTarget: number, bestDayCap: number | null): PhasePlan {
  return {
    riskPerTrade: risk,
    contracts: contractsFor(risk, strat, rules),
    dailyTarget: round(dailyTarget, 5),
    dailyStop,
    maxLosses: risk > 0 ? Math.max(1, Math.floor(dailyStop / risk)) : 0,
    walkAway: round(Math.max(dailyTarget * 1.5, risk * strat.avgRR), 5),
    bestDayCap,
    lossesToFail: risk > 0 ? Math.floor(rules.maxLoss / risk) : 0,
  };
}

export function planAccount(rules: RuleSet, strat: Strategy, riskLevel: RiskLevel = "STANDARD"): AccountPlan {
  const warnings: string[] = [];
  const m = multOf(riskLevel);
  const E = expectancyR(strat.winRate, strat.avgRR);
  const split = parseSplit(rules.profitSplit);
  if (E <= 0) warnings.push("Your win rate and R:R give no edge — every projection will trend down.");

  let evalPlan: AccountPlan["eval"] = null;
  if (rules.profitTarget != null) {
    const lim = riskLimits(rules, strat, strat.tradesPerDay * 10);
    const risk = floorTo(lim.riskCap * m, 5);
    const minDays = Math.max(1, rules.minDays, minDaysForConsistency(rules.consistencyPct));
    const perDay = E > 0 ? strat.tradesPerDay * E * risk : 0;
    const daysToPass = perDay > 0 ? Math.max(minDays, Math.ceil(rules.profitTarget / perDay)) : null;
    const bestDayCap = rules.consistencyPct ? floorTo((rules.profitTarget * rules.consistencyPct) / 100, 25) : null;
    const dailyTarget = daysToPass ? rules.profitTarget / daysToPass : 0;
    evalPlan = { ...phasePlan(rules, strat, risk, lim.dailyStop, dailyTarget, bestDayCap), daysToPass, minDays };
    if (bestDayCap) evalPlan.walkAway = Math.min(evalPlan.walkAway, floorTo(bestDayCap * 0.9, 5));
  }

  const fl = riskLimits({ ...rules, profitTarget: null }, strat, strat.tradesPerDay * 20);
  const fRisk = floorTo(fl.riskCap * m, 5);
  const fDaily = E > 0 ? strat.tradesPerDay * E * fRisk : 0;
  const gross = fDaily * tradingDaysPerMonth(strat);
  const funded = { ...phasePlan(rules, strat, fRisk, fl.dailyStop, fDaily, null), expectedMonthlyGross: round(gross, 5), expectedMonthlyTakeHome: round(gross * split, 5) };

  const c = (evalPlan ?? funded).contracts;
  if (c.minis === 0 && c.micros === 0)
    warnings.push(`A ${strat.avgStopPoints}-pt stop on 1 ${c.micro} risks $${c.riskPerMicro}, more than this account's planned risk. Tighten the stop or pick a bigger account.`);
  return { eval: evalPlan, funded, split, warnings };
}

// ─────────────────────────────────────────────────────────────
// 2. Straight-line expectation (everything funded)
// ─────────────────────────────────────────────────────────────

export type ExpectedIncome = {
  monthlyTakeHome: number; weeklyTakeHome: number; dailyTakeHome: number; monthlyGross: number;
  fundedUnits: number; goal: number | null; goalCoverage: number | null; unitsForGoal: number | null;
};

export function expectedIncome(rows: ProjectionRow[], strat: Strategy, riskLevel: RiskLevel, goal: number | null): ExpectedIncome {
  let takeHome = 0, gross = 0, units = 0;
  for (const r of rows) {
    const p = planAccount(r.rules, strat, riskLevel);
    const g = r.payoutCap ? Math.min(p.funded.expectedMonthlyGross, r.payoutCap) : p.funded.expectedMonthlyGross;
    takeHome += g * p.split * r.quantity;
    gross += g * r.quantity;
    units += r.quantity;
  }
  const perUnit = units ? takeHome / units : 0;
  const tdpm = tradingDaysPerMonth(strat);
  return {
    monthlyTakeHome: round(takeHome, 5),
    weeklyTakeHome: round((takeHome * 12) / 52, 5),
    dailyTakeHome: round(takeHome / tdpm, 5),
    monthlyGross: round(gross, 5),
    fundedUnits: units,
    goal,
    goalCoverage: goal && goal > 0 ? takeHome / goal : null,
    unitsForGoal: goal && perUnit > 0 ? Math.ceil(goal / perUnit) : null,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. Monte Carlo month-by-month projection
// ─────────────────────────────────────────────────────────────

export type MonthResult = {
  month: number;          // 1-based
  p10: number;            // bad month (net take-home after costs)
  p50: number;            // typical month
  p90: number;            // good month
  mean: number;
  costs: number;          // average costs that month
  fundedUnits: number;    // median funded accounts at month end
  cumulativeP50: number;  // typical running total
};

export type RowResult = {
  key: string;
  passRate: number | null;        // share of runs where the first evaluation passed
  medianDaysToPass: number | null;
  fundedBlowupRate: number;       // share of runs where a funded account in this row failed
  avgAttempts: number;            // evaluations bought per account (incl. the first)
  avgPayouts: number;             // take-home per account over the whole horizon
};

export type ProjectionResult = {
  months: MonthResult[];
  rows: RowResult[];
  totalP10: number; totalP50: number; totalP90: number; // whole-horizon net take-home
  firstPayoutMonthP50: number | null;
  runs: number;
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const quantile = (sorted: number[], q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1) + 0.5)))] : 0);

type RowState = { phase: StartPhase | "DEAD"; bal: number; floor: number; peak: number; bestDay: number; days: number };
const MIN_PAYOUT = 250;

export function simulateProjection(
  rows: ProjectionRow[], strat: Strategy, cfg: ProjectionConfig,
  { runs = 400, seed = 7 }: { runs?: number; seed?: number } = {},
): ProjectionResult {
  const rand = mulberry32(seed);
  const tdpm = tradingDaysPerMonth(strat);
  const monthDays = Array.from({ length: cfg.months }, (_, m) => Math.round(tdpm * (m + 1)) - Math.round(tdpm * m));
  const plans = rows.map((r) => planAccount(r.rules, strat, cfg.riskLevel));
  const maxTrades = Math.ceil(strat.tradesPerDay) + 1;

  const netByMonth = Array.from({ length: cfg.months }, () => new Float64Array(runs));
  const costByMonth = new Float64Array(cfg.months);
  const fundedByMonth = Array.from({ length: cfg.months }, () => new Float64Array(runs));
  const totals = new Float64Array(runs);
  const firstPayout: number[] = [];
  const rowStats = rows.map(() => ({ firstPass: 0, firstEval: 0, passDays: [] as number[], fundedFails: 0, attempts: 0, payout: 0 }));
  const outcomes: boolean[] = new Array(maxTrades);

  const fresh = (row: ProjectionRow, phase: StartPhase): RowState =>
    ({ phase, bal: row.rules.accountSize, floor: row.rules.accountSize - row.rules.maxLoss, peak: row.rules.accountSize, bestDay: 0, days: 0 });

  for (let r = 0; r < runs; r++) {
    const st = rows.map((row, i) => {
      const s = fresh(row, row.start === "EVAL" && plans[i].eval ? "EVAL" : "FUNDED");
      if (s.phase === "EVAL") rowStats[i].attempts++;
      return s;
    });
    const evalCount = st.map((s) => (s.phase === "EVAL" ? 1 : 0));
    const everFundedFail = rows.map(() => false);
    const firstEvalDone = rows.map((_, i) => st[i].phase !== "EVAL");
    let gotPayout = -1, runTotal = 0;

    for (let m = 0; m < cfg.months; m++) {
      let net = 0;
      // Start-of-month costs: first attempt fee (month 1) + subscription while evaluating
      rows.forEach((row, i) => {
        let c = 0;
        if (m === 0 && st[i].phase === "EVAL") c += row.costPerAttempt;
        if (st[i].phase === "EVAL") c += row.monthlyFee;
        c *= row.quantity; net -= c; costByMonth[m] += c;
      });

      for (let d = 0; d < monthDays[m]; d++) {
        const n = Math.floor(strat.tradesPerDay) + (rand() < strat.tradesPerDay % 1 ? 1 : 0);
        for (let t = 0; t < n; t++) outcomes[t] = rand() < strat.winRate;

        rows.forEach((row, i) => {
          const s = st[i];
          if (s.phase === "DEAD") return;
          const rules = row.rules;
          const p = s.phase === "EVAL" ? plans[i].eval! : plans[i].funded;
          const start = s.bal;
          const dll = rules.dailyLossLimit;
          let failed = false;
          s.days++;
          for (let t = 0; t < n; t++) {
            const day = s.bal - start;
            if (day <= -p.dailyStop || (dll && day <= -dll) || day >= p.walkAway) break;
            s.bal += outcomes[t] ? p.riskPerTrade * strat.avgRR : -p.riskPerTrade;
            if (rules.drawdownModel === "INTRADAY_TRAILING") {
              s.peak = Math.max(s.peak, s.bal);
              s.floor = Math.min(rules.accountSize, Math.max(s.floor, s.peak - rules.maxLoss));
            }
            if (s.bal <= s.floor) { failed = true; break; }
          }
          if (!failed) {
            s.bestDay = Math.max(s.bestDay, s.bal - start);
            if (rules.drawdownModel === "EOD_TRAILING") s.floor = Math.min(rules.accountSize, Math.max(s.floor, s.bal - rules.maxLoss));
          }

          if (failed) {
            if (s.phase === "FUNDED") everFundedFail[i] = true;
            if (s.phase === "EVAL" && !firstEvalDone[i]) { firstEvalDone[i] = true; rowStats[i].firstEval++; }
            if (cfg.rebuyOnFail && plans[i].eval) {
              Object.assign(s, fresh(row, "EVAL"));
              evalCount[i]++; rowStats[i].attempts++;
              const c = row.costPerAttempt * row.quantity; net -= c; costByMonth[m] += c;
            } else s.phase = "DEAD";
            return;
          }
          if (s.phase === "EVAL") {
            const e = plans[i].eval!;
            const profit = s.bal - rules.accountSize;
            const consistent = !rules.consistencyPct || s.bestDay <= (profit * rules.consistencyPct) / 100;
            if (profit >= (rules.profitTarget ?? 0) && s.days >= e.minDays && consistent) {
              if (!firstEvalDone[i]) { firstEvalDone[i] = true; rowStats[i].firstEval++; rowStats[i].firstPass++; rowStats[i].passDays.push(s.days); }
              Object.assign(s, fresh(row, "FUNDED"));
            }
          }
        });
      }

      // Month-end payouts: withdraw profit above a cushion of one max-loss (keeps the trailing floor locked),
      // up to the firm's monthly cap — anything above the cap stays in the account as extra cushion
      let funded = 0;
      rows.forEach((row, i) => {
        const s = st[i];
        if (s.phase !== "FUNDED") return;
        funded += row.quantity;
        const cushion = row.rules.accountSize + row.rules.maxLoss;
        const w = Math.min(s.bal - cushion, row.payoutCap ?? Infinity);
        if (w >= MIN_PAYOUT) {
          const take = w * plans[i].split * row.quantity;
          net += take; rowStats[i].payout += take / row.quantity;
          s.bal -= w;
          if (gotPayout < 0) gotPayout = m + 1;
        }
      });
      netByMonth[m][r] = net;
      fundedByMonth[m][r] = funded;
      runTotal += net;
    }
    totals[r] = runTotal;
    firstPayout.push(gotPayout > 0 ? gotPayout : Infinity);
    everFundedFail.forEach((f, i) => { if (f) rowStats[i].fundedFails++; });
  }

  let cum = 0;
  const months: MonthResult[] = netByMonth.map((arr, m) => {
    const s = Array.from(arr).sort((a, b) => a - b);
    const f = Array.from(fundedByMonth[m]).sort((a, b) => a - b);
    const p50 = quantile(s, 0.5);
    cum += p50;
    return {
      month: m + 1,
      p10: round(quantile(s, 0.1)), p50: round(p50), p90: round(quantile(s, 0.9)),
      mean: round(s.reduce((a, b) => a + b, 0) / runs),
      costs: round(costByMonth[m] / runs),
      fundedUnits: quantile(f, 0.5),
      cumulativeP50: round(cum),
    };
  });
  const tot = Array.from(totals).sort((a, b) => a - b);
  firstPayout.sort((a, b) => a - b);

  return {
    months,
    rows: rows.map((row, i) => {
      const s = rowStats[i];
      s.passDays.sort((a, b) => a - b);
      return {
        key: row.key,
        passRate: plans[i].eval && row.start === "EVAL" ? (s.firstEval ? s.firstPass / runs : 0) : null,
        medianDaysToPass: s.passDays.length ? s.passDays[Math.floor(s.passDays.length / 2)] : null,
        fundedBlowupRate: s.fundedFails / runs,
        avgAttempts: s.attempts / runs,
        avgPayouts: round(s.payout / runs),
      };
    }),
    totalP10: round(quantile(tot, 0.1)), totalP50: round(quantile(tot, 0.5)), totalP90: round(quantile(tot, 0.9)),
    firstPayoutMonthP50: Number.isFinite(quantile(firstPayout, 0.5)) ? quantile(firstPayout, 0.5) : null,
    runs,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. Combined daily trading plan across all accounts
// ─────────────────────────────────────────────────────────────

export type DayPlanRow = {
  key: string; label: string; quantity: number; phase: StartPhase;
  plan: PhasePlan; daysToPass: number | null;
  firmMaxLoss: number;                 // the firm's max drawdown for this account
  firmDll: number | null;              // the firm's daily loss limit, if it has one
  drawdownModel: RuleSet["drawdownModel"];
};
export type DayPlan = {
  rows: DayPlanRow[];
  maxTrades: number;
  totalTarget: number;      // all accounts, all copies
  totalStop: number;        // YOUR personal daily stop, added up over every account (not a firm limit)
  totalRisk: number;        // $ at risk on one trade across every account
  weeklyTarget: number;
  maxLosses: number;        // stop after this many losses (tightest account)
};

export function buildDayPlan(rows: ProjectionRow[], strat: Strategy, riskLevel: RiskLevel): DayPlan {
  const out = rows.map((r) => {
    const p = planAccount(r.rules, strat, riskLevel);
    const phase: StartPhase = r.start === "EVAL" && p.eval ? "EVAL" : "FUNDED";
    const plan = phase === "EVAL" ? p.eval! : p.funded;
    return { key: r.key, label: r.label, quantity: r.quantity, phase, plan, daysToPass: phase === "EVAL" ? p.eval!.daysToPass : null,
      firmMaxLoss: r.rules.maxLoss, firmDll: r.rules.dailyLossLimit, drawdownModel: r.rules.drawdownModel };
  });
  const sum = (f: (x: DayPlanRow) => number) => round(out.reduce((s, x) => s + f(x) * x.quantity, 0), 5);
  const totalTarget = sum((x) => x.plan.dailyTarget);
  return {
    rows: out,
    maxTrades: Math.ceil(strat.tradesPerDay),
    totalTarget,
    totalStop: sum((x) => x.plan.dailyStop),
    totalRisk: sum((x) => x.plan.riskPerTrade),
    weeklyTarget: round(totalTarget * strat.tradingDaysPerWeek, 5),
    maxLosses: out.length ? Math.min(...out.map((x) => x.plan.maxLosses)) : 0,
  };
}
