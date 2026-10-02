// Journey planner engine — pure functions, no DB/React imports, fully unit-tested.
//
// Three outputs:
//   1. buildPassPlan   → how to pass one evaluation (daily goal, risk per trade, contracts, daily stop)
//   2. simulatePass    → Monte Carlo pass probability for that plan under the account's real drawdown rules
//   3. buildIncomePlan → monthly take-home goal → weekly → daily, split across funded accounts

export type DrawdownModel = "EOD_TRAILING" | "INTRADAY_TRAILING" | "STATIC";
export type Instrument = "NQ" | "MNQ" | "ES" | "MES" | "YM" | "MYM" | "RTY" | "M2K" | "CL" | "MCL" | "GC" | "MGC";

export type RuleSet = {
  accountSize: number;
  profitTarget: number | null; // null = instant funded / already funded
  maxLoss: number;
  drawdownModel: DrawdownModel;
  dailyLossLimit: number | null;
  consistencyPct: number | null;
  minDays: number;
  maxMinis: number;
  maxMicros: number;
  profitSplit?: string | null;
};

export type Strategy = {
  winRate: number;        // 0..1
  avgRR: number;          // reward multiple on winners (2 = 2R)
  tradesPerDay: number;
  instrument: Instrument;
  avgStopPoints: number;
  tradingDaysPerWeek: number;
};

// $ per point, and the mini/micro pairing used for contract sizing
export const POINT_VALUE: Record<Instrument, number> = {
  NQ: 20, MNQ: 2, ES: 50, MES: 5, YM: 5, MYM: 0.5, RTY: 50, M2K: 5, CL: 1000, MCL: 100, GC: 100, MGC: 10,
};
const MINI_OF: Record<Instrument, Instrument> = {
  NQ: "NQ", MNQ: "NQ", ES: "ES", MES: "ES", YM: "YM", MYM: "YM", RTY: "RTY", M2K: "RTY", CL: "CL", MCL: "CL", GC: "GC", MGC: "GC",
};
const MICRO_OF: Record<Instrument, Instrument> = {
  NQ: "MNQ", MNQ: "MNQ", ES: "MES", MES: "MES", YM: "MYM", MYM: "MYM", RTY: "M2K", M2K: "M2K", CL: "MCL", MCL: "MCL", GC: "MGC", MGC: "MGC",
};

const round = (n: number, step = 1) => Math.round(n / step) * step;
const floorTo = (n: number, step = 1) => Math.floor(n / step) * step;

/** Expected value per trade in R. 50% win rate at 2R → 0.5. */
export function expectancyR(winRate: number, avgRR: number) {
  return winRate * avgRR - (1 - winRate);
}

/** Longest losing streak you should expect over N trades: ln(N) / ln(1/(1-p)). */
export function expectedLosingStreak(winRate: number, trades: number) {
  const q = 1 - winRate;
  if (q <= 0) return 0;
  if (q >= 1) return trades;
  return Math.max(1, Math.ceil(Math.log(Math.max(trades, 2)) / Math.log(1 / q)));
}

/** "90/10" → 0.9, "100% of first $10K, then 90/10" → 0.9, blank → 0.9 default. */
export function parseSplit(split?: string | null, fallback = 0.9) {
  if (!split) return fallback;
  const all = [...split.matchAll(/(\d{2,3})\s*\/\s*(\d{1,2})/g)];
  const last = all.at(-1);
  return last ? Number(last[1]) / 100 : fallback;
}

/** Fewest days a consistency rule allows: best day ≤ 40% → at least 3 days. */
export function minDaysForConsistency(pct: number | null) {
  return pct ? Math.ceil(100 / pct - 1e-9) : 1;
}

export type RiskLimits = {
  dailyStop: number;          // stop trading for the day after losing this much
  riskCap: number;            // max $ risk per trade that survives an expected losing streak
  expectedStreak: number;
};

/** Risk limits that apply to any account (eval or funded) from its drawdown + DLL. */
export function riskLimits(rules: RuleSet, strat: Strategy, horizonTrades: number, dllOverride?: number | null): RiskLimits {
  const dll = dllOverride ?? rules.dailyLossLimit;
  const dailyStop = floorTo(Math.min(dll ? dll * 0.8 : Infinity, rules.maxLoss * 0.35), 25);
  const streak = expectedLosingStreak(strat.winRate, Math.max(20, horizonTrades));
  const capByDrawdown = rules.maxLoss / (streak + 2);
  const lossesPerDay = Math.max(1, Math.min(Math.ceil(strat.tradesPerDay), streak));
  const capByDaily = dailyStop / lossesPerDay;
  return { dailyStop, riskCap: floorTo(Math.min(capByDrawdown, capByDaily), 5), expectedStreak: streak };
}

export function contractsFor(risk: number, strat: Strategy, rules: RuleSet) {
  const perMini = strat.avgStopPoints * POINT_VALUE[MINI_OF[strat.instrument]];
  const perMicro = strat.avgStopPoints * POINT_VALUE[MICRO_OF[strat.instrument]];
  return {
    mini: MINI_OF[strat.instrument],
    micro: MICRO_OF[strat.instrument],
    minis: perMini > 0 ? Math.min(rules.maxMinis, Math.floor(risk / perMini)) : 0,
    micros: perMicro > 0 ? Math.min(rules.maxMicros, Math.floor(risk / perMicro)) : 0,
    riskPerMini: perMini,
    riskPerMicro: perMicro,
  };
}

export type PassPlan = {
  days: number;                 // trading days in the plan
  minDaysAllowed: number;       // firm minimum incl. consistency
  realisticDays: number | null; // days needed at the safe risk cap
  dailyGoal: number;
  weeklyGoal: number;
  bestDayCap: number | null;    // consistency: never make more than this in one day
  dailyStop: number;
  riskPerTrade: number;
  riskCap: number;
  riskNeeded: number;           // risk the chosen pace would require
  expectancyR: number;
  expectedLosingStreak: number;
  lossesToFail: number;         // full-size losing trades in a row before the account fails
  contracts: ReturnType<typeof contractsFor>;
  warnings: string[];
};

export function buildPassPlan(
  rules: RuleSet,
  strat: Strategy,
  opts: { targetDays?: number | null; riskOverride?: number | null; dllOverride?: number | null } = {},
): PassPlan | null {
  if (rules.profitTarget == null) return null; // instant-funded: no evaluation to pass
  const warnings: string[] = [];
  const target = rules.profitTarget;
  const E = expectancyR(strat.winRate, strat.avgRR);
  const minDaysAllowed = Math.max(1, rules.minDays, minDaysForConsistency(rules.consistencyPct));

  // Size risk limits over a ~2-week horizon so the losing-streak estimate is conservative.
  const limits = riskLimits(rules, strat, strat.tradesPerDay * 10, opts.dllOverride);
  const dailyAtCap = E > 0 ? strat.tradesPerDay * E * limits.riskCap : 0;
  const realisticDays = dailyAtCap > 0 ? Math.max(minDaysAllowed, Math.ceil(target / dailyAtCap)) : null;

  let days = opts.targetDays ?? realisticDays ?? minDaysAllowed;
  if (days < minDaysAllowed) {
    warnings.push(`This account can't be passed in under ${minDaysAllowed} trading day${minDaysAllowed > 1 ? "s" : ""} — plan set to ${minDaysAllowed}.`);
    days = minDaysAllowed;
  }

  const dailyGoal = target / days;
  const riskNeeded = E > 0 ? dailyGoal / (strat.tradesPerDay * E) : Infinity;
  const riskPerTrade = floorTo(opts.riskOverride ?? Math.min(riskNeeded, limits.riskCap), 5);

  if (E <= 0) warnings.push("Your win rate and R:R give a negative edge — the planner can't produce a passing pace. Review the strategy metrics.");
  else if (riskNeeded > limits.riskCap) {
    warnings.push(
      `Passing in ${days} days needs ~$${round(riskNeeded)} risk per trade, above the safe cap of $${limits.riskCap}. ` +
        `At the safe cap, expect about ${realisticDays} trading days.`,
    );
  }
  if (opts.riskOverride && opts.riskOverride > limits.riskCap)
    warnings.push(`Your chosen risk ($${opts.riskOverride}) is above the safe cap ($${limits.riskCap}) for this drawdown.`);

  const bestDayCap = rules.consistencyPct ? floorTo((target * rules.consistencyPct) / 100, 25) : null;
  if (bestDayCap && dailyGoal > bestDayCap) warnings.push(`Daily goal is above the consistency cap of $${bestDayCap}.`);

  const contracts = contractsFor(riskPerTrade, strat, rules);
  if (contracts.minis === 0 && contracts.micros === 0)
    warnings.push(`A ${strat.avgStopPoints}-point stop on 1 ${contracts.micro} risks $${contracts.riskPerMicro} — more than the planned risk. Tighten the stop or accept a slower pace.`);

  return {
    days,
    minDaysAllowed,
    realisticDays,
    dailyGoal: round(dailyGoal, 5),
    weeklyGoal: round(dailyGoal * Math.min(days, strat.tradingDaysPerWeek), 5),
    bestDayCap,
    dailyStop: limits.dailyStop,
    riskPerTrade,
    riskCap: limits.riskCap,
    riskNeeded: Number.isFinite(riskNeeded) ? round(riskNeeded) : Infinity,
    expectancyR: Math.round(E * 100) / 100,
    expectedLosingStreak: limits.expectedStreak,
    lossesToFail: riskPerTrade > 0 ? Math.floor(rules.maxLoss / riskPerTrade) : 0,
    contracts,
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────
// Monte Carlo pass simulator
// ─────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SimResult = { passRate: number; failRate: number; medianDaysToPass: number | null; runs: number };

export function simulatePass(
  rules: RuleSet,
  strat: Strategy,
  plan: PassPlan,
  { runs = 2000, maxDays = 60, seed = 42 }: { runs?: number; maxDays?: number; seed?: number } = {},
): SimResult {
  const rand = mulberry32(seed);
  const target = rules.profitTarget ?? 0;
  const size = rules.accountSize;
  const dll = rules.dailyLossLimit;
  const winAmt = plan.riskPerTrade * strat.avgRR;
  const lossAmt = plan.riskPerTrade;
  let passes = 0, fails = 0;
  const passDays: number[] = [];

  for (let r = 0; r < runs; r++) {
    let bal = size, floor = size - rules.maxLoss, peak = size, bestDay = 0, daysTraded = 0;
    let outcome: "pass" | "fail" | null = null;

    for (let d = 0; d < maxDays && !outcome; d++) {
      const dayStart = bal;
      const trades = Math.floor(strat.tradesPerDay) + (rand() < strat.tradesPerDay % 1 ? 1 : 0);
      daysTraded++;
      for (let t = 0; t < trades; t++) {
        const dayPnl = bal - dayStart;
        if (dayPnl <= -plan.dailyStop || (dll && dayPnl <= -dll)) break;       // daily stop / DLL
        if (dayPnl >= plan.dailyGoal * 1.5) break;                             // walk away on a great day
        if (plan.bestDayCap && dayPnl >= plan.bestDayCap * 0.9) break;         // protect consistency
        bal += rand() < strat.winRate ? winAmt : -lossAmt;
        if (rules.drawdownModel === "INTRADAY_TRAILING") {
          peak = Math.max(peak, bal);
          floor = Math.min(size, Math.max(floor, peak - rules.maxLoss));
        }
        if (bal <= floor) { outcome = "fail"; break; }
      }
      if (outcome) break;
      const dayPnl = bal - dayStart;
      bestDay = Math.max(bestDay, dayPnl);
      if (rules.drawdownModel === "EOD_TRAILING") floor = Math.min(size, Math.max(floor, bal - rules.maxLoss));
      const profit = bal - size;
      const consistent = !rules.consistencyPct || bestDay <= (profit * rules.consistencyPct) / 100;
      if (profit >= target && daysTraded >= plan.minDaysAllowed && consistent) outcome = "pass";
    }
    if (outcome === "pass") { passes++; passDays.push(daysTraded); }
    else if (outcome === "fail") fails++;
  }
  passDays.sort((a, b) => a - b);
  return {
    passRate: passes / runs,
    failRate: fails / runs,
    medianDaysToPass: passDays.length ? passDays[Math.floor(passDays.length / 2)] : null,
    runs,
  };
}

// ─────────────────────────────────────────────────────────────
// Income plan — monthly take-home → weekly → daily, per funded account
// ─────────────────────────────────────────────────────────────

export type IncomeAccountInput = {
  id: string;
  label: string;
  rules: RuleSet;
  quantity: number;             // copy-traded identical accounts
  funded: boolean;              // FUNDED or LIVE stage
};

export type IncomePlan = {
  monthlyGoal: number;
  weeklyGoal: number;
  dailyGoal: number;
  grossMonthlyNeeded: number;   // before profit split
  tradingDaysPerMonth: number;
  fundedAccountCount: number;
  perAccount: {
    id: string;
    label: string;
    quantity: number;
    split: number;
    monthlyGross: number;       // per single account
    weeklyGross: number;
    dailyGross: number;
    dailyCapacity: number;      // what the strategy can make/day at safe risk on this account
    feasible: boolean;
  }[];
  accountsNeeded: number | null; // funded accounts needed to hit the goal at safe risk
  warnings: string[];
};

export function buildIncomePlan(monthlyGoal: number, accounts: IncomeAccountInput[], strat: Strategy): IncomePlan {
  const warnings: string[] = [];
  const tdpm = (strat.tradingDaysPerWeek * 52) / 12;
  const E = expectancyR(strat.winRate, strat.avgRR);
  const funded = accounts.filter((a) => a.funded);
  const pool = funded.length ? funded : accounts; // with no funded accounts yet, size off what they're evaluating
  const fundedCount = funded.reduce((s, a) => s + a.quantity, 0);

  const capacity = (a: IncomeAccountInput) => {
    const { riskCap } = riskLimits({ ...a.rules, profitTarget: null }, strat, strat.tradesPerDay * 20);
    return E > 0 ? strat.tradesPerDay * E * riskCap : 0;
  };

  const totalUnits = pool.reduce((s, a) => s + a.quantity, 0);
  const avgSplit = totalUnits ? pool.reduce((s, a) => s + parseSplit(a.rules.profitSplit) * a.quantity, 0) / totalUnits : 0.9;
  const grossMonthly = monthlyGoal / avgSplit;

  const perAccount = pool.map((a) => {
    const split = parseSplit(a.rules.profitSplit);
    // Each account's share of the take-home goal, grossed up by its own split
    const takeHomeShare = totalUnits ? monthlyGoal / totalUnits : monthlyGoal;
    const monthlyGross = takeHomeShare / split;
    const dailyGross = monthlyGross / tdpm;
    const dailyCapacity = capacity(a);
    return {
      id: a.id, label: a.label, quantity: a.quantity, split,
      monthlyGross: round(monthlyGross, 5),
      weeklyGross: round((monthlyGross * 12) / 52, 5),
      dailyGross: round(dailyGross, 5),
      dailyCapacity: round(dailyCapacity, 5),
      feasible: dailyCapacity >= dailyGross,
    };
  });

  const avgCapacity = perAccount.length ? perAccount.reduce((s, a) => s + a.dailyCapacity * a.quantity, 0) / totalUnits : 0;
  const accountsNeeded = avgCapacity > 0 ? Math.ceil(grossMonthly / tdpm / avgCapacity) : null;

  if (!funded.length) warnings.push("No funded accounts yet — targets below show what each account will need once it's funded.");
  if (perAccount.some((a) => !a.feasible))
    warnings.push(`At safe risk, your strategy needs about ${accountsNeeded} funded accounts to reach this goal (you have ${fundedCount}).`);
  if (E <= 0) warnings.push("Strategy metrics show no positive edge — income targets can't be reached reliably.");

  return {
    monthlyGoal,
    weeklyGoal: round((monthlyGoal * 12) / 52, 5),
    dailyGoal: round(monthlyGoal / tdpm, 5),
    grossMonthlyNeeded: round(grossMonthly, 5),
    tradingDaysPerMonth: Math.round(tdpm * 10) / 10,
    fundedAccountCount: fundedCount,
    perAccount,
    accountsNeeded,
    warnings,
  };
}
