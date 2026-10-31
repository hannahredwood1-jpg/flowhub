// FLOWHUB server — built by deploy/build.mjs from deploy/server.ts. Do not edit here.
// deploy/server.ts
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { ZodError } from "zod";
import { SQL } from "bun";
import { gunzipSync } from "node:zlib";
import { createCipheriv, createDecipheriv, createHash as createHash2, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

// src/lib/weeklyWinRate.ts
var DAY = 864e5;
var parse = (ymd) => Date.parse(ymd + "T12:00:00Z");
var fmt = (ms) => new Date(ms).toISOString().slice(0, 10);
var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var short = (ymd) => `${MON[+ymd.slice(5, 7) - 1]} ${+ymd.slice(8, 10)}`;
function shareText(w, name = "FLOWMTD") {
  const pct = w.rate == null ? "\u2014" : `${Math.round(w.rate * 100)}%`;
  return `\u{1F4CA} ${name} \xB7 Weekly win rate (${w.label})
${pct} \xB7 ${w.wins}W / ${w.losses}L${w.breakeven ? ` (${w.breakeven} BE)` : ""}${w.pts ? ` \xB7 ${w.pts > 0 ? "+" : "\u2212"}${Math.abs(Math.round(w.pts)).toLocaleString("en-US")} pts` : ""}`;
}
function fromSignalsWeeks(weeks, days) {
  const history = [...weeks].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map((w) => ({
    weekStart: w.weekStart,
    weekEnd: fmt(parse(w.weekStart) + 6 * DAY),
    label: `${short(w.weekStart)} \u2013 ${short(fmt(parse(w.weekStart) + 6 * DAY))}`,
    wins: w.wins,
    losses: w.losses,
    breakeven: w.be,
    trades: w.signals,
    pending: w.pending,
    pts: w.pts ?? 0,
    rate: w.wins + w.losses ? w.wins / (w.wins + w.losses) : null
  }));
  if (days?.length) history[0].days = days;
  return { current: history[0], previous: history[1] ?? history[0], history };
}

// src/lib/planner.ts
var POINT_VALUE = {
  NQ: 20,
  MNQ: 2,
  ES: 50,
  MES: 5,
  YM: 5,
  MYM: 0.5,
  RTY: 50,
  M2K: 5,
  CL: 1e3,
  MCL: 100,
  GC: 100,
  MGC: 10
};
var MINI_OF = {
  NQ: "NQ",
  MNQ: "NQ",
  ES: "ES",
  MES: "ES",
  YM: "YM",
  MYM: "YM",
  RTY: "RTY",
  M2K: "RTY",
  CL: "CL",
  MCL: "CL",
  GC: "GC",
  MGC: "GC"
};
var MICRO_OF = {
  NQ: "MNQ",
  MNQ: "MNQ",
  ES: "MES",
  MES: "MES",
  YM: "MYM",
  MYM: "MYM",
  RTY: "M2K",
  M2K: "M2K",
  CL: "MCL",
  MCL: "MCL",
  GC: "MGC",
  MGC: "MGC"
};
var round = (n2, step = 1) => Math.round(n2 / step) * step;
var floorTo = (n2, step = 1) => Math.floor(n2 / step) * step;
function expectancyR(winRate, avgRR) {
  return winRate * avgRR - (1 - winRate);
}
function expectedLosingStreak(winRate, trades) {
  const q = 1 - winRate;
  if (q <= 0) return 0;
  if (q >= 1) return trades;
  return Math.max(1, Math.ceil(Math.log(Math.max(trades, 2)) / Math.log(1 / q)));
}
function parseSplit(split, fallback = 0.9) {
  if (!split) return fallback;
  const all = [...split.matchAll(/(\d{2,3})\s*\/\s*(\d{1,2})/g)];
  const last = all.at(-1);
  return last ? Number(last[1]) / 100 : fallback;
}
function minDaysForConsistency(pct) {
  return pct ? Math.ceil(100 / pct - 1e-9) : 1;
}
function riskLimits(rules, strat, horizonTrades, dllOverride) {
  const dll = dllOverride ?? rules.dailyLossLimit;
  const dailyStop = floorTo(Math.min(dll ? dll * 0.8 : Infinity, rules.maxLoss * 0.35), 25);
  const streak = expectedLosingStreak(strat.winRate, Math.max(20, horizonTrades));
  const capByDrawdown = rules.maxLoss / (streak + 2);
  const lossesPerDay = Math.max(1, Math.min(Math.ceil(strat.tradesPerDay), streak));
  const capByDaily = dailyStop / lossesPerDay;
  return { dailyStop, riskCap: floorTo(Math.min(capByDrawdown, capByDaily), 5), expectedStreak: streak };
}
function contractsFor(risk, strat, rules) {
  const perMini = strat.avgStopPoints * POINT_VALUE[MINI_OF[strat.instrument]];
  const perMicro = strat.avgStopPoints * POINT_VALUE[MICRO_OF[strat.instrument]];
  return {
    mini: MINI_OF[strat.instrument],
    micro: MICRO_OF[strat.instrument],
    minis: perMini > 0 ? Math.min(rules.maxMinis, Math.floor(risk / perMini)) : 0,
    micros: perMicro > 0 ? Math.min(rules.maxMicros, Math.floor(risk / perMicro)) : 0,
    riskPerMini: perMini,
    riskPerMicro: perMicro
  };
}
function buildPassPlan(rules, strat, opts = {}) {
  if (rules.profitTarget == null) return null;
  const warnings = [];
  const target = rules.profitTarget;
  const E = expectancyR(strat.winRate, strat.avgRR);
  const minDaysAllowed = Math.max(1, rules.minDays, minDaysForConsistency(rules.consistencyPct));
  const limits = riskLimits(rules, strat, strat.tradesPerDay * 10, opts.dllOverride);
  const dailyAtCap = E > 0 ? strat.tradesPerDay * E * limits.riskCap : 0;
  const realisticDays = dailyAtCap > 0 ? Math.max(minDaysAllowed, Math.ceil(target / dailyAtCap)) : null;
  let days = opts.targetDays ?? realisticDays ?? minDaysAllowed;
  if (days < minDaysAllowed) {
    warnings.push(`This account can't be passed in under ${minDaysAllowed} trading day${minDaysAllowed > 1 ? "s" : ""} \u2014 plan set to ${minDaysAllowed}.`);
    days = minDaysAllowed;
  }
  const dailyGoal = target / days;
  const riskNeeded = E > 0 ? dailyGoal / (strat.tradesPerDay * E) : Infinity;
  const riskPerTrade = floorTo(opts.riskOverride ?? Math.min(riskNeeded, limits.riskCap), 5);
  if (E <= 0) warnings.push("Your win rate and R:R give a negative edge \u2014 the planner can't produce a passing pace. Review the strategy metrics.");
  else if (riskNeeded > limits.riskCap) {
    warnings.push(
      `Passing in ${days} days needs ~$${round(riskNeeded)} risk per trade, above the safe cap of $${limits.riskCap}. At the safe cap, expect about ${realisticDays} trading days.`
    );
  }
  if (opts.riskOverride && opts.riskOverride > limits.riskCap)
    warnings.push(`Your chosen risk ($${opts.riskOverride}) is above the safe cap ($${limits.riskCap}) for this drawdown.`);
  const bestDayCap = rules.consistencyPct ? floorTo(target * rules.consistencyPct / 100, 25) : null;
  if (bestDayCap && dailyGoal > bestDayCap) warnings.push(`Daily goal is above the consistency cap of $${bestDayCap}.`);
  const contracts = contractsFor(riskPerTrade, strat, rules);
  if (contracts.minis === 0 && contracts.micros === 0)
    warnings.push(`A ${strat.avgStopPoints}-point stop on 1 ${contracts.micro} risks $${contracts.riskPerMicro} \u2014 more than the planned risk. Tighten the stop or accept a slower pace.`);
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
    warnings
  };
}
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 1831565813 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function simulatePass(rules, strat, plan, { runs = 2e3, maxDays = 60, seed = 42 } = {}) {
  const rand = mulberry32(seed);
  const target = rules.profitTarget ?? 0;
  const size = rules.accountSize;
  const dll = rules.dailyLossLimit;
  const winAmt = plan.riskPerTrade * strat.avgRR;
  const lossAmt = plan.riskPerTrade;
  let passes = 0, fails = 0;
  const passDays = [];
  for (let r = 0; r < runs; r++) {
    let bal = size, floor = size - rules.maxLoss, peak = size, bestDay = 0, daysTraded = 0;
    let outcome = null;
    for (let d = 0; d < maxDays && !outcome; d++) {
      const dayStart = bal;
      const trades = Math.floor(strat.tradesPerDay) + (rand() < strat.tradesPerDay % 1 ? 1 : 0);
      daysTraded++;
      for (let t = 0; t < trades; t++) {
        const dayPnl2 = bal - dayStart;
        if (dayPnl2 <= -plan.dailyStop || dll && dayPnl2 <= -dll) break;
        if (dayPnl2 >= plan.dailyGoal * 1.5) break;
        if (plan.bestDayCap && dayPnl2 >= plan.bestDayCap * 0.9) break;
        bal += rand() < strat.winRate ? winAmt : -lossAmt;
        if (rules.drawdownModel === "INTRADAY_TRAILING") {
          peak = Math.max(peak, bal);
          floor = Math.min(size, Math.max(floor, peak - rules.maxLoss));
        }
        if (bal <= floor) {
          outcome = "fail";
          break;
        }
      }
      if (outcome) break;
      const dayPnl = bal - dayStart;
      bestDay = Math.max(bestDay, dayPnl);
      if (rules.drawdownModel === "EOD_TRAILING") floor = Math.min(size, Math.max(floor, bal - rules.maxLoss));
      const profit = bal - size;
      const consistent = !rules.consistencyPct || bestDay <= profit * rules.consistencyPct / 100;
      if (profit >= target && daysTraded >= plan.minDaysAllowed && consistent) outcome = "pass";
    }
    if (outcome === "pass") {
      passes++;
      passDays.push(daysTraded);
    } else if (outcome === "fail") fails++;
  }
  passDays.sort((a, b) => a - b);
  return {
    passRate: passes / runs,
    failRate: fails / runs,
    medianDaysToPass: passDays.length ? passDays[Math.floor(passDays.length / 2)] : null,
    runs
  };
}
function buildIncomePlan(monthlyGoal, accounts, strat) {
  const warnings = [];
  const tdpm = strat.tradingDaysPerWeek * 52 / 12;
  const E = expectancyR(strat.winRate, strat.avgRR);
  const funded = accounts.filter((a) => a.funded);
  const pool = funded.length ? funded : accounts;
  const fundedCount = funded.reduce((s, a) => s + a.quantity, 0);
  const capacity = (a) => {
    const { riskCap } = riskLimits({ ...a.rules, profitTarget: null }, strat, strat.tradesPerDay * 20);
    return E > 0 ? strat.tradesPerDay * E * riskCap : 0;
  };
  const totalUnits = pool.reduce((s, a) => s + a.quantity, 0);
  const avgSplit = totalUnits ? pool.reduce((s, a) => s + parseSplit(a.rules.profitSplit) * a.quantity, 0) / totalUnits : 0.9;
  const grossMonthly = monthlyGoal / avgSplit;
  const perAccount = pool.map((a) => {
    const split = parseSplit(a.rules.profitSplit);
    const takeHomeShare = totalUnits ? monthlyGoal / totalUnits : monthlyGoal;
    const monthlyGross = takeHomeShare / split;
    const dailyGross = monthlyGross / tdpm;
    const dailyCapacity = capacity(a);
    return {
      id: a.id,
      label: a.label,
      quantity: a.quantity,
      split,
      monthlyGross: round(monthlyGross, 5),
      weeklyGross: round(monthlyGross * 12 / 52, 5),
      dailyGross: round(dailyGross, 5),
      dailyCapacity: round(dailyCapacity, 5),
      feasible: dailyCapacity >= dailyGross
    };
  });
  const avgCapacity = perAccount.length ? perAccount.reduce((s, a) => s + a.dailyCapacity * a.quantity, 0) / totalUnits : 0;
  const accountsNeeded = avgCapacity > 0 ? Math.ceil(grossMonthly / tdpm / avgCapacity) : null;
  if (!funded.length) warnings.push("No funded accounts yet \u2014 targets below show what each account will need once it's funded.");
  if (perAccount.some((a) => !a.feasible))
    warnings.push(`At safe risk, your strategy needs about ${accountsNeeded} funded accounts to reach this goal (you have ${fundedCount}).`);
  if (E <= 0) warnings.push("Strategy metrics show no positive edge \u2014 income targets can't be reached reliably.");
  return {
    monthlyGoal,
    weeklyGoal: round(monthlyGoal * 12 / 52, 5),
    dailyGoal: round(monthlyGoal / tdpm, 5),
    grossMonthlyNeeded: round(grossMonthly, 5),
    tradingDaysPerMonth: Math.round(tdpm * 10) / 10,
    fundedAccountCount: fundedCount,
    perAccount,
    accountsNeeded,
    warnings
  };
}

// src/lib/pace.ts
function weekdaysBetween(startISO, endISO) {
  const start = /* @__PURE__ */ new Date(startISO + "T00:00:00Z");
  const end = /* @__PURE__ */ new Date(endISO + "T00:00:00Z");
  let n2 = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) n2++;
  }
  return n2;
}
function dailyTotals(trades) {
  const byDay = /* @__PURE__ */ new Map();
  for (const t of trades) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl);
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, pnl]) => ({ date, pnl }));
}
function computePace(args) {
  const { rules, startDate, today, dailyGoal, mode } = args;
  const days = dailyTotals(args.trades.filter((t) => t.date >= startDate));
  const size = rules.accountSize;
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
  let goal;
  let expected;
  if (mode === "EVAL") {
    goal = rules.profitTarget ?? 0;
    expected = Math.min(goal, dailyGoal * elapsed);
  } else {
    goal = args.monthlyGoal ?? dailyGoal * 21;
    const monthStart = today.slice(0, 8) + "01";
    expected = dailyGoal * weekdaysBetween(monthStart > startDate ? monthStart : startDate, today);
  }
  const progressBase = mode === "EVAL" ? profit : days.filter((d) => d.date >= today.slice(0, 8) + "01").reduce((s, d) => s + d.pnl, 0);
  const flags = [];
  let status;
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
    flags
  };
}
function memberRiskSummary(paces) {
  const active = paces.filter((p) => p.status !== "FAILED");
  return {
    drawdownRisk: active.length ? 1 - Math.min(...active.map((p) => p.drawdownRoomPct)) : 0,
    // 0 safe → 1 about to fail
    lastTradeDate: paces.map((p) => p.lastTradeDate).filter(Boolean).sort().at(-1) ?? null,
    consistencyFailures: paces.filter((p) => !p.consistencyOk).length,
    atRisk: paces.filter((p) => p.status === "AT_RISK").length,
    behind: paces.filter((p) => p.status === "BEHIND").length
  };
}

// src/lib/strategies.ts
var STRATEGIES = {
  DAILY_LEVELS: { key: "DAILY_LEVELS", indicator: "ECHO X ORBIT", name: "ECHO X ORBIT", winRate: 0.94, sessions: [] },
  // Planner win rates (used for the maths only, never shown).
  INVERTIX: { key: "INVERTIX", indicator: "INVERTIX", name: "INVERTIX", winRate: 0.65, sessions: ["ASIA", "NY"] },
  ESC_VLCTY: { key: "ESC_VLCTY", indicator: "ESC VLCTY", name: "ESC VLCTY", winRate: 0.47, sessions: ["NY", "ASIA"] },
  // retired
  ASIAFLOW_PO3: { key: "ASIAFLOW_PO3", indicator: "ASIAFLOW", name: "PO3", winRate: 0.7, sessions: ["ASIA"] },
  ASIAFLOW_A3IA: { key: "ASIAFLOW_A3IA", indicator: "ASIAFLOW", name: "A3IA", winRate: 0.81, sessions: ["ASIA"] },
  NYFLOW_PO3: { key: "NYFLOW_PO3", indicator: "NYFLOW", name: "PO3", winRate: 0.745, sessions: ["NY"] },
  NYFLOW_HL: { key: "NYFLOW_HL", indicator: "NYFLOW", name: "H/L", winRate: 0.84, sessions: ["NY"] }
};
var STRATEGY_KEYS = Object.keys(STRATEGIES);
var RETIRED_STRATEGIES = ["ESC_VLCTY", "ASIAFLOW_PO3", "ASIAFLOW_A3IA", "NYFLOW_PO3", "NYFLOW_HL"];
var SELECTABLE_STRATEGY_KEYS = STRATEGY_KEYS.filter((k) => !RETIRED_STRATEGIES.includes(k));
var strategyLabel = (k) => RETIRED_STRATEGIES.includes(k) ? `${STRATEGIES[k].indicator} \xB7 ${STRATEGIES[k].name}` : STRATEGIES[k].name;
function normalizeSelection(sel) {
  if (sel.mode === "DAILY_LEVELS") return { mode: "DAILY_LEVELS", multiSession: false, strategies: ["DAILY_LEVELS"] };
  const picks = [...new Set(sel.strategies)].filter((k) => k !== "DAILY_LEVELS" && STRATEGIES[k] && !RETIRED_STRATEGIES.includes(k));
  return { mode: "INDICATORS", multiSession: sel.multiSession, strategies: picks };
}
function blendedWinRate(sel) {
  const s = normalizeSelection(sel).strategies;
  if (!s.length) return STRATEGIES.DAILY_LEVELS.winRate;
  return s.reduce((sum, k) => sum + STRATEGIES[k].winRate, 0) / s.length;
}
var JOURNAL_SETUPS = SELECTABLE_STRATEGY_KEYS.map(strategyLabel);

// src/lib/viewmodel.ts
var DEFAULT_STRATEGY = { winRate: 0.5, avgRR: 40 / 15, tradesPerDay: 3, instrument: "MNQ", avgStopPoints: 15, tradingDaysPerWeek: 5 };
var strategyOf = (r) => r ? { winRate: r.winRate, avgRR: r.avgRR, tradesPerDay: r.tradesPerDay, instrument: r.primaryInstrument, avgStopPoints: r.avgStopPoints, tradingDaysPerWeek: r.tradingDaysPerWeek } : DEFAULT_STRATEGY;
var accountLabel = (a) => a.nickname || `${shortFirm(a.rules.firm)} ${a.rules.planName.replace(/\s*\(.*\)/, "")} ${a.rules.accountSize / 1e3}K`;
function shortFirm(firm) {
  const map = {
    "My Funded Futures": "MFFU",
    "Lucid Trading": "Lucid",
    "Apex Trader Funding": "Apex",
    "Take Profit Trader": "TPT",
    "Alpha Futures": "Alpha",
    "FundedNext Futures": "FundedNext"
  };
  return map[firm] ?? firm;
}
var ACTIVE = ["EVALUATION", "PASSED", "FUNDED", "LIVE"];
var isFunded = (s) => s === "FUNDED" || s === "LIVE";
function weekStart(today) {
  const d = /* @__PURE__ */ new Date(today + "T00:00:00Z");
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd);
  return d.toISOString().slice(0, 10);
}
function daysAgo(today, n2) {
  const d = /* @__PURE__ */ new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n2);
  return d.toISOString().slice(0, 10);
}
function buildDashboard(raw) {
  const strat = strategyOf(raw.roadmap);
  const active = raw.accounts.filter((a) => ACTIVE.includes(a.stage));
  const income = raw.roadmap && active.length ? buildIncomePlan(
    raw.roadmap.monthlyIncomeGoal,
    active.map((a) => ({ id: a.id, label: accountLabel(a), rules: a.rules, quantity: a.quantity, funded: isFunded(a.stage) })),
    strat
  ) : null;
  const accounts = raw.accounts.map((a) => {
    const evalMode = !isFunded(a.stage) && a.rules.profitTarget != null;
    const passPlan = evalMode ? buildPassPlan(a.rules, strat, { targetDays: a.targetPassDays, riskOverride: a.riskPerTradeOverride, dllOverride: a.dailyLossLimitOverride }) : null;
    const sim = passPlan && a.stage === "EVALUATION" ? simulatePass(a.rules, strat, passPlan, { runs: 1500 }) : null;
    const incomeTargets = income?.perAccount.find((p) => p.id === a.id) ?? null;
    const trades = raw.journal.filter((j) => j.memberAccountId === a.id).map((j) => ({ date: j.tradeDate, pnl: j.pnl }));
    const pace = computePace({
      rules: a.rules,
      trades,
      startDate: a.startDate,
      today: raw.today,
      mode: evalMode ? "EVAL" : "FUNDED",
      dailyGoal: evalMode ? passPlan?.dailyGoal ?? 0 : incomeTargets?.dailyGross ?? 0,
      monthlyGoal: incomeTargets?.monthlyGross
    });
    return {
      id: a.id,
      templateId: a.templateId,
      label: accountLabel(a),
      nickname: a.nickname,
      stage: a.stage,
      startDate: a.startDate,
      quantity: a.quantity,
      rules: a.rules,
      targetPassDays: a.targetPassDays,
      riskPerTradeOverride: a.riskPerTradeOverride,
      dailyLossLimitOverride: a.dailyLossLimitOverride,
      passPlan,
      sim,
      pace,
      incomeTargets
    };
  });
  const labels = new Map(accounts.map((a) => [a.id, a.label]));
  const journal = [...raw.journal].sort((x, y) => y.tradeDate.localeCompare(x.tradeDate)).map((j) => ({ ...j, accountLabel: j.memberAccountId ? labels.get(j.memberAccountId) ?? null : null }));
  const sum = (from) => journal.filter((j) => j.tradeDate >= from).reduce((s, j) => s + j.pnl, 0);
  const last30 = journal.filter((j) => j.tradeDate >= daysAgo(raw.today, 30));
  const decided = last30.filter((j) => j.outcome !== "BREAKEVEN");
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
    practice: raw.practice ?? null,
    school: raw.school ?? null,
    tradingPlan: raw.tradingPlan ?? null,
    stats: {
      todayPnl: sum(raw.today),
      weekPnl: sum(weekStart(raw.today)),
      monthPnl: sum(raw.today.slice(0, 8) + "01"),
      trades30: last30.length,
      winRate30: decided.length ? decided.filter((j) => j.outcome === "WIN").length / decided.length : null,
      planFollowed30: last30.length ? last30.filter((j) => j.followedPlan).length / last30.length : null
    }
  };
}
var schoolProgress = (s) => ({
  current: s.passed === s.total ? "Course complete" : s.current,
  pct: s.total ? s.passed / s.total : 0,
  certified: s.passed === s.total
});
function buildDirectoryRow(d) {
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
    school: d.school ? schoolProgress(d.school) : null
  };
}
function sortDirectory(rows, sort) {
  const r = [...rows];
  if (sort === "drawdown") r.sort((a, b) => b.drawdownRisk - a.drawdownRisk);
  if (sort === "recent") r.sort((a, b) => (b.lastTradeDate ?? "").localeCompare(a.lastTradeDate ?? ""));
  if (sort === "consistency") r.sort((a, b) => b.consistencyFailures - a.consistencyFailures || b.drawdownRisk - a.drawdownRisk);
  return r;
}

// src/lib/validators.ts
import { z } from "zod";

// src/lib/types.ts
var Instruments = ["NQ", "MNQ", "ES", "MES", "YM", "MYM", "RTY", "M2K", "CL", "MCL", "GC", "MGC"];
var Emotions = ["CALM", "CONFIDENT", "FOCUSED", "HESITANT", "FEARFUL", "FOMO", "FRUSTRATED", "REVENGE", "BORED", "EUPHORIC"];
var Stages = ["EVALUATION", "PASSED", "FUNDED", "LIVE", "FAILED", "ARCHIVED"];
function todayET(d = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

// src/lib/tradingPlan.ts
var PLAN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
var PLAN_MODELS = { ECHO_X_ORBIT: "ECHO X ORBIT (Discord calls)", INVERTIX: "INVERTIX" };
function cleanPlanModels(models) {
  const ok = (models ?? []).filter((m) => m in PLAN_MODELS);
  return ok.length ? ok : ["ECHO_X_ORBIT"];
}

// src/lib/validators.ts
var isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
var money = z.coerce.number().finite();
var httpsUrl = z.string().url().max(500).refine((u) => u.startsWith("https://"), "Screenshot link must start with https://");
var roadmapInput = z.object({
  monthlyIncomeGoal: money.min(0).max(1e6),
  tradingDaysPerWeek: z.coerce.number().int().min(1).max(7),
  strategyMode: z.enum(["DAILY_LEVELS", "INDICATORS"]),
  multiSession: z.boolean().default(false),
  strategies: z.array(z.enum(STRATEGY_KEYS)).max(5).default([]),
  avgRR: z.coerce.number().min(0.1).max(20),
  tradesPerDay: z.coerce.number().min(0.2).max(30),
  primaryInstrument: z.enum(Instruments),
  avgStopPoints: z.coerce.number().min(0.25).max(1e3)
});
var roadmapSchema = roadmapInput.transform((r) => ({ ...r, ...normalizeSelection({ mode: r.strategyMode, multiSession: r.multiSession, strategies: r.strategies }) })).refine((r) => r.strategies.length > 0, { message: "Pick at least one strategy", path: ["strategies"] }).transform(({ mode, ...r }) => ({ ...r, strategyMode: mode }));
var accountInput = z.object({
  templateId: z.string().min(3),
  nickname: z.string().trim().max(40).optional().nullable(),
  stage: z.enum(Stages).default("EVALUATION"),
  startDate: isoDate,
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  targetPassDays: z.coerce.number().int().min(1).max(120).optional().nullable(),
  riskPerTradeOverride: money.min(1).optional().nullable(),
  dailyLossLimitOverride: z.coerce.number().int().min(1).optional().nullable()
});
var accountPatch = accountInput.omit({ templateId: true }).partial();
var journalInput = z.object({
  memberAccountId: z.string().optional().nullable(),
  tradeDate: isoDate,
  ticker: z.string().trim().toUpperCase().min(1).max(12),
  direction: z.enum(["LONG", "SHORT"]),
  setupType: z.string().trim().min(1).max(60),
  contracts: z.coerce.number().int().min(1).max(500).optional().nullable(),
  riskPct: z.coerce.number().min(0).max(100).optional().nullable(),
  riskDollars: money.min(0).optional().nullable(),
  rrPlanned: z.coerce.number().min(0).max(50).optional().nullable(),
  rrRealized: z.coerce.number().min(-50).max(50).optional().nullable(),
  outcome: z.enum(["WIN", "LOSS", "BREAKEVEN"]),
  pnl: money.min(-1e6).max(1e6),
  emotion: z.enum(Emotions),
  followedPlan: z.boolean().default(true),
  screenshotUrl: httpsUrl.optional().nullable().or(z.literal("").transform(() => null)),
  notes: z.string().max(4e3).optional().nullable()
});
var journalPatch = journalInput.partial();
var payoutInput = z.object({ memberAccountId: z.string(), amount: money.min(0.01), paidAt: isoDate });
var feedbackInput = z.object({
  traderId: z.string(),
  journalEntryId: z.string().optional().nullable(),
  memberAccountId: z.string().optional().nullable(),
  kind: z.enum(["NOTE", "PRAISE", "WARNING", "ACTION_ITEM"]).default("NOTE"),
  body: z.string().trim().min(1).max(4e3)
});
var projectionInput = z.object({
  name: z.string().trim().min(1).max(60).default("My plan"),
  months: z.coerce.number().int().min(1).max(12).default(6),
  riskLevel: z.enum(["CONSERVATIVE", "STANDARD", "AGGRESSIVE"]).default("STANDARD"),
  rebuyOnFail: z.boolean().default(true),
  rows: z.array(z.object({
    templateId: z.string().min(3).max(120),
    quantity: z.coerce.number().int().min(1).max(20),
    start: z.enum(["EVAL", "FUNDED"]),
    costPerAttempt: z.coerce.number().min(0).max(1e4).default(0),
    monthlyFee: z.coerce.number().min(0).max(1e4).default(0),
    payoutCap: z.coerce.number().min(0).max(1e6).nullable().default(null)
  })).min(1, "Add at least one account").max(12)
});
var templatePatch = z.object({
  profitTarget: z.coerce.number().int().min(0).nullable().optional(),
  maxLoss: z.coerce.number().int().min(1).optional(),
  dailyLossLimit: z.coerce.number().int().min(0).nullable().optional(),
  dailyLossNote: z.string().max(200).optional(),
  consistencyPct: z.coerce.number().int().min(1).max(100).nullable().optional(),
  consistencyNote: z.string().max(200).optional(),
  minDays: z.coerce.number().int().min(0).max(60).optional(),
  maxMinis: z.coerce.number().int().min(0).optional(),
  maxMicros: z.coerce.number().int().min(0).optional(),
  profitSplit: z.string().max(60).nullable().optional(),
  notes: z.string().max(1e3).nullable().optional(),
  sourceUrl: z.string().url().optional(),
  isActive: z.boolean().optional()
});
var planTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
var tradingPlanInput = z.object({
  schedule: z.object({
    days: z.array(z.enum(PLAN_DAYS)).min(1, "Pick at least one day").max(6),
    sessions: z.array(z.enum(["ASIA", "LONDON", "NY"])).min(1, "Pick at least one session").max(3),
    start: planTime,
    end: planTime,
    windows: z.record(z.enum(["ASIA", "LONDON", "NY"]), z.object({ start: planTime, end: planTime })).optional()
  }),
  models: z.array(z.enum(["ECHO_X_ORBIT", "INVERTIX"])).min(1, "Pick at least one model").max(2),
  entries: z.object({
    entry: z.enum(["limit", "confirmation", "both"]),
    stopPts: z.coerce.number().min(1).max(200),
    targetPts: z.coerce.number().min(1).max(500),
    beAt1R: z.boolean(),
    partials: z.boolean()
  }),
  risk: z.object({
    instrument: z.enum(["MNQ", "NQ"]),
    contracts: z.coerce.number().int().min(1).max(50),
    maxLossesPerDay: z.coerce.number().int().min(1).max(10),
    maxTradesPerDay: z.coerce.number().int().min(1).max(20),
    dailyProfitStop: z.coerce.number().min(0).max(1e5).nullable(),
    noNews: z.boolean()
  }),
  numbers: z.object({
    monthlyGoal: z.coerce.number().min(0).max(1e6),
    tradingDays: z.coerce.number().int().min(1).max(23)
  }),
  rules: z.array(z.string().trim().min(1).max(140)).max(5)
});

// src/lib/practice.ts
var PRACTICE_MODELS = ["inv", "exo"];
var PRACTICE_MODEL_LABEL = { inv: "INVERTIX", exo: "Rejection blocks & CISD" };
var PRACTICE_TAGS = {
  "early-entry": "Enters before the flip closes",
  "traded-range": "Trades while the range is still building",
  "sold-the-trap": "Trades the fake move (the sweep) as if it's real",
  "counter-trend": "Takes setups against the 4H trend",
  "forced-trade": "Forces a trade on a no-sweep day",
  "stop-inside": "Stop inside the swept wick",
  "stop-wide": "Stop far wider than needed",
  "wrong-target": "Target not at the draw",
  "entry-off": "Entry not at the flip close",
  "wrong-side": "Stop on the wrong side of entry",
  "level-off": "Marks levels at closes, not wicks",
  window: "Uses candles outside the session window",
  oversize: "Sizes too big for the risk",
  "order-type": "Wrong order type for the entry",
  timing: "Trades outside the model's hours",
  "fvg-read": "Misreads fair value gaps",
  "flip-read": "Counts a wick as a flip",
  "missed-setup": "Skips valid A+ setups",
  "limit-no-lrl": "Sets limits without LRL and a short-term low",
  "limit-news": "Sets limits into the open or news",
  "entry-zone": "Limit outside the posted level",
  "stop-50": "Stop not at 50 ticks",
  "be-missed": "Doesn't move the stop to breakeven at 1:1",
  "cisd-read": "Misreads the CISD",
  "rb-read": "Marks the rejection block outside the FVG",
  "fib-anchor": "Anchors the fib on the wrong swing",
  "ote-read": "Enters outside the OTE zone",
  "inv-read": "Misses the inversion on the leg in",
  "draw-invalid": "Takes trades without a 2\xD7 draw"
};
function practiceTier(reps, acc) {
  if (reps >= 100 && acc >= 0.88) return "elite";
  if (reps >= 50 && acc >= 0.8) return "gold";
  if (reps >= 20 && acc >= 0.7) return "silver";
  if (reps >= 5) return "bronze";
  return "none";
}
function summarizePractice(rows, now = Date.now()) {
  if (!rows.length) return null;
  const t = (r) => new Date(r.createdAt).getTime();
  const models = PRACTICE_MODELS.map((model) => {
    const mine = rows.filter((r) => r.model === model);
    const recent = mine.slice(-40);
    const accuracy = recent.length ? recent.filter((r) => r.ok).length / recent.length : null;
    return { model, label: PRACTICE_MODEL_LABEL[model], reps: mine.length, accuracy, tier: practiceTier(mine.length, accuracy ?? 0) };
  });
  const counts = /* @__PURE__ */ new Map();
  for (const r of rows.slice(-120)) for (const tag of r.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  const mistakes = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag, count]) => ({ tag, label: PRACTICE_TAGS[tag] ?? tag, count }));
  return {
    totalReps: rows.length,
    repsThisWeek: rows.filter((r) => t(r) > now - 7 * 864e5).length,
    lastRepAt: new Date(t(rows[rows.length - 1])).toISOString(),
    models,
    mistakes
  };
}

// src/lib/school.ts
var SCHOOL_MODULES = [
  { id: "m37", n: 1, title: "Market Basics" },
  { id: "m02", n: 2, title: "Chart Reading Basics" },
  { id: "m38", n: 3, title: "Your First 20 Minutes on a Chart" },
  { id: "m19", n: 4, title: "TradingView & Platform Setup" },
  { id: "m20", n: 5, title: "How Futures & NQ Work" },
  { id: "m39", n: 6, title: "Your Demo Account: Open It and Use It" },
  { id: "m21", n: 7, title: "Orders & Your First Trade" },
  { id: "m41", n: 8, title: "Sessions & Economic News" },
  { id: "m13", n: 9, title: "Building Daily Bias" },
  { id: "m42", n: 10, title: "One Trade Per Session" },
  { id: "m01", n: 11, title: "Trading Mindset" },
  { id: "m15", n: 12, title: "Trading Psychology & Discipline" },
  { id: "m25", n: 13, title: "A Day in the Life & Your Trading Plan" },
  { id: "m03", n: 14, title: "Liquidity Explained" },
  { id: "m04", n: 15, title: "Advanced Liquidity Concepts" },
  { id: "m05", n: 16, title: "Break of Structure" },
  { id: "m06", n: 17, title: "Fair Value Gaps & Inverse Fair Value Gaps" },
  { id: "m48", n: 18, title: "Rejection Blocks" },
  { id: "m49", n: 19, title: "CISD: Change in State of Delivery" },
  { id: "m07", n: 20, title: "Advanced Imbalance & Equilibrium" },
  { id: "m10", n: 21, title: "SMT Divergence" },
  { id: "m11", n: 22, title: "Time Theory & Session Timing" },
  { id: "m12", n: 23, title: "Funded Accounts & Prop Firms" },
  { id: "m14", n: 24, title: "Risk Management" },
  { id: "m23", n: 25, title: "Trade Management & Spot the Mistake" },
  { id: "m24", n: 26, title: "Why the Math Works" },
  { id: "m50", n: 27, title: "Understanding GEX Levels" }
];
var SCHOOL_MODULE_IDS = SCHOOL_MODULES.map((m) => m.id);
var SCHOOL_NO_PROOF = ["m50"];
var SCHOOL_PROVABLE_IDS = SCHOOL_MODULE_IDS.filter((id) => !SCHOOL_NO_PROOF.includes(id));
var SCHOOL_FIRST_CORE = 5;
function schoolOpen(modules, i) {
  if (modules[i].manualUnlock) return true;
  return i <= SCHOOL_FIRST_CORE || modules[i - 1].passed;
}
function summarizeSchool(state, unlocks, attempts) {
  const m = state?.v2?.m ?? {};
  const modules = SCHOOL_MODULES.map((def) => {
    const p = m[def.id] ?? {};
    return {
      id: def.id,
      n: def.n,
      title: def.title,
      stepsDone: String(p.s ?? "").slice(0, 3).split("").filter((c) => c === "1").length,
      passed: p.p === 1,
      tested: p.p === 1 && p.t === 1,
      best: p.p === 1 ? Math.max(0, Math.min(100, p.sc ?? 0)) : 0,
      tries: p.n ?? 0,
      attempt: p.a ?? 1,
      manualUnlock: unlocks.includes(def.id)
    };
  });
  const passed = modules.filter((x) => x.passed).length;
  const unlocked = (i) => schoolOpen(modules, i);
  const cur = modules.findIndex((x, i) => !x.passed && unlocked(i));
  const label = (ref) => {
    const d = SCHOOL_MODULES.find((x) => x.id === ref);
    return d ? `Module ${d.n} exam \xB7 ${d.title}` : ref;
  };
  return {
    modules,
    passed,
    total: modules.length,
    current: passed === modules.length ? "Course complete" : cur >= 0 ? `Module ${modules[cur].n}` : "Not started",
    attempts: attempts.filter((a) => (a.kind === "ex" || a.kind === "po") && SCHOOL_MODULE_IDS.includes(a.ref)).slice(0, 12).map((a) => ({
      label: label(a.ref),
      pct: a.total ? a.score / a.total : 0,
      pass: a.pass,
      at: new Date(a.createdAt).toISOString()
    }))
  };
}

// src/lib/schoolPath.ts
var PROOF_PASS = 0.8;
var PROOF_FAST_SECS_PER_Q = 6;
var PROVABLE = new Set(SCHOOL_PROVABLE_IDS);
var isProvable = (id) => PROVABLE.has(id);
function cleanModes(raw, passed, used) {
  const o = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const id of SCHOOL_PROVABLE_IDS) out[id] = o[id] === "prove" && !passed.has(id) && !used.has(id) ? "prove" : "learn";
  return out;
}
function cleanAnswers(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const pick = (v, ok) => typeof v === "string" && ok.includes(v) ? v : "";
  return { start: pick(o.start, ["new", "traded", "experienced"]), prop: pick(o.prop, ["no", "yes"]) };
}
var proofNeeded = (total) => Math.ceil(total * PROOF_PASS - 1e-9);
var proofFast = (secs, total) => secs > 0 && secs < total * PROOF_FAST_SECS_PER_Q;

// src/lib/gex.ts
var SIGMA_PROXY = 0.2;
var MIN_T = 0.25 / 365;
function parseOption(o) {
  const m = /^[A-Z]+W?(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(o.sym.replace(/^_/, ""));
  if (!m || !(o.oi > 0)) return null;
  const iv = Number(o.iv);
  return { type: m[4], strike: Number(m[5]) / 1e3, exp: `20${m[1]}-${m[2]}-${m[3]}`, oi: o.oi, iv: iv > 0.01 && iv < 5 ? iv : SIGMA_PROXY, gamma: Number.isFinite(Number(o.gamma)) && Number(o.gamma) > 0 ? Number(o.gamma) : null };
}
var phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
function bsGamma(S, K, sigma, T) {
  const t = Math.max(T, MIN_T), v = sigma * Math.sqrt(t);
  return phi((Math.log(S / K) + 0.5 * v * v) / v) / (S * v);
}
var etHour = (ms) => Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(new Date(ms)));
function expiryMs(exp) {
  const y = +exp.slice(0, 4), m = +exp.slice(5, 7) - 1, d = +exp.slice(8, 10);
  for (const off of [4, 5]) {
    const t = Date.UTC(y, m, d, 16 + off, 15);
    if (etHour(t) === 16) return t;
  }
  return Date.UTC(y, m, d, 21, 15);
}
var yearsTo = (exp, asOf) => (expiryMs(exp) - asOf.getTime()) / (365 * 864e5);
var gexAt = (o, S, T, gamma) => (o.type === "C" ? 1 : -1) * o.oi * gamma * 100 * S * S * 0.01;
function levelsFor(opts, spot, asOf) {
  if (!opts.length) return { callWall: null, putWall: null, flip: null, regime: null, calls: [], puts: [] };
  const callBy = /* @__PURE__ */ new Map(), putBy = /* @__PURE__ */ new Map();
  for (const o of opts) {
    const g = o.gamma ?? bsGamma(spot, o.strike, o.iv, yearsTo(o.exp, asOf));
    const v = gexAt(o, spot, 0, g);
    (o.type === "C" ? callBy : putBy).set(o.strike, ((o.type === "C" ? callBy : putBy).get(o.strike) ?? 0) + v);
  }
  const rank = (m, sign2) => [...m.entries()].sort((a, b) => sign2 * (b[1] - a[1]) || Math.abs(a[0] - spot) - Math.abs(b[0] - spot)).map(([k]) => k);
  const calls = rank(callBy, 1), puts = rank(putBy, -1);
  const total = (S) => opts.reduce((s, o) => s + gexAt(o, S, 0, bsGamma(S, o.strike, o.iv, yearsTo(o.exp, asOf))), 0);
  let flip = null, best = Infinity, prevS = spot * 0.9, prevV = total(prevS);
  for (let i = 1; i <= 160; i++) {
    const S = spot * (0.9 + i * 125e-5), v = total(S);
    if (prevV === 0 || prevV < 0 !== v < 0) {
      const x = prevV === v ? S : prevS + (S - prevS) * (0 - prevV) / (v - prevV);
      if (Math.abs(x - spot) < best) {
        best = Math.abs(x - spot);
        flip = x;
      }
    }
    prevS = S;
    prevV = v;
  }
  const regime = flip == null ? total(spot) >= 0 ? "positive" : "negative" : spot >= flip ? "positive" : "negative";
  return { callWall: calls[0] ?? null, putWall: puts[0] ?? null, flip: flip == null ? null : Math.round(flip), regime, calls: calls.slice(0, 10), puts: puts.slice(0, 10) };
}
function nextExpiry(exps) {
  return [...new Set(exps)].sort()[0] ?? null;
}
var EXPORT_LEGEND = [
  ...Array.from({ length: 10 }, (_, i) => `Call wall ${i + 1}${i === 0 ? " (strongest)" : ""}`),
  ...Array.from({ length: 10 }, (_, i) => `Put wall ${i + 1}${i === 0 ? " (strongest)" : ""}`),
  "Gamma flip"
];
function exportLine(l) {
  const n2 = (v) => v == null ? 0 : Math.round(v);
  const ten = (a) => Array.from({ length: 10 }, (_, i) => n2(a[i]));
  return [...ten(l.calls), ...ten(l.puts), n2(l.flip), "NDX"].join(",");
}
function computeGex(chain, spot, asOf) {
  const opts = chain.map(parseOption).filter((o) => !!o && expiryMs(o.exp) > asOf.getTime());
  if (!(spot > 0) || opts.length < 20) return null;
  const e0 = nextExpiry(opts.map((o) => o.exp));
  const all = levelsFor(opts, spot, asOf), zero = levelsFor(opts.filter((o) => o.exp === e0), spot, asOf);
  return { spot, expiry0: e0, all, zero, export: exportLine(all), exportZero: exportLine(zero) };
}
function estimateBasis(spot, now, rate = 0.035, divYield = 7e-3) {
  const y = now.getUTCFullYear();
  const third = (yr, m) => {
    const d = new Date(Date.UTC(yr, m, 1));
    d.setUTCDate(1 + (5 - d.getUTCDay() + 7) % 7 + 14);
    return d;
  };
  const q = [2, 5, 8, 11].map((m) => third(y, m)).concat([third(y + 1, 2)]).find((d) => d.getTime() + 20 * 36e5 > now.getTime());
  return spot * (rate - divYield) * ((q.getTime() - now.getTime()) / (365 * 864e5));
}

// src/lib/schoolPace.ts
var PACE_MIN = 1;
var PACE_MAX = 14;
var PACE_MAX_NUDGES = 3;
var DAY2 = 864e5;
var clampPace = (n2) => Math.max(PACE_MIN, Math.min(PACE_MAX, Math.round(Number(n2) || 0) || 4));
function expectedPassed(baseline, perWeek, startedAt, now, total) {
  const weeks = Math.max(0, now.getTime() - startedAt.getTime()) / (7 * DAY2);
  return Math.min(total, baseline + Math.floor(clampPace(perWeek) * weeks));
}
function paceStatus(passed, expected, total) {
  if (passed >= total) return "done";
  if (passed > expected) return "ahead";
  if (passed >= expected - 1) return "on";
  return "behind";
}
var nudgeGapDays = (perWeek) => Math.max(2, Math.min(6, Math.round(7 / clampPace(perWeek)) + 1));

// src/lib/vault.ts
import { createHash } from "node:crypto";

// src/lib/vaultModules.ts
var VAULT_MODULES = [
  { id: "x01", title: "The Idea in Plain Words and the Language" },
  { id: "x02", title: "Instruments, Sessions and News" },
  { id: "x03", title: "Step 1: Build the Narrative" },
  { id: "x04", title: "Rejection Blocks and CISD" },
  { id: "x05", title: "Gaps by Timeframe, Order Blocks, SMT and Key Opens" },
  { id: "x06", title: "Model 1: The External Rejection Block" },
  { id: "x07", title: "Model 2: The CISD Rejection Block" },
  { id: "x08", title: "Model 3: The 1-Minute Continuation" },
  { id: "x09", title: "Grading: Is It Worth the Risk?" },
  { id: "x10", title: "Stops, Targets, Partials and Break-even" },
  { id: "x11", title: "Why Trades Lose, and Adapting to Conditions" },
  { id: "x12", title: "Daily Rules and the Pre-Trade Checklist" },
  { id: "x13", title: "The Echo x Orbit Trade Plan" },
  { id: "x14", title: "Make the Call: ECHO X ORBIT" },
  { id: "o01", title: "What Orderflow Is and Why It Backs a Rejection" },
  { id: "o02", title: "Reading the Tape Around a Rejection" },
  { id: "o03", title: "Delta, Volume and Imbalance" },
  { id: "o04", title: "Orderflow and the ECHO X ORBIT Checklist" },
  { id: "o05", title: "Gamma Levels as Orderflow Context" }
];
var VAULT_MODULE_IDS = VAULT_MODULES.map((m) => m.id);

// src/lib/vault.ts
var ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function makeCode(bytes) {
  const s = Array.from(bytes.slice(0, 10), (b) => ALPHABET[b % 32]).join("");
  return `FH-${s.slice(0, 5)}-${s.slice(5, 10)}`;
}
function normalizeCode(input) {
  const s = String(input ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = s.startsWith("FH") ? s.slice(2) : s;
  return body.replace(/O/g, "0").replace(/[IL]/g, "1");
}
var hashCode = (code, pepper) => createHash("sha256").update(pepper + ":" + normalizeCode(code)).digest("hex");
function vaultPassed(state) {
  const m = state?.v2?.m ?? {};
  return VAULT_MODULE_IDS.filter((id) => m[id]?.p === 1).length;
}

// src/lib/tracks.ts
var TRACK_IDS = ["fundamentals", "invertix", "exo"];
var TRACK_NAME = { fundamentals: "Trading Fundamentals", invertix: "INVERTIX", exo: "ECHO X ORBIT" };
var TRACK_URL = { fundamentals: "/school", invertix: "/invertix", exo: "/vault" };
var isTrack = (t) => typeof t === "string" && TRACK_IDS.includes(t);
var INVERTIX_MODULES = [
  { id: "m43", n: 1, title: "INVERTIX: The Idea and the Pieces" },
  { id: "m44", n: 2, title: "INVERTIX: The Key Level" },
  { id: "m45", n: 3, title: "INVERTIX: The Flip, Entry and Stop" },
  { id: "m46", n: 4, title: "INVERTIX: Targets, Windows and Size" },
  { id: "m47", n: 5, title: "INVERTIX: The Daily Playbook" }
];
var INVERTIX_MODULE_IDS = INVERTIX_MODULES.map((m) => m.id);
var EXO_MODULES = VAULT_MODULES.filter((m) => m.id.startsWith("x"));
var EXO_MODULE_IDS = EXO_MODULES.map((m) => m.id);
var trackModules = (t) => t === "fundamentals" ? SCHOOL_MODULES : t === "invertix" ? INVERTIX_MODULES : EXO_MODULES;
var trackTotal = (t) => trackModules(t).length;
function passedIn(state, ids2) {
  const st = state ? typeof state === "string" ? JSON.parse(state) : state : null;
  return Object.entries(st?.v2?.m ?? {}).filter(([k, v]) => ids2.has(k) && v?.p === 1).length;
}
function nextModule(t, state) {
  const st = state ? typeof state === "string" ? JSON.parse(state) : state : null;
  const mods = trackModules(t);
  const i = mods.findIndex((m) => st?.v2?.m?.[m.id]?.p !== 1);
  return { n: (i < 0 ? 0 : i) + 1, title: mods[i < 0 ? 0 : i].title };
}
var fundamentalsComplete = (fundState) => passedIn(fundState, new Set(SCHOOL_MODULES.map((m) => m.id))) >= SCHOOL_MODULES.length;
var invertixOpen = (fundState, invState) => fundamentalsComplete(fundState) || passedIn(invState, new Set(INVERTIX_MODULE_IDS)) > 0;

// deploy/server.ts
var env = Bun.env;
var ids = (s) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
var CFG = {
  publicUrl: (env.PUBLIC_URL ?? "").replace(/\/$/, ""),
  clientId: env.DISCORD_CLIENT_ID ?? "",
  clientSecret: env.DISCORD_CLIENT_SECRET ?? "",
  guildId: env.DISCORD_GUILD_ID ?? "",
  adminRoles: ids(env.DISCORD_ADMIN_ROLE_IDS),
  coachRoles: ids(env.DISCORD_COACH_ROLE_IDS),
  memberRoles: ids(env.DISCORD_MEMBER_ROLE_IDS),
  // roles allowed in once launched (empty = whole server)
  mentorshipRoles: ids(env.DISCORD_MENTORSHIP_ROLE_IDS),
  // roles that count as mentorship for the ECHO X ORBIT vault (a role whose name contains "mentor" also counts)
  launched: (env.FLOWHUB_LAUNCHED ?? "").toLowerCase() === "true",
  // false = staff only
  botToken: env.DISCORD_BOT_TOKEN ?? "",
  signalsSecret: env.SIGNALS_HANDOFF_SECRET ?? "",
  // shared with the Signals site (signals.flowmtd.com); empty = Signals link switched off
  sessionSecret: env.SESSION_SECRET ?? "",
  encKey: Buffer.from(env.TOKEN_ENCRYPTION_KEY ?? "", "base64")
};
var discordReady = () => !!(CFG.clientId && CFG.clientSecret && CFG.guildId && CFG.publicUrl);
if (CFG.sessionSecret.length < 32) throw new Error("SESSION_SECRET missing or too short");
if (CFG.encKey.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes base64");
var sql = new SQL({ url: env.DATABASE_URL, tls: true, max: 8, idleTimeout: 30 });
var DISCORD = "https://discord.com/api/v10";
var ROLE_TTL = 10 * 60 * 1e3;
var SESSION_DAYS = 7;
var HttpError = class extends Error {
  constructor(status, msg) {
    super(msg);
    this.status = status;
  }
  status;
};
var n = (v) => v == null ? null : Number(v);
var pgArray = (xs) => `{${xs.map((x) => `"${x.replace(/["\\]/g, "\\$&")}"`).join(",")}}`;
async function patchRow(table, id, data, casts = {}) {
  const keys = Object.keys(data).filter((k) => data[k] !== void 0 && /^[A-Za-z]+$/.test(k));
  if (!keys.length) return;
  const sets = keys.map((k, i) => `"${k}" = $${i + 1}${casts[k] ? casts[k] === "date" ? "::date" : `::"${casts[k]}"` : ""}`);
  await sql.unsafe(`update "${table}" set ${sets.join(", ")}, "updatedAt" = now() where id = $${keys.length + 1}`, [...keys.map((k) => data[k] ?? null), id]);
}
function encrypt(plain) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", CFG.encKey, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".");
}
function decrypt(payload) {
  const [, iv, tag, enc] = payload.split(".");
  const d = createDecipheriv("aes-256-gcm", CFG.encKey, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64url")), d.final()]).toString("utf8");
}
var isStaff = (u) => u.role === "COACH" || u.role === "ADMIN";
var roleFrom = (roleIds) => roleIds.some((r) => CFG.adminRoles.includes(r)) ? "ADMIN" : roleIds.some((r) => CFG.coachRoles.includes(r)) ? "COACH" : "MEMBER";
var accessFor = (roleIds) => {
  if (roleFrom(roleIds) !== "MEMBER") return "ok";
  if (!CFG.launched) return "soon";
  if (CFG.memberRoles.length && !roleIds.some((r) => CFG.memberRoles.includes(r))) return "role";
  return "ok";
};
function avatarUrl(discordId, hash) {
  if (!/^\d+$/.test(discordId)) return "https://cdn.discordapp.com/embed/avatars/0.png";
  if (!hash) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordId) >> 22n) % 6}.png`;
  return `https://cdn.discordapp.com/avatars/${discordId}/${hash}.${hash.startsWith("a_") ? "gif" : "png"}?size=128`;
}
var person = (u) => ({
  id: u.id,
  name: u.globalName ?? u.username,
  avatarUrl: avatarUrl(u.discordId, u.avatarHash),
  role: u.role,
  discordId: u.discordId
});
async function dfetch(url, init, retried = false) {
  const res = await fetch(url, init);
  if (res.status === 429 && !retried) {
    const b = await res.json().catch(() => ({}));
    await Bun.sleep(Math.min(5e3, (b.retry_after ?? 1) * 1e3));
    return dfetch(url, init, true);
  }
  return res;
}
async function toLookup(res) {
  if (res.ok) return { status: "member", roleIds: (await res.json()).roles };
  if (res.status === 404) return { status: "not_member" };
  console.error("discord member lookup", res.status, await res.text().catch(() => ""));
  return { status: "error" };
}
var lookupUser = (token) => dfetch(`${DISCORD}/users/@me/guilds/${CFG.guildId}/member`, { headers: { Authorization: `Bearer ${token}` } }).then(toLookup);
var ROLE_NAMES = /* @__PURE__ */ new Map();
if (CFG.botToken && CFG.guildId)
  fetch(`${DISCORD}/guilds/${CFG.guildId}/roles`, { headers: { Authorization: `Bot ${CFG.botToken}` } }).then((r) => r.ok ? r.json() : r.text().then((t) => Promise.reject(`${r.status} ${t}`))).then((roles) => {
    for (const x of roles) ROLE_NAMES.set(x.id, x.name);
    console.log("FLOWHUB roles:", roles.map((x) => `${x.name}=${x.id}`).join(" | "));
  }).catch((e) => console.error("FLOWHUB roles lookup failed", e));
var lookupBot = (discordId) => dfetch(`${DISCORD}/guilds/${CFG.guildId}/members/${discordId}`, { headers: { Authorization: `Bot ${CFG.botToken}` } }).then(toLookup);
async function oauthToken(body) {
  const res = await fetch(`${DISCORD}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CFG.clientId, client_secret: CFG.clientSecret, ...body })
  });
  if (!res.ok) {
    console.error("oauth token", res.status, await res.text().catch(() => ""));
    return null;
  }
  return await res.json();
}
async function syncRolesIfStale(u) {
  if (u.rolesSyncedAt && Date.now() - u.rolesSyncedAt.getTime() < ROLE_TTL) return u;
  let lookup = { status: "error" };
  let tokens = null;
  if (CFG.botToken) lookup = await lookupBot(u.discordId);
  else if (u.accessTokenEnc) {
    let access = decrypt(u.accessTokenEnc);
    if (u.tokenExpiresAt && u.tokenExpiresAt.getTime() < Date.now() + 6e4 && u.refreshTokenEnc) {
      const fresh = await oauthToken({ grant_type: "refresh_token", refresh_token: decrypt(u.refreshTokenEnc) });
      if (!fresh) {
        const [row2] = await sql`update "User" set "isGuildMember" = false, "rolesSyncedAt" = now() where id = ${u.id} returning *`;
        return row2;
      }
      access = fresh.access_token;
      tokens = { a: encrypt(fresh.access_token), r: encrypt(fresh.refresh_token), e: new Date(Date.now() + fresh.expires_in * 1e3) };
    }
    lookup = await lookupUser(access);
  }
  if (lookup.status === "error") return u;
  const member = lookup.status === "member";
  const roleIds = member ? lookup.roleIds : [];
  if (tokens) await sql`update "User" set "accessTokenEnc" = ${tokens.a}, "refreshTokenEnc" = ${tokens.r}, "tokenExpiresAt" = ${tokens.e} where id = ${u.id}`;
  const [row] = await sql`
    update "User" set "isGuildMember" = ${member}, "guildRoleIds" = ${pgArray(roleIds)}::text[], "role" = ${member ? roleFrom(roleIds) : "MEMBER"}::"Role",
      "rolesSyncedAt" = now()
    where id = ${u.id} returning *`;
  return row;
}
async function loadDashboard(viewer, traderId) {
  const [trader] = await sql`select * from "User" where id = ${traderId}`;
  if (!trader) throw new HttpError(404, "Not found");
  const [[rm], accounts, journal, feedback, [pj], practiceRows, [sp], attempts, [tp]] = await Promise.all([
    sql`select * from "Roadmap" where "userId" = ${traderId}`,
    sql`select *, to_char("startDate", 'YYYY-MM-DD') as "startISO" from "MemberAccount" where "userId" = ${traderId} order by "createdAt"`,
    sql`select j.*, to_char(j."tradeDate", 'YYYY-MM-DD') as "dateISO",
               (select count(*)::int from "CoachFeedback" f where f."journalEntryId" = j.id) as "fb"
        from "JournalEntry" j where j."userId" = ${traderId} and j."tradeDate" >= current_date - 400`,
    sql`select f.*, c."globalName" as "cName", c.username as "cUser", c."discordId" as "cDid", c."avatarHash" as "cAv"
        from "CoachFeedback" f join "User" c on c.id = f."coachId" where f."traderId" = ${traderId} order by f."createdAt" desc limit 100`,
    sql`select name, config, "updatedAt" from "Projection" where "userId" = ${traderId}`,
    sql`select model, drill, ok, tags, "createdAt" from "PracticeRep" where "userId" = ${traderId} and "createdAt" > now() - interval '120 days' order by "createdAt"`,
    sql`select state, unlocks from "SchoolProgress" where "userId" = ${traderId}`,
    sql`select kind, ref, score, total, pass, "createdAt" from "SchoolAttempt" where "userId" = ${traderId} order by "createdAt" desc limit 12`,
    sql`select plan, "updatedAt" from "TradingPlan" where "userId" = ${traderId}`
  ]);
  const jsonOf = (v) => typeof v === "string" ? JSON.parse(v) : v;
  const strategies = (rm?.strategies ?? []).filter((k) => !RETIRED_STRATEGIES.includes(k));
  return buildDashboard({
    viewer: person(viewer),
    trader: person(trader),
    today: todayET(),
    roadmap: rm ? {
      monthlyIncomeGoal: n(rm.monthlyIncomeGoal),
      tradingDaysPerWeek: rm.tradingDaysPerWeek,
      strategyMode: rm.strategyMode,
      multiSession: rm.multiSession,
      strategies,
      winRate: blendedWinRate({ mode: rm.strategyMode, multiSession: rm.multiSession, strategies }),
      avgRR: n(rm.avgRR),
      tradesPerDay: n(rm.tradesPerDay),
      primaryInstrument: rm.primaryInstrument,
      avgStopPoints: n(rm.avgStopPoints)
    } : null,
    accounts: accounts.map((a) => ({
      id: a.id,
      templateId: a.templateId,
      nickname: a.nickname,
      stage: a.stage,
      startDate: a.startISO,
      quantity: a.quantity,
      targetPassDays: a.targetPassDays,
      riskPerTradeOverride: n(a.riskPerTradeOverride),
      dailyLossLimitOverride: a.dailyLossLimitOverride,
      rules: typeof a.ruleSnapshot === "string" ? JSON.parse(a.ruleSnapshot) : a.ruleSnapshot
    })),
    journal: journal.map((j) => ({
      id: j.id,
      memberAccountId: j.memberAccountId,
      tradeDate: j.dateISO,
      ticker: j.ticker,
      direction: j.direction,
      setupType: j.setupType,
      contracts: j.contracts,
      riskPct: n(j.riskPct),
      riskDollars: n(j.riskDollars),
      rrPlanned: n(j.rrPlanned),
      rrRealized: n(j.rrRealized),
      outcome: j.outcome,
      pnl: n(j.pnl),
      emotion: j.emotion,
      followedPlan: j.followedPlan,
      screenshotUrl: j.screenshotUrl,
      notes: j.notes,
      feedbackCount: j.fb
    })),
    feedback: feedback.map((f) => ({
      id: f.id,
      coach: { name: f.cName ?? f.cUser, avatarUrl: avatarUrl(f.cDid, f.cAv) },
      kind: f.kind,
      body: f.body,
      journalEntryId: f.journalEntryId,
      memberAccountId: f.memberAccountId,
      createdAt: new Date(f.createdAt).toISOString(),
      readAt: f.readAt ? new Date(f.readAt).toISOString() : null
    })),
    school: sp || attempts.length ? summarizeSchool(sp ? jsonOf(sp.state) : null, sp?.unlocks ?? [], attempts) : null,
    tradingPlan: tp ? { ...jsonOf(tp.plan), models: cleanPlanModels(jsonOf(tp.plan).models), done: true, updatedAt: new Date(tp.updatedAt).toISOString() } : null,
    practice: summarizePractice(practiceRows),
    projection: pj ? { ...typeof pj.config === "string" ? JSON.parse(pj.config) : pj.config, name: pj.name, updatedAt: new Date(pj.updatedAt).toISOString() } : null
  });
}
async function loadCatalog() {
  const rows = await sql`select t.*, f.name as firm from "AccountTemplate" t join "PropFirm" f on f.id = t."firmId"
                         where t."isActive" order by f.name, t."planName", t."accountSize"`;
  const out = [];
  for (const t of rows) {
    let f = out.find((x) => x.firm === t.firm);
    if (!f) out.push(f = { firm: t.firm, plans: [] });
    let p = f.plans.find((x) => x.plan === t.planName);
    if (!p) f.plans.push(p = { plan: t.planName, sizes: [] });
    p.sizes.push({
      id: t.id,
      accountSize: t.accountSize,
      profitTarget: t.profitTarget,
      maxLoss: t.maxLoss,
      dailyLossLimit: t.dailyLossLimit,
      consistencyPct: t.consistencyPct,
      minDays: t.minDays,
      drawdownNote: t.drawdownNote,
      dataStatus: t.dataStatus,
      drawdownModel: t.drawdownModel,
      maxMinis: t.maxMinis,
      maxMicros: t.maxMicros,
      profitSplit: t.profitSplit
    });
  }
  return out;
}
var audit = (actorId, action, targetId = null, meta = null) => sql`insert into "AuditLog" (id, "actorId", action, "targetId", meta) values (${randomUUID()}, ${actorId}, ${action}, ${targetId}, ${meta ? JSON.stringify(meta) : null}::jsonb)`;
var app = new Hono();
var cookieOpts = { httpOnly: true, secure: true, sameSite: "Lax", path: "/" };
async function currentUser(c) {
  const token = getCookie(c, "fh_session");
  if (!token) return null;
  try {
    const p = await verify(token, CFG.sessionSecret, "HS256");
    const [u] = await sql`select * from "User" where id = ${p.uid}`;
    if (!u) return null;
    if (String(u.discordId).startsWith("local:")) {
      const [a] = await sql`select disabled, "expiresAt" from "LocalAccount" where "userId" = ${u.id}`;
      return a && !a.disabled && !(a.expiresAt && new Date(a.expiresAt) < /* @__PURE__ */ new Date()) ? u : null;
    }
    const synced = await syncRolesIfStale(u);
    const gr = synced.guildRoleIds;
    const roleIds = Array.isArray(gr) ? gr.map(String) : typeof gr === "string" ? gr.replace(/[{}"]/g, "").split(",").filter(Boolean) : [];
    return synced.isGuildMember && accessFor(roleIds) === "ok" ? synced : null;
  } catch {
    return null;
  }
}
app.use("*", async (c, next) => {
  await next();
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Strict-Transport-Security", "max-age=31536000");
});
app.onError((e, c) => {
  if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
  if (e instanceof ZodError) return c.json({ error: e.issues[0]?.message ?? "Invalid input", issues: e.flatten() }, 400);
  console.error(e);
  return c.json({ error: "Server error" }, 500);
});
app.use("*", async (c, next) => {
  const host = (c.req.header("host") ?? "").toLowerCase();
  if (CFG.publicUrl && host.endsWith(".up.railway.app") && !c.req.path.startsWith("/healthz") && !CFG.publicUrl.includes(host))
    return c.redirect(CFG.publicUrl + c.req.path + (new URL(c.req.url).search || ""), 301);
  await next();
});
app.get("/healthz", async (c) => c.json({ ok: true, db: (await sql`select 1 as ok`)[0].ok === 1, discord: discordReady() }));
var SIGNALS_WEEKLY = "https://gtzwxamwnuxjnamwmtyn.supabase.co/functions/v1/weekly-win-rate";
var weeklyCache = null;
async function signalsWeekly() {
  if (weeklyCache && Date.now() - weeklyCache.at < 6e4) return weeklyCache.v;
  const r = await fetch(SIGNALS_WEEKLY, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15e3) });
  if (!r.ok) throw new HttpError(502, "Couldn't load the signal results right now.");
  const j = await r.json();
  if (!j.weeks?.length) throw new HttpError(502, "Couldn't load the signal results right now.");
  weeklyCache = { at: Date.now(), v: fromSignalsWeeks(j.weeks, j.days) };
  return weeklyCache.v;
}
var WINRATE_ORIGINS = ["https://www.flowmtd.com", "https://flowmtd.com"];
var winrateOrigin = (o) => o && WINRATE_ORIGINS.includes(o) ? o : WINRATE_ORIGINS[0];
app.options("/public/weekly-win-rate", (c) => c.body(null, 204, { "Access-Control-Allow-Origin": winrateOrigin(c.req.header("origin")), "Access-Control-Allow-Methods": "GET", Vary: "Origin" }));
app.get("/public/weekly-win-rate", async (c) => {
  c.header("Access-Control-Allow-Origin", winrateOrigin(c.req.header("origin")));
  c.header("Vary", "Origin");
  c.header("Cache-Control", "public, max-age=300");
  const w = await signalsWeekly();
  const pick = ({ label, wins, losses, breakeven, trades, pending, pts, rate }) => ({ label, wins, losses, breakeven, trades, pending, pts, rate });
  return c.json({ current: pick(w.current), previous: pick(w.previous) });
});
app.get("/auth/discord", (c) => {
  if (!discordReady()) return c.redirect("/#setup");
  const state = randomBytes(16).toString("base64url");
  setCookie(c, "fh_state", state, { ...cookieOpts, maxAge: 600 });
  const q = new URLSearchParams({
    client_id: CFG.clientId,
    response_type: "code",
    redirect_uri: `${CFG.publicUrl}/auth/callback`,
    scope: "identify guilds.members.read",
    state,
    prompt: "none"
  });
  return c.redirect(`https://discord.com/oauth2/authorize?${q}`);
});
app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state") ?? "";
  const expected = getCookie(c, "fh_state") ?? "";
  deleteCookie(c, "fh_state", { path: "/" });
  if (!code || !expected || state.length !== expected.length || !timingSafeEqual(Buffer.from(state), Buffer.from(expected)))
    return c.redirect("/#denied-signin");
  const tok = await oauthToken({ grant_type: "authorization_code", code, redirect_uri: `${CFG.publicUrl}/auth/callback` });
  if (!tok) return c.redirect("/#denied-signin");
  const meRes = await fetch(`${DISCORD}/users/@me`, { headers: { Authorization: `Bearer ${tok.access_token}` } });
  if (!meRes.ok) return c.redirect("/#denied-discord");
  const me = await meRes.json();
  const lookup = await lookupUser(tok.access_token);
  if (lookup.status === "not_member") return c.redirect("/#denied-guild");
  if (lookup.status === "error") return c.redirect("/#denied-discord");
  const access = accessFor(lookup.roleIds);
  if (access !== "ok") return c.redirect(`/#denied-${access}`);
  const role = roleFrom(lookup.roleIds);
  const [u] = await sql`
    insert into "User" (id, "discordId", username, "globalName", "avatarHash", role, "guildRoleIds", "isGuildMember",
                        "accessTokenEnc", "refreshTokenEnc", "tokenExpiresAt", "rolesSyncedAt", "lastLoginAt")
    values (${randomUUID()}, ${me.id}, ${me.username}, ${me.global_name ?? null}, ${me.avatar ?? null}, ${role}::"Role", ${pgArray(lookup.roleIds)}::text[], true,
            ${encrypt(tok.access_token)}, ${encrypt(tok.refresh_token)}, ${new Date(Date.now() + tok.expires_in * 1e3)}, now(), now())
    on conflict ("discordId") do update set username = excluded.username, "globalName" = excluded."globalName", "avatarHash" = excluded."avatarHash",
      role = excluded.role, "guildRoleIds" = excluded."guildRoleIds", "isGuildMember" = true, "accessTokenEnc" = excluded."accessTokenEnc",
      "refreshTokenEnc" = excluded."refreshTokenEnc", "tokenExpiresAt" = excluded."tokenExpiresAt", "rolesSyncedAt" = now(), "lastLoginAt" = now()
    returning id`;
  const jwt = await sign({ uid: u.id, exp: Math.floor(Date.now() / 1e3) + SESSION_DAYS * 86400 }, CFG.sessionSecret, "HS256");
  setCookie(c, "fh_session", jwt, { ...cookieOpts, maxAge: SESSION_DAYS * 86400 });
  if (getCookie(c, "fh_next") === "signals") {
    deleteCookie(c, "fh_next", { path: "/" });
    return c.redirect("/signals-login");
  }
  return c.redirect("/#home");
});
app.get("/auth/logout", (c) => {
  deleteCookie(c, "fh_session", { path: "/" });
  return c.redirect("/");
});
var SIGNALS_ORIGIN = "https://signals.flowmtd.com";
app.get("/signals-login", async (c) => {
  if (!CFG.signalsSecret) return c.text("Signals is not switched on yet.", 503);
  const u = await currentUser(c);
  if (!u) {
    setCookie(c, "fh_next", "signals", { ...cookieOpts, maxAge: 600 });
    return c.redirect("/auth/discord");
  }
  const local = String(u.discordId).startsWith("local:");
  const payload = {
    did: String(u.discordId),
    name: u.globalName ?? u.username,
    avatar: avatarUrl(u.discordId, u.avatarHash),
    role: u.role,
    tier: isStaff(u) ? "staff" : hasMentorRole(u) ? "mentorship" : "premium",
    access: !local || isStaff(u),
    exp: Math.floor(Date.now() / 1e3) + 120
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const pass = `${body}.${createHmac("sha256", CFG.signalsSecret).update(body).digest("base64url")}`;
  return c.redirect(`${SIGNALS_ORIGIN}/?pass=${pass}`);
});
var loginFails = /* @__PURE__ */ new Map();
app.post("/auth/local", async (c) => {
  const origin = c.req.header("origin");
  if (origin && new URL(origin).host !== (c.req.header("host") ?? "")) throw new HttpError(403, "Bad origin");
  const b = await c.req.json().catch(() => ({}));
  const username = String(b.username ?? "").trim().toLowerCase().slice(0, 40), pw = String(b.password ?? "").slice(0, 200);
  const key = `${(c.req.header("x-forwarded-for") ?? "").split(",")[0].trim()}|${username}`, f = loginFails.get(key);
  if (f && f.n >= 5 && f.until > Date.now()) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const [a] = await sql`select "userId", "passwordHash", disabled, "expiresAt" from "LocalAccount" where username = ${username}`;
  if (a && !a.passwordHash) throw new HttpError(403, "Your account is not set up yet. Use the link in your invite email, or ask your coach to resend it.");
  const ok = a ? await Bun.password.verify(pw, a.passwordHash) : (await Bun.password.verify(pw, "$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$RdescudvJCsgt3ub+b+dWRWJTmaaJObG1d6wZq7Xz2E").catch(() => false), false);
  if (!ok) {
    loginFails.set(key, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 15 * 6e4 });
    throw new HttpError(401, "Invalid username or password");
  }
  if (a.disabled || a.expiresAt && new Date(a.expiresAt) < /* @__PURE__ */ new Date()) throw new HttpError(403, "Your access has ended. Ask your coach.");
  loginFails.delete(key);
  await sql`update "User" set "lastLoginAt" = now() where id = ${a.userId}`;
  const jwt = await sign({ uid: a.userId, exp: Math.floor(Date.now() / 1e3) + SESSION_DAYS * 86400 }, CFG.sessionSecret, "HS256");
  setCookie(c, "fh_session", jwt, { ...cookieOpts, maxAge: SESSION_DAYS * 86400 });
  return c.json({ ok: true });
});
var sha = (t) => createHash2("sha256").update(t).digest("hex");
var mailFrom = () => process.env.MAIL_FROM || "FLOWHUB <no-reply@flowmtd.com>";
async function sendMail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: mailFrom(), to: [to], subject, html }) });
    if (!r.ok) console.error("mail", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("mail", e);
    return false;
  }
}
var baseUrl = () => (CFG.publicUrl || "").replace(/\/$/, "");
async function makeToken(userId, kind) {
  const t = randomBytes(32).toString("base64url");
  await sql`delete from "LocalToken" where "userId" = ${userId} and kind = ${kind}`;
  await sql`insert into "LocalToken" (hash, "userId", kind, "expiresAt") values (${sha(t)}, ${userId}, ${kind}, ${new Date(Date.now() + (kind === "invite" ? 48 : 1) * 36e5)})`;
  return t;
}
var mailHtml = (name, kind, link) => `<div style="font-family:Arial,sans-serif;background:#030405;color:#e6ebf2;padding:32px"><div style="max-width:480px;margin:auto"><div style="font-weight:900;font-size:22px;letter-spacing:.02em"><span style="color:#ff6a00">F</span>LOWHUB</div><h2 style="margin:24px 0 8px">${kind === "invite" ? `Welcome, ${name.replace(/[<>&"]/g, "")}` : "Reset your password"}</h2><p style="color:#929fb2;line-height:1.6">${kind === "invite" ? "Your coach has set up your FLOWHUB access. Choose a password to finish setting up your account. This link works once and expires in 48 hours." : "Use the button below to choose a new password. This link works once and expires in 1 hour. If you did not ask for this, you can ignore this email."}</p><p style="margin:24px 0"><a href="${link}" style="background:#ff6a00;color:#160a00;font-weight:700;padding:12px 20px;text-decoration:none;border-radius:8px">${kind === "invite" ? "Set up my account" : "Choose a new password"}</a></p><p style="color:#66717f;font-size:12px;word-break:break-all">${link}</p></div></div>`;
async function inviteMail(userId, name, email, kind) {
  const link = `${baseUrl()}/setup?token=${await makeToken(userId, kind)}`;
  const sent = await sendMail(email, kind === "invite" ? "Set up your FLOWHUB account" : "Reset your FLOWHUB password", mailHtml(name, kind, link));
  return { sent, link };
}
var pageShell = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FLOWHUB</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#030405;color:#e6ebf2;font:15px/1.5 Inter,system-ui,sans-serif}.c{width:min(420px,92vw);padding:28px;border:1px solid #28313e;background:#0a0d12;border-radius:12px}.l{font:900 24px Archivo,Arial Black,sans-serif;letter-spacing:.01em;margin-bottom:18px}.l b{color:#ff6a00}h1{font-size:20px;margin:0 0 6px}p{color:#929fb2;margin:0 0 16px}input{width:100%;box-sizing:border-box;padding:12px;margin:0 0 10px;border:1px solid #28313e;border-radius:8px;background:#05070a;color:#e6ebf2;font:inherit}button{width:100%;padding:12px;border:0;border-radius:8px;background:#ff6a00;color:#160a00;font-weight:700;font-size:15px;cursor:pointer}#e{color:#ff5d73;margin:8px 0 0;min-height:20px}</style></head><body><div class="c"><div class="l"><b>F</b>LOWHUB</div>${body}</div></body></html>`;
app.get("/setup", async (c) => {
  const t = c.req.query("token") ?? "";
  const [row] = await sql`select t.kind, t."expiresAt", t."usedAt", u."globalName" as name from "LocalToken" t join "User" u on u.id = t."userId" where t.hash = ${sha(t)}`;
  if (!row || row.usedAt || new Date(row.expiresAt) < /* @__PURE__ */ new Date()) return c.html(pageShell('<h1>This link has expired</h1><p>Ask your coach to send a new invite, or use \u201CForgot password?\u201D on the sign-in page.</p><p><a href="/" style="color:#8cc4ff">Back to sign in</a></p>'), 410);
  return c.html(pageShell(`<h1>${row.kind === "invite" ? "Set up your account" : "Choose a new password"}</h1><p>Pick a password with at least 8 characters.</p><form id="f"><input id="p" type="password" placeholder="New password" autocomplete="new-password" minlength="8" required><input id="q" type="password" placeholder="Confirm password" autocomplete="new-password" minlength="8" required><button>Continue</button><div id="e"></div></form><script>document.getElementById("f").onsubmit=async function(e){e.preventDefault();var p=document.getElementById("p").value,q=document.getElementById("q").value,er=document.getElementById("e");if(p!==q){er.textContent="Passwords do not match.";return}var r=await fetch("/auth/local/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:${JSON.stringify(t)},password:p})});var j=await r.json().catch(function(){return{}});if(r.ok){location.href="/#home"}else{er.textContent=j.error||"Something went wrong."}}</script>`));
});
app.post("/auth/local/setup", async (c) => {
  const origin = c.req.header("origin");
  if (origin && new URL(origin).host !== (c.req.header("host") ?? "")) throw new HttpError(403, "Bad origin");
  const b = await c.req.json().catch(() => ({}));
  const pw = String(b.password ?? "");
  if (pw.length < 8 || pw.length > 100) throw new HttpError(400, "Password must be 8\u2013100 characters");
  const [t] = await sql`select "userId", "expiresAt", "usedAt" from "LocalToken" where hash = ${sha(String(b.token ?? ""))}`;
  if (!t || t.usedAt || new Date(t.expiresAt) < /* @__PURE__ */ new Date()) throw new HttpError(410, "This link has expired. Ask for a new one.");
  const [a] = await sql`select days, "activatedAt" from "LocalAccount" where "userId" = ${t.userId}`;
  if (!a) throw new HttpError(404, "Account not found");
  const exp = !a.activatedAt && a.days ? new Date(Date.now() + a.days * 864e5) : null;
  await sql`update "LocalAccount" set "passwordHash" = ${await Bun.password.hash(pw)}, "activatedAt" = coalesce("activatedAt", now()), "expiresAt" = coalesce(${exp}, "expiresAt") where "userId" = ${t.userId}`;
  await sql`update "LocalToken" set "usedAt" = now() where "userId" = ${t.userId}`;
  const [acct] = await sql`select disabled, "expiresAt" from "LocalAccount" where "userId" = ${t.userId}`;
  if (acct.disabled) throw new HttpError(403, "Your access has ended. Ask your coach.");
  await sql`update "User" set "lastLoginAt" = now() where id = ${t.userId}`;
  const jwt = await sign({ uid: t.userId, exp: Math.floor(Date.now() / 1e3) + SESSION_DAYS * 86400 }, CFG.sessionSecret, "HS256");
  setCookie(c, "fh_session", jwt, { ...cookieOpts, maxAge: SESSION_DAYS * 86400 });
  return c.json({ ok: true });
});
var forgotHits = /* @__PURE__ */ new Map();
app.post("/auth/local/forgot", async (c) => {
  const origin = c.req.header("origin");
  if (origin && new URL(origin).host !== (c.req.header("host") ?? "")) throw new HttpError(403, "Bad origin");
  const ip = (c.req.header("x-forwarded-for") ?? "").split(",")[0].trim(), hits = (forgotHits.get(ip) ?? []).filter((x) => x > Date.now() - 36e5);
  if (hits.length >= 5) throw new HttpError(429, "Too many requests. Try again later.");
  forgotHits.set(ip, [...hits, Date.now()]);
  const email = String((await c.req.json().catch(() => ({}))).email ?? "").trim().toLowerCase().slice(0, 120);
  const [a] = await sql`select a."userId", a.email, a.disabled, a."expiresAt", a."passwordHash", u."globalName" as name from "LocalAccount" a join "User" u on u.id = a."userId" where lower(a.email) = ${email}`;
  if (a && a.email && !a.disabled && !(a.expiresAt && new Date(a.expiresAt) < /* @__PURE__ */ new Date())) await inviteMail(a.userId, a.name ?? "", a.email, a.passwordHash ? "reset" : "invite");
  return c.json({ ok: true });
});
app.use("/api/*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const origin = c.req.header("origin");
    const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
    if (!origin || new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
  }
  const user = await currentUser(c);
  if (!user) throw new HttpError(401, "Sign in with Discord");
  c.set("user", user);
  await next();
});
var staffOnly = (c) => {
  if (!isStaff(c.get("user"))) throw new HttpError(403, "Coach or Admin role required");
};
app.get("/api/dashboard", async (c) => c.json(await loadDashboard(c.get("user"), c.get("user").id)));
app.get("/api/winrate", async (c) => c.json(await signalsWeekly()));
app.get("/api/catalog", async (c) => c.json(await loadCatalog()));
var WEBHOOK_RE = /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
async function storedWebhook() {
  const [r] = await sql`select value from "AppSetting" where key = 'winrate_webhook'`;
  try {
    return r ? decrypt(r.value) : "";
  } catch {
    return "";
  }
}
var adminOnly = (c) => {
  if (c.get("user").role !== "ADMIN") throw new HttpError(403, "Admin role required");
};
app.put("/api/winrate/discord", async (c) => {
  adminOnly(c);
  const url = String((await c.req.json().catch(() => ({}))).url ?? "").trim();
  if (!WEBHOOK_RE.test(url)) throw new HttpError(400, "That doesn't look like a Discord webhook URL. It starts with https://discord.com/api/webhooks/");
  await sql`insert into "AppSetting" (key, value) values ('winrate_webhook', ${encrypt(url)}) on conflict (key) do update set value = excluded.value, "updatedAt" = now()`;
  await audit(c.get("user").id, "winrate.webhook.set");
  return c.json({ ok: true, message: "Discord channel connected." });
});
app.post("/api/winrate/share", async (c) => {
  adminOnly(c);
  const u = c.get("user");
  const w = (await signalsWeekly()).current;
  if (!(w.wins + w.losses)) throw new HttpError(400, "No results entered this week yet");
  const content = shareText(w);
  const hook = env.WINRATE_DISCORD_WEBHOOK_URL || await storedWebhook(), chan = env.WINRATE_CHANNEL_ID;
  if (!hook && !(CFG.botToken && chan)) throw new HttpError(409, "NOT_CONNECTED");
  const body = JSON.stringify({ content, allowed_mentions: { parse: [] } });
  const res = hook ? await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(15e3) }) : await fetch(`${DISCORD}/channels/${chan}/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bot ${CFG.botToken}` }, body, signal: AbortSignal.timeout(15e3) });
  if (!res.ok) {
    console.error("winrate share", res.status, await res.text().catch(() => ""));
    throw new HttpError(502, "Discord didn't accept the post. Paste a fresh webhook URL and try again.");
  }
  await audit(u.id, "winrate.share", null, { week: w.weekStart });
  return c.json({ ok: true, message: "Posted to Discord." });
});
app.put("/api/roadmap", async (c) => {
  const u = c.get("user");
  const d = roadmapSchema.parse(await c.req.json());
  await sql`
    insert into "Roadmap" (id, "userId", "monthlyIncomeGoal", "tradingDaysPerWeek", "strategyMode", "multiSession", strategies, "avgRR", "tradesPerDay", "primaryInstrument", "avgStopPoints")
    values (${randomUUID()}, ${u.id}, ${d.monthlyIncomeGoal}, ${d.tradingDaysPerWeek}, ${d.strategyMode}::"StrategyMode", ${d.multiSession}, ${pgArray(d.strategies)}::text[],
            ${d.avgRR}, ${d.tradesPerDay}, ${d.primaryInstrument}::"Instrument", ${d.avgStopPoints})
    on conflict ("userId") do update set "monthlyIncomeGoal" = excluded."monthlyIncomeGoal", "tradingDaysPerWeek" = excluded."tradingDaysPerWeek",
      "strategyMode" = excluded."strategyMode", "multiSession" = excluded."multiSession", strategies = excluded.strategies, "avgRR" = excluded."avgRR",
      "tradesPerDay" = excluded."tradesPerDay", "primaryInstrument" = excluded."primaryInstrument", "avgStopPoints" = excluded."avgStopPoints", "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.post("/api/accounts", async (c) => {
  const u = c.get("user");
  const d = accountInput.parse(await c.req.json());
  const [t] = await sql`select t.*, f.name as firm from "AccountTemplate" t join "PropFirm" f on f.id = t."firmId" where t.id = ${d.templateId} and t."isActive"`;
  if (!t) throw new HttpError(400, "Unknown account");
  const snapshot = {
    firm: t.firm,
    planName: t.planName,
    accountSize: t.accountSize,
    profitTarget: t.profitTarget,
    maxLoss: t.maxLoss,
    drawdownModel: t.drawdownModel,
    drawdownNote: t.drawdownNote,
    dailyLossLimit: t.dailyLossLimit,
    dailyLossNote: t.dailyLossNote,
    consistencyPct: t.consistencyPct,
    consistencyNote: t.consistencyNote,
    minDays: t.minDays,
    maxMinis: t.maxMinis,
    maxMicros: t.maxMicros,
    profitSplit: t.profitSplit,
    notes: t.notes,
    sourceUrl: t.sourceUrl,
    dataStatus: t.dataStatus
  };
  const id = randomUUID();
  await sql`insert into "MemberAccount" (id, "userId", "templateId", nickname, stage, "startDate", quantity, "targetPassDays", "riskPerTradeOverride", "dailyLossLimitOverride", "ruleSnapshot")
            values (${id}, ${u.id}, ${t.id}, ${d.nickname ?? null}, ${d.stage}::"AccountStage", ${d.startDate}::date, ${d.quantity}, ${d.targetPassDays ?? null},
                    ${d.riskPerTradeOverride ?? null}, ${d.dailyLossLimitOverride ?? null}, ${JSON.stringify(snapshot)}::jsonb)`;
  return c.json({ id });
});
async function ownAccount(c) {
  const [a] = await sql`select id from "MemberAccount" where id = ${c.req.param("id")} and "userId" = ${c.get("user").id}`;
  if (!a) throw new HttpError(404, "Not found");
  return a.id;
}
app.patch("/api/accounts/:id", async (c) => {
  const id = await ownAccount(c);
  const d = accountPatch.parse(await c.req.json());
  await patchRow("MemberAccount", id, d, { stage: "AccountStage", startDate: "date" });
  return c.json({ ok: true });
});
app.delete("/api/accounts/:id", async (c) => {
  const id = await ownAccount(c);
  await sql`delete from "MemberAccount" where id = ${id}`;
  return c.json({ ok: true });
});
async function checkOwnAccount(userId, accountId) {
  if (!accountId) return;
  const [a] = await sql`select id from "MemberAccount" where id = ${accountId} and "userId" = ${userId}`;
  if (!a) throw new HttpError(400, "Unknown account");
}
app.post("/api/journal", async (c) => {
  const u = c.get("user");
  const d = journalInput.parse(await c.req.json());
  await checkOwnAccount(u.id, d.memberAccountId);
  const id = randomUUID();
  await sql`insert into "JournalEntry" (id, "userId", "memberAccountId", "tradeDate", ticker, direction, "setupType", contracts, "riskPct", "riskDollars",
              "rrPlanned", "rrRealized", outcome, pnl, emotion, "followedPlan", "screenshotUrl", notes)
            values (${id}, ${u.id}, ${d.memberAccountId ?? null}, ${d.tradeDate}::date, ${d.ticker}, ${d.direction}::"Direction", ${d.setupType},
              ${d.contracts ?? null}, ${d.riskPct ?? null}, ${d.riskDollars ?? null}, ${d.rrPlanned ?? null}, ${d.rrRealized ?? null},
              ${d.outcome}::"Outcome", ${d.pnl}, ${d.emotion}::"Emotion", ${d.followedPlan}, ${d.screenshotUrl ?? null}, ${d.notes ?? null})`;
  return c.json({ id });
});
async function ownEntry(c) {
  const [e] = await sql`select id from "JournalEntry" where id = ${c.req.param("id")} and "userId" = ${c.get("user").id}`;
  if (!e) throw new HttpError(404, "Not found");
  return e.id;
}
app.patch("/api/journal/:id", async (c) => {
  const id = await ownEntry(c);
  const d = journalPatch.parse(await c.req.json());
  await checkOwnAccount(c.get("user").id, d.memberAccountId);
  await patchRow("JournalEntry", id, d, { tradeDate: "date", direction: "Direction", outcome: "Outcome", emotion: "Emotion" });
  return c.json({ ok: true });
});
app.delete("/api/journal/:id", async (c) => {
  const id = await ownEntry(c);
  await sql`delete from "JournalEntry" where id = ${id}`;
  return c.json({ ok: true });
});
var LOG_KINDS = /* @__PURE__ */ new Set(["checklist", "review"]);
app.get("/api/log", async (c) => {
  const rows = await sql`select kind, day::text as day, data from "MemberLog" where "userId" = ${c.get("user").id} and day >= (current_date - 120) order by day desc`;
  return c.json(rows.map((r) => ({ kind: r.kind, day: r.day, data: typeof r.data === "string" ? JSON.parse(r.data) : r.data })));
});
app.put("/api/log", async (c) => {
  const b = await c.req.json();
  if (!b.kind || !LOG_KINDS.has(b.kind) || !b.day || !/^\d{4}-\d{2}-\d{2}$/.test(b.day)) throw new HttpError(400, "Bad entry");
  const json = JSON.stringify(b.data ?? {});
  if (json.length > 4e3) throw new HttpError(400, "Too long");
  await sql`insert into "MemberLog" (id, "userId", kind, day, data) values (${randomUUID()}, ${c.get("user").id}, ${b.kind}, ${b.day}::date, ${json}::jsonb)
            on conflict ("userId", kind, day) do update set data = excluded.data, "updatedAt" = now()`;
  return c.json({ ok: true });
});
var PRACTICE_MODEL_SET = new Set(PRACTICE_MODELS);
app.get("/api/practice", async (c) => {
  const uid = c.get("user").id;
  const [[st], reps] = await Promise.all([
    sql`select state from "PracticeState" where "userId" = ${uid}`,
    sql`select model, drill, ok, tags, "createdAt" from "PracticeRep" where "userId" = ${uid} and "createdAt" > now() - interval '120 days' order by "createdAt" desc limit 1500`
  ]);
  const state = st ? typeof st.state === "string" ? JSON.parse(st.state) : st.state : null;
  return c.json({ state, reps: reps.reverse().map((r) => ({ t: new Date(r.createdAt).getTime(), m: r.model, d: r.drill, ok: r.ok, tags: r.tags ?? [] })) });
});
app.post("/api/practice/rep", async (c) => {
  const b = await c.req.json();
  if (!b.m || !PRACTICE_MODEL_SET.has(b.m) || !b.d || !/^[a-z]{2,20}$/.test(b.d) || typeof b.ok !== "boolean") throw new HttpError(400, "Bad rep");
  const tags = Array.isArray(b.tags) ? b.tags.filter((t) => typeof t === "string" && /^[a-z0-9-]{2,30}$/.test(t)).slice(0, 6) : [];
  const xp = Math.max(0, Math.min(200, Math.round(Number(b.xp) || 0)));
  await sql`insert into "PracticeRep" (id, "userId", model, drill, ok, tags, xp) values (${randomUUID()}, ${c.get("user").id}, ${b.m}, ${b.d}, ${b.ok}, ${pgArray(tags)}::text[], ${xp})`;
  return c.json({ ok: true });
});
app.put("/api/practice/state", async (c) => {
  const json = JSON.stringify(await c.req.json() ?? {});
  if (json.length > 8e3) throw new HttpError(400, "Too long");
  await sql`insert into "PracticeState" ("userId", state) values (${c.get("user").id}, ${json}::jsonb)
            on conflict ("userId") do update set state = excluded.state, "updatedAt" = now()`;
  return c.json({ ok: true });
});
var SCHOOL_MODULE_SET = new Set(SCHOOL_MODULE_IDS);
var ID_RE = /^[a-z0-9-]{1,20}$/;
var clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
function cleanSchoolState(b) {
  const o = b && typeof b === "object" ? b : {};
  const out = {};
  if (o.v2 && typeof o.v2 === "object") {
    const m = {};
    for (const [k, v] of Object.entries(o.v2.m && typeof o.v2.m === "object" ? o.v2.m : {}).slice(0, 40)) {
      if (!SCHOOL_MODULE_SET.has(k) || !v || typeof v !== "object") continue;
      const s = String(v.s ?? "000");
      m[k] = { s: /^[01]{3,4}$/.test(s) ? s.slice(0, 3) : "000", p: v.p ? 1 : 0, t: v.t ? 1 : 0, sc: clampInt(v.sc, 0, 100), a: clampInt(v.a, 1, 999), n: clampInt(v.n, 0, 999), at: Math.max(0, Number(v.at) || 0) };
    }
    out.v2 = { m };
  }
  if (Array.isArray(o.ch)) out.ch = o.ch.filter((x) => typeof x === "string" && ID_RE.test(x)).slice(0, 60);
  if (o.dives && typeof o.dives === "object") {
    const dives = {};
    for (const [k, v] of Object.entries(o.dives).slice(0, 60)) {
      if (!ID_RE.test(k) || !v || typeof v !== "object") continue;
      dives[k] = Object.fromEntries(Object.keys(v).filter((x) => ID_RE.test(x)).slice(0, 30).map((x) => [x, 1]));
    }
    out.dives = dives;
  }
  const best = (m) => {
    const res = {};
    for (const [k, v] of Object.entries(m && typeof m === "object" ? m : {}).slice(0, 40)) {
      if (!ID_RE.test(k) || !v || typeof v !== "object") continue;
      res[k] = { best: Math.max(0, Math.min(1, Number(v.best) || 0)), pass: v.pass === true, n: Math.max(0, Math.min(1e4, Math.round(Number(v.n) || 0))), at: Math.max(0, Number(v.at) || 0) };
    }
    return res;
  };
  if (o.ck && typeof o.ck === "object") out.ck = best(o.ck);
  if (o.ex && typeof o.ex === "object") out.ex = best(o.ex);
  return out;
}
app.get("/api/school", async (c) => {
  const u = c.get("user");
  const [[row], [pace], [acct], [path], proofRows] = await Promise.all([
    sql`select state, unlocks from "SchoolProgress" where "userId" = ${u.id}`,
    sql`select "perWeek", preset, baseline, "startedAt", emails from "SchoolPace" where "userId" = ${u.id} and track = 'fundamentals'`,
    sql`select email from "LocalAccount" where "userId" = ${u.id} and email is not null and not disabled`,
    sql`select modes, answers, "committedAt", "lockedAt" from "SchoolPath" where "userId" = ${u.id}`,
    sql`select ref, score, total, pass, "createdAt" from "SchoolAttempt" where "userId" = ${u.id} and kind = 'po'`
  ]);
  const js = (v) => typeof v === "string" ? JSON.parse(v) : v;
  const proofs = {};
  for (const r of proofRows) proofs[r.ref] = { pass: !!r.pass, sc: Math.round(r.score / r.total * 100), at: new Date(r.createdAt).getTime() };
  return c.json({
    state: row ? js(row.state) : null,
    unlocks: isStaff(u) ? ["all"] : row?.unlocks ?? [],
    staff: isStaff(u),
    name: u.globalName ?? u.username,
    pace: pace ? { perWeek: Number(pace.perWeek), preset: pace.preset, baseline: pace.baseline, startedAt: new Date(pace.startedAt).toISOString(), emails: pace.emails } : null,
    hasEmail: !!acct,
    path: path ? { modes: js(path.modes), answers: js(path.answers), committedAt: new Date(path.committedAt).toISOString(), locked: !!path.lockedAt } : null,
    proofs
  });
});
app.put("/api/school", async (c) => {
  const clean = cleanSchoolState(await c.req.json());
  const mods = clean.v2?.m;
  if (mods && Object.values(mods).some((x) => x.p === 1 || x.t === 1)) {
    const rows = await sql`select distinct ref, kind from "SchoolAttempt" where "userId" = ${c.get("user").id} and kind in ('ex', 'po') and pass = true`;
    const ex = new Set(rows.filter((r) => r.kind === "ex").map((r) => r.ref)), po = new Set(rows.filter((r) => r.kind === "po").map((r) => r.ref));
    for (const [id, x] of Object.entries(mods)) {
      if (x.t === 1 && !(po.has(id) && isProvable(id))) x.t = 0;
      if (x.p === 1 && !(ex.has(id) || x.t === 1)) {
        x.p = 0;
        x.sc = 0;
      }
    }
  }
  const json = JSON.stringify(clean);
  if (json.length > 2e4) throw new HttpError(400, "Too long");
  await sql`insert into "SchoolProgress" ("userId", state) values (${c.get("user").id}, ${json}::jsonb)
            on conflict ("userId") do update set state = coalesce("SchoolProgress".state, '{}'::jsonb) || excluded.state, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.post("/api/school/attempt", async (c) => {
  const b = await c.req.json();
  const score = Math.round(Number(b.score)), total = Math.round(Number(b.total));
  if (b.kind !== "ck" && b.kind !== "ex" && b.kind !== "po" || !b.ref || !ID_RE.test(b.ref) || !(total > 0 && total <= 50) || !(score >= 0 && score <= total) || typeof b.pass !== "boolean")
    throw new HttpError(400, "Bad attempt");
  const u = c.get("user"), secs = Math.max(0, Math.min(7200, Math.round(Number(b.secs) || 0)));
  if (b.kind === "ex" && b.pass && SCHOOL_MODULE_SET.has(b.ref) && score < Math.ceil(total * 0.8 - 1e-9)) throw new HttpError(400, "Bad attempt");
  if (b.kind === "po") {
    if (!isProvable(b.ref)) throw new HttpError(400, "This module cannot be tested out");
    if (b.pass && score < proofNeeded(total)) throw new HttpError(400, "Bad attempt");
    const [path] = await sql`select modes from "SchoolPath" where "userId" = ${u.id}`;
    const modes = path ? typeof path.modes === "string" ? JSON.parse(path.modes) : path.modes : {};
    if (modes[b.ref] !== "prove") throw new HttpError(403, "This module is not on your prove-it list");
    try {
      await sql`insert into "SchoolAttempt" (id, "userId", kind, ref, score, total, pass, secs) values (${randomUUID()}, ${u.id}, 'po', ${b.ref}, ${score}, ${total}, ${b.pass}, ${secs || null})`;
    } catch (e) {
      if (e.code === "23505") throw new HttpError(409, "You have already used your proof attempt for this module");
      throw e;
    }
    await sql`update "SchoolPath" set "lockedAt" = coalesce("lockedAt", now()), "updatedAt" = now() where "userId" = ${u.id}`;
    return c.json({ ok: true });
  }
  await sql`insert into "SchoolAttempt" (id, "userId", kind, ref, score, total, pass) values (${randomUUID()}, ${u.id}, ${b.kind}, ${b.ref}, ${score}, ${total}, ${b.pass})`;
  return c.json({ ok: true });
});
app.put("/api/school/path", async (c) => {
  const u = c.get("user"), b = await c.req.json().catch(() => ({}));
  const [old] = await sql`select "lockedAt" from "SchoolPath" where "userId" = ${u.id}`;
  if (old?.lockedAt) throw new HttpError(403, "Your path is locked because you have started proof exams. Ask a coach to reset it.");
  const [sp] = await sql`select state from "SchoolProgress" where "userId" = ${u.id}`;
  const st = sp?.state ? typeof sp.state === "string" ? JSON.parse(sp.state) : sp.state : null;
  const passed = new Set(Object.entries(st?.v2?.m ?? {}).filter(([, v]) => v?.p === 1).map(([k]) => k));
  const used = new Set((await sql`select ref from "SchoolAttempt" where "userId" = ${u.id} and kind = 'po'`).map((r) => r.ref));
  const modes = cleanModes(b.modes, passed, used), answers = cleanAnswers(b.answers);
  await sql`insert into "SchoolPath" ("userId", modes, answers) values (${u.id}, ${JSON.stringify(modes)}::jsonb, ${JSON.stringify(answers)}::jsonb)
            on conflict ("userId") do update set modes = excluded.modes, answers = excluded.answers, "updatedAt" = now()`;
  return c.json({ path: { modes, answers, committedAt: (/* @__PURE__ */ new Date()).toISOString(), locked: false } });
});
app.get("/api/coach/paths", async (c) => {
  staffOnly(c);
  const rows = await sql`select u.id, coalesce(u."globalName", u.username) as name, p.modes, p.answers, p."committedAt", p."lockedAt", sp.state
    from "SchoolPath" p join "User" u on u.id = p."userId" left join "SchoolProgress" sp on sp."userId" = u.id order by p."committedAt" desc limit 500`;
  const att = await sql`select "userId", ref, score, total, pass, secs, "createdAt" from "SchoolAttempt" where kind = 'po' and "userId" = any(${pgArray(rows.map((r) => r.id))}::text[])`;
  const [{ n: unbuilt }] = await sql`select count(*)::int as n from "SchoolProgress" sp join "User" u on u.id = sp."userId" where u."isGuildMember" and not exists (select 1 from "SchoolPath" p where p."userId" = sp."userId")`;
  const js = (v) => typeof v === "string" ? JSON.parse(v) : v;
  const out = rows.map((r) => {
    const modes = js(r.modes), ans = js(r.answers), mine = att.filter((a) => a.userId === r.id);
    const st = r.state ? js(r.state) : null, ms = st?.v2?.m ?? {};
    const tested = Object.values(ms).filter((x) => x.p === 1 && x.t === 1).length;
    const passedAll = Object.values(ms).filter((x) => x.p === 1).length;
    const last = mine.length ? new Date(Math.max(...mine.map((a) => new Date(a.createdAt).getTime()))).toISOString() : null;
    return {
      id: r.id,
      name: r.name,
      start: ans.start ?? "",
      prop: ans.prop ?? "",
      committedAt: new Date(r.committedAt).toISOString(),
      locked: !!r.lockedAt,
      prove: Object.values(modes).filter((m) => m === "prove").length,
      learn: Object.values(modes).filter((m) => m === "learn").length,
      proofPassed: mine.filter((a) => a.pass).length,
      proofFailed: mine.filter((a) => !a.pass).length,
      tested,
      passed: passedAll,
      total: SCHOOL_MODULES.length,
      fast: mine.filter((a) => a.pass && proofFast(Number(a.secs) || 0, a.total)).length,
      lastProofAt: last
    };
  });
  return c.json({ rows: out, unbuilt });
});
app.post("/api/coach/path/:id/reset", async (c) => {
  staffOnly(c);
  await sql`delete from "SchoolPath" where "userId" = ${c.req.param("id")}`;
  return c.json({ ok: true });
});
var SETS = { fundamentals: SCHOOL_MODULE_SET, invertix: new Set(INVERTIX_MODULE_IDS), exo: new Set(EXO_MODULE_IDS) };
var passedIn2 = (state, track = "fundamentals") => passedIn(state, SETS[track]);
async function trackState(userId, track) {
  const [r] = track === "fundamentals" ? await sql`select state from "SchoolProgress" where "userId" = ${userId}` : track === "invertix" ? await sql`select state from "TrackProgress" where "userId" = ${userId} and track = 'invertix'` : await sql`select state from "VaultAccess" where "userId" = ${userId}`;
  return r?.state ?? null;
}
var trackOf = (v) => isTrack(v) ? v : "fundamentals";
var paceOut = (p) => ({ perWeek: Number(p.perWeek), preset: p.preset ?? null, baseline: p.baseline, startedAt: new Date(p.startedAt).toISOString(), emails: !!p.emails });
app.put("/api/school/pace", async (c) => {
  const u = c.get("user"), b = await c.req.json().catch(() => ({}));
  const track = trackOf(b.track);
  const [old] = await sql`select "perWeek" from "SchoolPace" where "userId" = ${u.id} and track = ${track}`;
  if (b.perWeek == null && !old) throw new HttpError(400, "Pick a pace");
  const perWeek = b.perWeek == null ? Number(old.perWeek) : clampPace(b.perWeek);
  const preset = typeof b.preset === "string" && /^[a-z]{3,10}$/.test(b.preset) ? b.preset : "custom";
  const emails = b.emails !== false;
  const baseline = passedIn2(await trackState(u.id, track), track);
  const [row] = !old || Number(old.perWeek) !== perWeek ? await sql`insert into "SchoolPace" ("userId", track, "perWeek", preset, baseline, emails) values (${u.id}, ${track}, ${perWeek}, ${preset}, ${baseline}, ${emails})
        on conflict ("userId", track) do update set "perWeek" = excluded."perWeek", preset = excluded.preset, baseline = excluded.baseline, "startedAt" = now(), "setAt" = now(), changes = "SchoolPace".changes + 1, emails = excluded.emails, "nudgeStreak" = 0
        returning "perWeek", preset, baseline, "startedAt", emails` : await sql`update "SchoolPace" set emails = ${emails} where "userId" = ${u.id} and track = ${track} returning "perWeek", preset, baseline, "startedAt", emails`;
  return c.json({ pace: paceOut(row) });
});
async function paceFor(userId, track) {
  const [[pace], [acct]] = await Promise.all([
    sql`select "perWeek", preset, baseline, "startedAt", emails from "SchoolPace" where "userId" = ${userId} and track = ${track}`,
    sql`select email from "LocalAccount" where "userId" = ${userId} and email is not null and not disabled`
  ]);
  return { pace: pace ? paceOut(pace) : null, hasEmail: !!acct };
}
var unsubSig = (id) => createHmac("sha256", CFG.sessionSecret).update("pace-unsub:" + id).digest("hex").slice(0, 32);
app.get("/unsub/pace", async (c) => {
  const id = c.req.query("u") ?? "", t = c.req.query("t") ?? "";
  if (!id || t !== unsubSig(id)) return c.html(pageShell("<h1>That link did not work</h1><p>You can turn reminders off any time from \u201CYour pace\u201D inside the Trading School.</p>"), 400);
  await sql`update "SchoolPace" set emails = false where "userId" = ${id}`;
  return c.html(pageShell('<h1>Reminders are off</h1><p>You will not get pace reminder emails any more. You can turn them back on from \u201CYour pace\u201D in the Trading School.</p><p><a href="/school" style="color:#8cc4ff">Back to the school</a></p>'));
});
app.get("/api/coach/pace", async (c) => {
  staffOnly(c);
  const now = /* @__PURE__ */ new Date();
  const rows = await sql`select u.id, coalesce(u."globalName", u.username) as name, p.track, p."perWeek", p.preset, p.baseline, p."startedAt", p."setAt", p.changes, p.emails, p."lastNudgeAt", p."nudgeCount",
      sp.state as fstate, sp."updatedAt" as factive, tp.state as istate, tp."updatedAt" as iactive, v.state as xstate, v."updatedAt" as xactive, (a.email is not null and not a.disabled) as "hasEmail"
    from "SchoolPace" p join "User" u on u.id = p."userId" left join "SchoolProgress" sp on sp."userId" = u.id
      left join "TrackProgress" tp on tp."userId" = u.id and tp.track = 'invertix' left join "VaultAccess" v on v."userId" = u.id left join "LocalAccount" a on a."userId" = u.id order by p."setAt" desc limit 500`;
  const [{ n: unset }] = await sql`select count(*)::int as n from "SchoolProgress" sp join "User" u on u.id = sp."userId" where u."isGuildMember" and not exists (select 1 from "SchoolPace" p where p."userId" = sp."userId" and p.track = 'fundamentals')`;
  const out = rows.map((r) => {
    const track = trackOf(r.track), total = trackTotal(track), state = track === "fundamentals" ? r.fstate : track === "invertix" ? r.istate : r.xstate, active = track === "fundamentals" ? r.factive : track === "invertix" ? r.iactive : r.xactive;
    const passed = passedIn2(state, track), perWeek = Number(r.perWeek), exp = expectedPassed(r.baseline, perWeek, new Date(r.startedAt), now, total);
    const left = total - passed, fin = passed >= total ? null : new Date(now.getTime() + left / perWeek * 7 * 864e5).toISOString();
    const act = active ? new Date(active).toISOString() : null;
    return {
      id: r.id,
      track,
      name: r.name,
      perWeek,
      preset: r.preset,
      passed,
      total,
      expected: exp,
      status: paceStatus(passed, exp, total),
      finish: fin,
      lastActive: act,
      setAt: new Date(r.setAt).toISOString(),
      changes: r.changes,
      emails: !!r.emails,
      hasEmail: !!r.hasEmail,
      nudges: r.nudgeCount,
      lastNudgeAt: r.lastNudgeAt ? new Date(r.lastNudgeAt).toISOString() : null
    };
  });
  return c.json({ rows: out, unset });
});
app.post("/api/coach/pace/:id", async (c) => {
  staffOnly(c);
  const id = c.req.param("id"), b = await c.req.json().catch(() => ({}));
  const track = trackOf(b.track);
  if (b.reset) {
    await sql`delete from "SchoolPace" where "userId" = ${id} and track = ${track}`;
    return c.json({ ok: true });
  }
  const perWeek = clampPace(b.perWeek);
  const [row] = await sql`update "SchoolPace" set "perWeek" = ${perWeek}, preset = 'custom', baseline = ${passedIn2(await trackState(id, track), track)}, "startedAt" = now(), "setAt" = now(), changes = changes + 1, "nudgeStreak" = 0 where "userId" = ${id} and track = ${track} returning "userId"`;
  if (!row) throw new HttpError(404, "This member has not set a pace yet");
  return c.json({ ok: true });
});
var NUDGE_FROM_UTC = 14;
var NUDGE_TO_UTC = 23;
var firstName = (n2) => (n2.trim().split(/\s+/)[0] || "there").replace(/[<>&"]/g, "");
var nudgeHtml = (name, passed, total, next, behind, perWeek, unsub, track = "fundamentals") => `<div style="font-family:Arial,sans-serif;background:#030405;color:#e6ebf2;padding:32px"><div style="max-width:480px;margin:auto"><div style="font-weight:900;font-size:22px;letter-spacing:.02em"><span style="color:#ff6a00">F</span>LOWHUB</div><h2 style="margin:24px 0 8px">Next up, ${firstName(name)}: Module ${next.n}</h2><p style="color:#929fb2;line-height:1.6;margin:0 0 6px"><b style="color:#e6ebf2">${next.title.replace(/[<>&"]/g, "")}</b></p><p style="color:#929fb2;line-height:1.6">You have passed ${passed} of ${total} modules.${behind ? ` You set a pace of ${perWeek} a week, and one short session gets you back on it.` : " One short session keeps your streak going."}</p><p style="margin:24px 0"><a href="${baseUrl()}${TRACK_URL[track]}" style="background:#ff6a00;color:#160a00;font-weight:700;padding:12px 20px;text-decoration:none;border-radius:8px">Continue ${TRACK_NAME[track]}</a></p><p style="color:#66717f;font-size:12px">Too many emails? <a href="${unsub}" style="color:#8cc4ff">Turn reminders off</a>. You can change your pace any time inside the school.</p></div></div>`;
async function runPaceNudges(now = /* @__PURE__ */ new Date()) {
  const h = now.getUTCHours();
  if (h < NUDGE_FROM_UTC || h >= NUDGE_TO_UTC || !process.env.RESEND_API_KEY) return 0;
  const rows = await sql`select p."userId", p.track, p."perWeek", p.baseline, p."startedAt", p."lastNudgeAt", p."nudgeStreak", u."globalName" as name, a.email,
      sp.state as fstate, sp."updatedAt" as factive, tp.state as istate, tp."updatedAt" as iactive, v.state as xstate, v."updatedAt" as xactive
    from "SchoolPace" p join "User" u on u.id = p."userId" join "LocalAccount" a on a."userId" = p."userId" and a.email is not null and not a.disabled and (a."expiresAt" is null or a."expiresAt" > now())
    left join "SchoolProgress" sp on sp."userId" = p."userId" left join "TrackProgress" tp on tp."userId" = p."userId" and tp.track = 'invertix' left join "VaultAccess" v on v."userId" = p."userId"
    where p.emails and u.role = 'MEMBER'::"Role" limit 1000`;
  let sent = 0;
  for (const r of rows) {
    const track = trackOf(r.track), total = trackTotal(track), state = track === "fundamentals" ? r.fstate : track === "invertix" ? r.istate : r.xstate, activeAt = track === "fundamentals" ? r.factive : track === "invertix" ? r.iactive : r.xactive;
    const passed = passedIn2(state, track);
    if (passed >= total) continue;
    const perWeek = Number(r.perWeek), exp = expectedPassed(r.baseline, perWeek, new Date(r.startedAt), now, total);
    if (paceStatus(passed, exp, total) === "ahead") continue;
    const act = activeAt ? new Date(activeAt) : null, last = r.lastNudgeAt ? new Date(r.lastNudgeAt) : null;
    const streak = act && last && act > last ? 0 : r.nudgeStreak;
    if (streak >= PACE_MAX_NUDGES) continue;
    const quietSince = Math.max(new Date(r.startedAt).getTime(), act?.getTime() ?? 0, last?.getTime() ?? 0);
    if (now.getTime() - quietSince < nudgeGapDays(perWeek) * 864e5) continue;
    const [claim] = await sql`update "SchoolPace" set "lastNudgeAt" = now(), "nudgeCount" = "nudgeCount" + 1, "nudgeStreak" = ${streak + 1}
      where "userId" = ${r.userId} and track = ${track} and ("lastNudgeAt" is null or "lastNudgeAt" < now() - interval '20 hours') returning "userId"`;
    if (!claim) continue;
    const nextDef = nextModule(track, state);
    const behind = paceStatus(passed, exp, total) === "behind";
    const unsub = `${baseUrl()}/unsub/pace?u=${encodeURIComponent(r.userId)}&t=${unsubSig(r.userId)}`;
    const ok = await sendMail(r.email, `Next up in ${TRACK_NAME[track]}: ${nextDef.title}`, nudgeHtml(r.name ?? "", passed, total, { n: nextDef.n, title: nextDef.title }, behind, perWeek, unsub, track));
    if (ok) sent++;
    else await sql`update "SchoolPace" set "nudgeCount" = greatest("nudgeCount" - 1, 0), "nudgeStreak" = ${streak}, "lastNudgeAt" = ${last} where "userId" = ${r.userId} and track = ${track}`;
  }
  return sent;
}
setTimeout(() => runPaceNudges().catch((e) => console.error("pace nudges", e)), 12e4);
setInterval(() => runPaceNudges().catch((e) => console.error("pace nudges", e)), 36e5);
var etParts = (d = /* @__PURE__ */ new Date()) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, h: +p.hour, m: +p.minute, dow: p.weekday };
};
var feedInstant = (label) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(label ?? ""));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0))) : null;
};
var gexHealth = { lastTry: null, lastError: null, lastOk: null };
async function fetchGexChain() {
  const r = await fetch("https://cdn.cboe.com/api/global/delayed_quotes/options/_NDX.json", { headers: { "User-Agent": "Mozilla/5.0 (compatible; FLOWHUB/1.0)", Accept: "application/json" }, signal: AbortSignal.timeout(45e3) });
  if (!r.ok) throw new Error(`CBOE answered ${r.status}`);
  const j = await r.json();
  const d = j.data;
  if (!d?.options?.length || !(Number(d.current_price) > 0)) throw new Error("CBOE sent no options chain");
  return { spot: Number(d.current_price), label: String(j.timestamp ?? d.last_trade_time ?? ""), options: d.options.map((o) => ({ sym: o.option, oi: Number(o.open_interest), iv: o.iv, gamma: o.gamma })) };
}
async function runGex() {
  gexHealth.lastTry = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const now = /* @__PURE__ */ new Date(), today = etParts(now).ymd, f = await fetchGexChain();
    const res = computeGex(f.options, f.spot, now);
    if (!res) throw new Error("Not enough option data to work out levels");
    const feedAt = feedInstant(f.label);
    await sql`insert into "GexDaily" (day, symbol, levels, "feedLabel", "feedAt") values (${today}, 'NDX', ${JSON.stringify(res)}::jsonb, ${f.label}, ${feedAt})
              on conflict (day, symbol) do update set levels = excluded.levels, "feedLabel" = excluded."feedLabel", "feedAt" = excluded."feedAt", "fetchedAt" = now()`;
    gexHealth.lastOk = (/* @__PURE__ */ new Date()).toISOString();
    gexHealth.lastError = null;
    return { ok: true, message: `Saved levels for ${today} (feed ${f.label})` };
  } catch (e) {
    gexHealth.lastError = e.message;
    console.error("gex", e);
    return { ok: false, message: e.message };
  }
}
var gexBusy = false;
async function gexTick() {
  const e = etParts();
  if (gexBusy) return;
  const inWindow = !(e.dow === "Sat" || e.dow === "Sun" || e.h < 8 || e.h === 8 && e.m < 30 || e.h >= 11);
  const [any] = await sql`select 1 as x from "GexDaily" where symbol = 'NDX' limit 1`;
  if (!inWindow && any) return;
  const [have] = await sql`select 1 as x from "GexDaily" where day = ${e.ymd} and symbol = 'NDX'`;
  if (have) return;
  if (gexHealth.lastTry && Date.now() - Date.parse(gexHealth.lastTry) < 10 * 6e4) return;
  gexBusy = true;
  try {
    await runGex();
  } finally {
    gexBusy = false;
  }
}
setInterval(() => gexTick().catch((e) => console.error("gex tick", e)), 6e4);
var gexRow = (r) => {
  const lv = typeof r.levels === "string" ? JSON.parse(r.levels) : r.levels;
  const day = typeof r.day === "string" ? r.day.slice(0, 10) : new Date(r.day).toISOString().slice(0, 10);
  return { day, levels: lv, feedLabel: r.feedLabel ?? null, feedAt: r.feedAt ? new Date(r.feedAt).toISOString() : null, fetchedAt: new Date(r.fetchedAt).toISOString() };
};
app.get("/api/gex/latest", async (c) => {
  const rows = await sql`select day, levels, "feedLabel", "feedAt", "fetchedAt" from "GexDaily" where symbol = 'NDX' order by day desc limit 12`;
  const list = rows.map(gexRow), cur = list[0] ?? null;
  const basis = cur ? Math.round(estimateBasis(cur.levels.spot, /* @__PURE__ */ new Date(), Number(process.env.GEX_CARRY_RATE ?? 0.035))) : null;
  const u = c.get("user");
  return c.json({
    current: cur,
    history: list.slice(1, 11).map((x) => ({ day: x.day, callWall: x.levels.all.callWall, flip: x.levels.all.flip, putWall: x.levels.all.putWall, spot: x.levels.spot, regime: x.levels.all.regime })),
    legend: EXPORT_LEGEND,
    basis,
    today: etParts().ymd,
    health: isStaff(u) ? gexHealth : void 0
  });
});
app.post("/api/coach/gex/run", async (c) => {
  staffOnly(c);
  return c.json(await runGex());
});
app.get("/api/plan", async (c) => {
  const [row] = await sql`select plan, "updatedAt" from "TradingPlan" where "userId" = ${c.get("user").id}`;
  const plan = row ? { ...typeof row.plan === "string" ? JSON.parse(row.plan) : row.plan, models: cleanPlanModels((typeof row.plan === "string" ? JSON.parse(row.plan) : row.plan).models), done: true, updatedAt: new Date(row.updatedAt).toISOString() } : null;
  return c.json({ plan });
});
app.put("/api/plan", async (c) => {
  const p = tradingPlanInput.parse(await c.req.json());
  await sql`insert into "TradingPlan" ("userId", plan) values (${c.get("user").id}, ${JSON.stringify(p)}::jsonb)
            on conflict ("userId") do update set plan = excluded.plan, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.put("/api/projection", async (c) => {
  const u = c.get("user");
  const { name, ...config } = projectionInput.parse(await c.req.json());
  const ids2 = [...new Set(config.rows.map((r) => r.templateId))];
  const found = await sql`select id from "AccountTemplate" where id = any(${pgArray(ids2)}::text[]) and "isActive"`;
  if (found.length !== ids2.length) throw new HttpError(400, "Unknown account");
  await sql`insert into "Projection" (id, "userId", name, config) values (${randomUUID()}, ${u.id}, ${name}, ${JSON.stringify(config)}::jsonb)
            on conflict ("userId") do update set name = excluded.name, config = excluded.config, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.delete("/api/projection", async (c) => {
  await sql`delete from "Projection" where "userId" = ${c.get("user").id}`;
  return c.json({ ok: true });
});
app.post("/api/feedback/:id/read", async (c) => {
  const r = await sql`update "CoachFeedback" set "readAt" = now() where id = ${c.req.param("id")} and "traderId" = ${c.get("user").id} returning id`;
  if (!r.length) throw new HttpError(404, "Not found");
  return c.json({ ok: true });
});
var USAGE_AREAS = /* @__PURE__ */ new Set(["dashboard", "school", "practice", "vault", "invertix"]);
app.post("/api/usage", async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!b.sid || !/^[A-Za-z0-9-]{8,48}$/.test(b.sid) || !b.area || !USAGE_AREAS.has(b.area)) throw new HttpError(400, "Bad usage ping");
  const section = String(b.section ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80) || "Other";
  const secs = clampInt(b.secs, 0, 120);
  const uid = c.get("user").id;
  await sql`insert into "UsageSession" (id, "userId", seconds) values (${b.sid}, ${uid}, ${secs})
            on conflict (id) do update set "lastSeenAt" = now(), seconds = "UsageSession".seconds + ${secs} where "UsageSession"."userId" = ${uid}`;
  if (secs > 0)
    await sql`insert into "UsageDaily" ("userId", day, area, section, seconds) values (${uid}, (now() at time zone 'America/New_York')::date, ${b.area}, ${section}, ${secs})
              on conflict ("userId", day, area, section) do update set seconds = "UsageDaily".seconds + ${secs}, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.get("/api/coach/usage", async (c) => {
  staffOnly(c);
  const rows = await sql`
    select u.id, coalesce(u."globalName", u.username) as name, u.role, u."lastLoginAt",
           max(s."lastSeenAt") as "lastSeen",
           count(s.id) filter (where s."startedAt" > now() - interval '7 days')::int as sessions7,
           coalesce(sum(s.seconds) filter (where s."startedAt" > now() - interval '7 days'), 0)::int as secs7
    from "User" u left join "UsageSession" s on s."userId" = u.id
    where u."isGuildMember" or exists (select 1 from "UsageSession" x where x."userId" = u.id)
    group by u.id order by max(s."lastSeenAt") desc nulls last, u.username limit 500`;
  const iso = (v) => v ? new Date(v).toISOString() : null;
  return c.json(rows.map((r) => ({ id: r.id, name: r.name, role: r.role, lastSeen: iso(r.lastSeen), lastLogin: iso(r.lastLoginAt), sessions7: r.sessions7, minutes7: Math.round(Number(r.secs7) / 60) })));
});
app.get("/api/coach/usage/:id", async (c) => {
  staffOnly(c);
  const id = c.req.param("id"), days = clampInt(c.req.query("days") ?? 30, 1, 120);
  const [sessions, sections] = await Promise.all([
    sql`select "startedAt", "lastSeenAt", seconds from "UsageSession" where "userId" = ${id} order by "startedAt" desc limit 25`,
    sql`select area, section, sum(seconds)::int as seconds, max(day) as "lastDay" from "UsageDaily" where "userId" = ${id} and day > (now() at time zone 'America/New_York')::date - ${days}::int group by area, section order by sum(seconds) desc limit 200`
  ]);
  const iso = (v) => new Date(v).toISOString();
  return c.json({
    days,
    sessions: sessions.map((s) => ({ startedAt: iso(s.startedAt), lastSeenAt: iso(s.lastSeenAt), minutes: Math.round(Number(s.seconds) / 60) })),
    sections: sections.map((s) => ({ area: s.area, section: s.section, minutes: Math.round(Number(s.seconds) / 60 * 10) / 10, lastDay: String(s.lastDay).slice(0, 10) }))
  });
});
var rolesOf = (u) => {
  const gr = u.guildRoleIds;
  return Array.isArray(gr) ? gr.map(String) : typeof gr === "string" ? gr.replace(/[{}"]/g, "").split(",").filter(Boolean) : [];
};
var hasMentorRole = (u) => rolesOf(u).some((id) => CFG.mentorshipRoles.includes(id) || /mentor/i.test(ROLE_NAMES.get(id) ?? ""));
async function vaultAccess(u) {
  if (isStaff(u)) return { level: "open", orderflow: u.role === "ADMIN", row: null };
  const [row] = await sql`select * from "VaultAccess" where "userId" = ${u.id}`;
  if (!row || row.revokedAt || !(hasMentorRole(u) || row.mentorshipOverride)) return { level: "none", orderflow: false, row: row ?? null };
  if (!row.redeemedAt) return { level: "code", orderflow: false, row };
  return { level: "open", orderflow: !!row.orderflow, row };
}
var readPrivate = async (name) => {
  const f = Bun.file(`${import.meta.dir}/assets/${name}`);
  return await f.exists() ? new Uint8Array(await f.arrayBuffer()) : null;
};
var vaultHtml = null;
var tries = /* @__PURE__ */ new Map();
var LOCK_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>The Vault \xB7 FLOWHUB</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap">
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 38%,#0f141b 0,#05070a 58%,#020304 100%);color:#e6ebf2;font:15px/1.5 Inter,system-ui,sans-serif;overflow:hidden}
a{color:#8cc4ff}.back{position:fixed;top:18px;left:20px;font-size:13px;text-decoration:none;color:#929fb2}
.wrap{text-align:center;padding:24px;max-width:460px}
.door{position:relative;width:224px;height:224px;margin:0 auto 26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#232b36,#10151c 60%,#0a0d12);box-shadow:0 0 0 2px #28313e,0 0 0 10px #0b0f14,0 0 0 11px #28313e,0 24px 60px rgba(0,0,0,.7);transition:transform 1.1s cubic-bezier(.6,0,.2,1),opacity .9s}
.door:before{content:"";position:absolute;inset:22px;border-radius:50%;border:2px dashed #2f3a48}
.door:after{content:"";position:absolute;inset:60px;border-radius:50%;background:#0a0d12;box-shadow:inset 0 0 0 2px #28313e}
.bolts i{position:absolute;width:10px;height:10px;border-radius:50%;background:#394555;left:107px;top:7px;transform-origin:5px 105px}
.dial{position:absolute;z-index:2;inset:74px;border-radius:50%;border:2px solid #ff6a00;transition:transform 1.1s cubic-bezier(.6,0,.2,1)}
.dial:before{content:"";position:absolute;left:50%;top:-8px;width:3px;height:16px;margin-left:-1.5px;background:#ff6a00}
.open .dial{transform:rotate(720deg)}.open .door{transform:scale(1.6);opacity:0}
h1{font:900 26px Archivo,Arial Black,sans-serif;letter-spacing:.02em;margin:0 0 8px}p{color:#929fb2;margin:0 0 20px}
form{display:flex;gap:8px;justify-content:center}input{width:210px;background:#0a0d12;border:1px solid #28313e;color:#e6ebf2;border-radius:3px;padding:11px 12px;font:500 16px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;text-align:center}
input:focus{outline:2px solid #ff6a00;outline-offset:1px}button{background:#ff6a00;color:#fff;border:0;border-radius:3px;padding:11px 18px;font:600 14px Inter,sans-serif;cursor:pointer}button:disabled{opacity:.5}
.msg{min-height:22px;margin-top:14px;font-size:14px;color:#ff5d73}.fine{margin-top:26px;font-size:12.5px;color:#66717f}
</style></head><body><a class="back" href="/">\u2190 FLOWHUB home</a>
<div class="wrap" id="w"><div class="door" aria-hidden="true"><span class="bolts"><i style="transform:rotate(0)"></i><i style="transform:rotate(45deg)"></i><i style="transform:rotate(90deg)"></i><i style="transform:rotate(135deg)"></i><i style="transform:rotate(180deg)"></i><i style="transform:rotate(225deg)"></i><i style="transform:rotate(270deg)"></i><i style="transform:rotate(315deg)"></i></span><div class="dial"></div></div>
<h1>ECHO X ORBIT</h1><p>The vault is by invitation: mentorship members only. Enter the code Hannah gave you.</p>
<form id="f"><input id="c" placeholder="FH-XXXXX-XXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="16" aria-label="Vault code"><button id="b" type="submit">Open</button></form>
<div class="msg" id="m" role="status"></div><p class="fine">No code yet? If you are in mentorship, send Hannah a message on Discord. Everything in the vault stays inside it.</p></div>
<script>
const f=document.getElementById('f'),c=document.getElementById('c'),m=document.getElementById('m'),b=document.getElementById('b'),w=document.getElementById('w');
f.addEventListener('submit',async e=>{e.preventDefault();m.textContent='';b.disabled=true;
 try{const r=await fetch('/api/vault/redeem',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({code:c.value})}),j=await r.json().catch(()=>({}));
  if(r.ok){w.classList.add('open');m.style.color='#3ee0a1';m.textContent='Opening\u2026';setTimeout(()=>location.reload(),1250)}else{m.textContent=j.error||'That code did not work.';b.disabled=false}}
 catch(x){m.textContent='Could not reach FLOWHUB. Try again.';b.disabled=false}});
</script></body></html>`;
app.get("/vault", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.redirect("/");
  const acc = await vaultAccess(user);
  if (acc.level !== "open") return c.html(LOCK_PAGE, 200, { "Cache-Control": "no-store" });
  const gz = await readPrivate("vault.html.gz");
  if (!gz) return c.text("The vault is not installed yet.", 404);
  const etag = String(Bun.hash(gz));
  if (!vaultHtml || vaultHtml.etag !== etag) vaultHtml = { etag, html: gunzipSync(gz).toString("utf8") };
  const nav = `<nav class="fh-nav" aria-label="FLOWHUB"><a href="/#home">\u2190 FLOWHUB home</a><a href="/school">Trading School</a></nav>`;
  return c.html(vaultHtml.html.replace("<!--FH_NAV-->", nav), 200, { "Cache-Control": "no-store" });
});
app.post("/api/vault/redeem", async (c) => {
  const u = c.get("user");
  const now = Date.now(), t = tries.get(u.id);
  if (t && t.reset > now && t.n >= 8) throw new HttpError(429, "Too many tries. Wait a few minutes and try again.");
  const bump = () => tries.set(u.id, t && t.reset > now ? { n: t.n + 1, reset: t.reset } : { n: 1, reset: now + 10 * 60 * 1e3 });
  const b = await c.req.json().catch(() => ({}));
  const acc = await vaultAccess(u);
  const bad = () => {
    bump();
    return new HttpError(400, "That code did not work.");
  };
  if (acc.level === "open") return c.json({ ok: true });
  if (acc.level !== "code" || !acc.row || !b.code) throw bad();
  const want = Buffer.from(acc.row.codeHash, "hex"), got = Buffer.from(hashCode(b.code, CFG.sessionSecret), "hex");
  if (want.length !== got.length || !timingSafeEqual(want, got)) throw bad();
  await sql`update "VaultAccess" set "redeemedAt" = now(), "updatedAt" = now() where "userId" = ${u.id}`;
  await audit(u.id, "VAULT_OPEN", u.id);
  tries.delete(u.id);
  return c.json({ ok: true });
});
app.get("/api/vault/status", async (c) => {
  const acc = await vaultAccess(c.get("user"));
  return c.json({ status: acc.level === "open" ? "open" : acc.level === "code" ? "code" : "restricted" });
});
app.get("/api/vault/progress", async (c) => {
  const u = c.get("user"), acc = await vaultAccess(u);
  if (acc.level !== "open") throw new HttpError(403, "Not open");
  const [row] = acc.row ? await sql`select state from "VaultAccess" where "userId" = ${u.id}` : [];
  const state = row?.state ? typeof row.state === "string" ? JSON.parse(row.state) : row.state : null;
  return c.json({ state, unlocks: [], name: u.globalName ?? u.username, orderflow: acc.orderflow, ...await paceFor(u.id, "exo") });
});
app.put("/api/vault/progress", async (c) => {
  const u = c.get("user"), acc = await vaultAccess(u);
  if (acc.level !== "open") throw new HttpError(403, "Not open");
  if (!acc.row) return c.json({ ok: true });
  const set = new Set(VAULT_MODULE_IDS), o = await c.req.json().catch(() => ({}));
  const m = {};
  for (const [k, v] of Object.entries(o.v2?.m ?? {}).slice(0, 30)) {
    if (!set.has(k) || !v || typeof v !== "object") continue;
    const s = String(v.s ?? "000");
    m[k] = { s: /^[01]{3,4}$/.test(s) ? s.slice(0, 3) : "000", p: v.p ? 1 : 0, t: v.t ? 1 : 0, sc: clampInt(v.sc, 0, 100), a: clampInt(v.a, 1, 999), n: clampInt(v.n, 0, 999), at: Math.max(0, Number(v.at) || 0) };
  }
  await sql`update "VaultAccess" set state = ${JSON.stringify({ v2: { m } })}::jsonb, "updatedAt" = now() where "userId" = ${u.id}`;
  return c.json({ ok: true });
});
async function invertixAccess(u) {
  const [fs, is] = await Promise.all([trackState(u.id, "fundamentals"), trackState(u.id, "invertix")]);
  const earned = invertixOpen(fs, is);
  return { open: isStaff(u) || earned, earned, staff: isStaff(u), fPassed: passedIn2(fs, "fundamentals"), fTotal: trackTotal("fundamentals"), iPassed: passedIn2(is, "invertix"), iTotal: trackTotal("invertix"), state: is };
}
var invHtml = null;
app.get("/invertix", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.redirect("/");
  const acc = await invertixAccess(user);
  if (!acc.open) return c.html(pageShell(`<h1>INVERTIX opens with your fundamentals certificate</h1><p>Finish the Trading Fundamentals to open INVERTIX. You have passed <b>${acc.fPassed} of ${acc.fTotal}</b> modules.</p><p><a href="/school" style="color:#8cc4ff">Continue the fundamentals \u2192</a></p><p><a href="/" style="color:#66717f">FLOWHUB home</a></p>`), 200, { "Cache-Control": "no-store" });
  const gz = await readPrivate("invertix.html.gz");
  if (!gz) return c.text("INVERTIX is not installed yet.", 404);
  const etag = String(Bun.hash(gz));
  if (!invHtml || invHtml.etag !== etag) invHtml = { etag, html: gunzipSync(gz).toString("utf8") };
  const nav = `<nav class="fh-nav" aria-label="FLOWHUB"><a href="/#home">\u2190 FLOWHUB home</a><a href="/school">Trading School</a></nav>`;
  return c.html(invHtml.html.replace("<!--FH_NAV-->", nav), 200, { "Cache-Control": "no-store" });
});
app.get("/api/invertix/status", async (c) => {
  const acc = await invertixAccess(c.get("user"));
  return c.json({ status: acc.earned ? "open" : "locked", staffBypass: acc.staff && !acc.earned, fundamentals: { passed: acc.fPassed, total: acc.fTotal }, invertix: { passed: acc.iPassed, total: acc.iTotal } });
});
app.get("/api/invertix/progress", async (c) => {
  const u = c.get("user"), acc = await invertixAccess(u);
  if (!acc.open) throw new HttpError(403, "Not open");
  const state = acc.state ? typeof acc.state === "string" ? JSON.parse(acc.state) : acc.state : null;
  return c.json({ state, unlocks: [], name: u.globalName ?? u.username, ...await paceFor(u.id, "invertix") });
});
app.put("/api/invertix/progress", async (c) => {
  const u = c.get("user"), acc = await invertixAccess(u);
  if (!acc.open) throw new HttpError(403, "Not open");
  const set = new Set(INVERTIX_MODULE_IDS), o = await c.req.json().catch(() => ({}));
  const m = {};
  for (const [k, v] of Object.entries(o.v2?.m ?? {}).slice(0, 30)) {
    if (!set.has(k) || !v || typeof v !== "object") continue;
    const s = String(v.s ?? "000");
    m[k] = { s: /^[01]{3,4}$/.test(s) ? s.slice(0, 3) : "000", p: v.p ? 1 : 0, sc: clampInt(v.sc, 0, 100), a: clampInt(v.a, 1, 999), n: clampInt(v.n, 0, 999), at: Math.max(0, Number(v.at) || 0) };
  }
  await sql`insert into "TrackProgress" ("userId", track, state) values (${u.id}, 'invertix', ${JSON.stringify({ v2: { m } })}::jsonb)
            on conflict ("userId", track) do update set state = excluded.state, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.get("/api/vault/orderflow.js", async (c) => {
  const acc = await vaultAccess(c.get("user"));
  if (acc.level !== "open" || !acc.orderflow) return c.text("", 403);
  const gz = await readPrivate("vault-orderflow.js.gz");
  if (!gz) return c.text("", 404);
  return c.body(gz, 200, { "Content-Type": "text/javascript; charset=utf-8", "Content-Encoding": "gzip", "Cache-Control": "no-store" });
});
app.get("/api/coach/members", async (c) => {
  staffOnly(c);
  const q = (c.req.query("q") ?? "").slice(0, 50);
  const sortQ = c.req.query("sort");
  const sort = sortQ === "recent" || sortQ === "consistency" ? sortQ : "drawdown";
  const like = `%${q}%`;
  const members = await sql`select id from "User" where "isGuildMember" and (${q} = '' or username ilike ${like} or "globalName" ilike ${like}) limit 500`;
  const rows = [];
  for (const m of members) rows.push(buildDirectoryRow(await loadDashboard(c.get("user"), m.id)));
  return c.json(sortDirectory(rows, sort));
});
app.get("/api/coach/members/:id", async (c) => {
  staffOnly(c);
  const d = await loadDashboard(c.get("user"), c.req.param("id"));
  await audit(c.get("user").id, "VIEW_MEMBER", c.req.param("id"));
  return c.json(d);
});
app.post("/api/coach/members/:id/unlock", async (c) => {
  staffOnly(c);
  const b = await c.req.json();
  if (!b.level || !SCHOOL_MODULE_SET.has(b.level) || typeof b.on !== "boolean") throw new HttpError(400, "Bad module");
  const id = c.req.param("id");
  if (!(await sql`select 1 from "User" where id = ${id}`).length) throw new HttpError(404, "Not found");
  if (b.on)
    await sql`insert into "SchoolProgress" ("userId", unlocks) values (${id}, ${pgArray([b.level])}::text[])
              on conflict ("userId") do update set unlocks = array(select distinct unnest("SchoolProgress".unlocks || ${pgArray([b.level])}::text[])), "updatedAt" = now()`;
  else await sql`update "SchoolProgress" set unlocks = array_remove(unlocks, ${b.level}), "updatedAt" = now() where "userId" = ${id}`;
  await audit(c.get("user").id, b.on ? "SCHOOL_UNLOCK" : "SCHOOL_RELOCK", id, { level: b.level });
  return c.json({ ok: true });
});
app.get("/api/coach/vault", async (c) => {
  staffOnly(c);
  const rows = await sql`select u.id, coalesce(u."globalName", u.username) as name, u.role, u."guildRoleIds", v."codeHint", v."issuedAt", v."redeemedAt", v."revokedAt", v."mentorshipOverride", v.orderflow, v.state
    from "User" u left join "VaultAccess" v on v."userId" = u.id
    where u."isGuildMember" or v."userId" is not null order by (v."userId" is null), v."issuedAt" desc nulls last, u.username limit 500`;
  const iso = (v) => v ? new Date(v).toISOString() : null;
  return c.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    mentorship: hasMentorRole(r),
    override: !!r.mentorshipOverride,
    code: r.issuedAt ? r.revokedAt ? "revoked" : r.redeemedAt ? "opened" : "issued" : "none",
    hint: r.codeHint ?? null,
    issuedAt: iso(r.issuedAt),
    redeemedAt: iso(r.redeemedAt),
    orderflow: !!r.orderflow,
    passed: vaultPassed(r.state ? typeof r.state === "string" ? JSON.parse(r.state) : r.state : null)
  })));
});
app.post("/api/coach/vault/:id/code", async (c) => {
  staffOnly(c);
  const id = c.req.param("id"), b = await c.req.json().catch(() => ({}));
  const [t] = await sql`select id, "guildRoleIds" from "User" where id = ${id}`;
  if (!t) throw new HttpError(404, "Not found");
  const role = hasMentorRole(t), override = !role && b.mentorship === true;
  if (!role && !override) throw new HttpError(400, 'This member does not have the mentorship role. Tick "Mark as mentorship" to confirm they are in mentorship.');
  const code = makeCode(randomBytes(10));
  await sql`insert into "VaultAccess" ("userId", "codeHash", "codeHint", "issuedBy", "mentorshipOverride")
            values (${id}, ${hashCode(code, CFG.sessionSecret)}, ${code.slice(-3)}, ${c.get("user").id}, ${override})
            on conflict ("userId") do update set "codeHash" = excluded."codeHash", "codeHint" = excluded."codeHint", "issuedBy" = excluded."issuedBy", "issuedAt" = now(),
              "redeemedAt" = null, "revokedAt" = null, "mentorshipOverride" = "VaultAccess"."mentorshipOverride" or excluded."mentorshipOverride", "updatedAt" = now()`;
  await audit(c.get("user").id, "VAULT_CODE", id);
  return c.json({ code });
});
app.post("/api/coach/vault/:id/revoke", async (c) => {
  staffOnly(c);
  const r = await sql`update "VaultAccess" set "revokedAt" = now(), "updatedAt" = now() where "userId" = ${c.req.param("id")} returning "userId"`;
  if (!r.length) throw new HttpError(404, "Not found");
  await audit(c.get("user").id, "VAULT_REVOKE", c.req.param("id"));
  return c.json({ ok: true });
});
app.post("/api/coach/vault/:id/orderflow", async (c) => {
  staffOnly(c);
  if (c.get("user").role !== "ADMIN") throw new HttpError(403, "Only an admin can open the Orderflow room");
  const b = await c.req.json().catch(() => ({}));
  if (typeof b.on !== "boolean") throw new HttpError(400, "Bad request");
  const r = await sql`update "VaultAccess" set orderflow = ${b.on}, "updatedAt" = now() where "userId" = ${c.req.param("id")} returning "userId"`;
  if (!r.length) throw new HttpError(404, "Issue a vault code first");
  await audit(c.get("user").id, b.on ? "ORDERFLOW_OPEN" : "ORDERFLOW_CLOSE", c.req.param("id"));
  return c.json({ ok: true });
});
app.post("/api/coach/feedback", async (c) => {
  staffOnly(c);
  const d = feedbackInput.parse(await c.req.json());
  if (d.journalEntryId && !(await sql`select 1 from "JournalEntry" where id = ${d.journalEntryId} and "userId" = ${d.traderId}`).length)
    throw new HttpError(400, "Trade doesn't belong to this trader");
  if (d.memberAccountId && !(await sql`select 1 from "MemberAccount" where id = ${d.memberAccountId} and "userId" = ${d.traderId}`).length)
    throw new HttpError(400, "Account doesn't belong to this trader");
  const id = randomUUID();
  await sql`insert into "CoachFeedback" (id, "coachId", "traderId", "journalEntryId", "memberAccountId", kind, body)
            values (${id}, ${c.get("user").id}, ${d.traderId}, ${d.journalEntryId ?? null}, ${d.memberAccountId ?? null}, ${d.kind}::"FeedbackKind", ${d.body})`;
  await audit(c.get("user").id, "FEEDBACK_CREATE", d.traderId, { feedbackId: id });
  return c.json({ id });
});
app.patch("/api/admin/catalog/:id", async (c) => {
  staffOnly(c);
  const d = templatePatch.parse(await c.req.json());
  const [before] = await sql`select * from "AccountTemplate" where id = ${c.req.param("id")}`;
  if (!before) throw new HttpError(404, "Not found");
  await patchRow("AccountTemplate", before.id, { ...d, updatedById: c.get("user").id });
  await sql`update "AccountTemplate" set "lastVerifiedAt" = now() where id = ${before.id}`;
  await audit(c.get("user").id, "CATALOG_UPDATE", before.id, { changes: d });
  return c.json({ ok: true });
});
app.get("/api/local-accounts", async (c) => {
  staffOnly(c);
  const rows = await sql`select u.id, a.username, a.email, u."globalName" as name, a.disabled, a."expiresAt", a.days, (a."passwordHash" is not null) as active, u."lastLoginAt", a."createdAt" from "LocalAccount" a join "User" u on u.id = a."userId" order by a."createdAt" desc`;
  const iso = (v) => v ? new Date(v).toISOString() : null;
  return c.json(rows.map((r) => ({ ...r, expiresAt: iso(r.expiresAt), lastLoginAt: r.active ? iso(r.lastLoginAt) : null, createdAt: iso(r.createdAt) })));
});
app.post("/api/local-accounts", async (c) => {
  staffOnly(c);
  const b = await c.req.json();
  const email = String(b.email ?? "").trim().toLowerCase(), name = String(b.name ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) throw new HttpError(400, "Enter a valid email address");
  if (name.length < 1 || name.length > 60) throw new HttpError(400, "Enter a name");
  const days = b.days === null || b.days === void 0 || b.days === "" ? null : Math.round(Number(b.days));
  if (days !== null && !(days >= 1 && days <= 3650)) throw new HttpError(400, "Days must be 1\u20133650, or blank for no limit");
  const [dupe] = await sql`select 1 as x from "LocalAccount" where username = ${email} or lower(email) = ${email}`;
  if (dupe) throw new HttpError(409, "That email already has an account");
  const id = randomUUID();
  await sql`insert into "User" (id, "discordId", username, "globalName", role, "guildRoleIds", "isGuildMember", "rolesSyncedAt", "lastLoginAt")
            values (${id}, ${"local:" + email}, ${email}, ${name}, 'MEMBER'::"Role", ${pgArray([])}::text[], true, now(), now())`;
  await sql`insert into "LocalAccount" ("userId", username, email, days, "createdById") values (${id}, ${email}, ${email}, ${days}, ${c.get("user").id})`;
  const m = await inviteMail(id, name, email, "invite");
  return c.json({ id, emailed: m.sent, link: m.sent ? void 0 : m.link });
});
app.patch("/api/local-accounts/:id", async (c) => {
  staffOnly(c);
  const id = c.req.param("id"), b = await c.req.json();
  const [a] = await sql`select "userId", email, "passwordHash" from "LocalAccount" where "userId" = ${id}`;
  if (!a) throw new HttpError(404, "Not found");
  if (typeof b.disabled === "boolean") await sql`update "LocalAccount" set disabled = ${b.disabled} where "userId" = ${id}`;
  if ("days" in b) {
    const d = b.days === null || b.days === "" ? null : Math.round(Number(b.days));
    if (d !== null && !(d >= 1 && d <= 3650)) throw new HttpError(400, "Days must be 1\u20133650, or blank for no limit");
    await sql`update "LocalAccount" set days = ${d}, "expiresAt" = ${a.passwordHash && d ? new Date(Date.now() + d * 864e5) : null} where "userId" = ${id}`;
  }
  if (b.name !== void 0 && b.name.trim()) await sql`update "User" set "globalName" = ${b.name.trim().slice(0, 60)} where id = ${id}`;
  if (b.resend) {
    if (!a.email) throw new HttpError(400, "This account has no email address");
    const [u] = await sql`select "globalName" as name from "User" where id = ${id}`;
    const m = await inviteMail(id, u.name ?? "", a.email, a.passwordHash ? "reset" : "invite");
    return c.json({ ok: true, emailed: m.sent, link: m.sent ? void 0 : m.link });
  }
  return c.json({ ok: true });
});
app.all("/api/*", () => {
  throw new HttpError(404, "Not found");
});
var ASSET_TYPES = { "app.js": "text/javascript; charset=utf-8", "app.css": "text/css; charset=utf-8", "school.html": "text/html; charset=utf-8", "practice.html": "text/html; charset=utf-8" };
var assetCache = /* @__PURE__ */ new Map();
async function asset(path) {
  const hit = assetCache.get(path);
  if (hit) return hit;
  if (ASSET_TYPES[path]) {
    const f = Bun.file(`${import.meta.dir}/assets/${path}.gz`);
    if (await f.exists()) {
      const body = new Uint8Array(await f.arrayBuffer());
      const a2 = { type: ASSET_TYPES[path], body, etag: `"${Bun.hash(body).toString(36)}"` };
      assetCache.set(path, a2);
      return a2;
    }
  }
  const [row] = await sql`select "contentType", body, extract(epoch from "updatedAt")::bigint as v from "AppAsset" where path = ${path}`;
  if (!row) return null;
  const a = { type: row.contentType, body: Buffer.from(row.body, "base64"), etag: `"${row.v}"` };
  assetCache.set(path, a);
  return a;
}
app.get("/assets/:name", async (c) => {
  const a = await asset(c.req.param("name"));
  if (!a) return c.text("Not found", 404);
  if (c.req.header("if-none-match") === a.etag) return c.body(null, 304);
  return c.body(a.body, 200, {
    "Content-Type": a.type,
    "Content-Encoding": "gzip",
    ETag: a.etag,
    "Cache-Control": "public, max-age=300",
    Vary: "Accept-Encoding"
  });
});
var SHELL = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>FLOWHUB \xB7 FLOWMTD Trading</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#030405">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23030405'/%3E%3Ctext x='16' y='25' font-family='Arial Black,Arial' font-weight='900' font-size='24' text-anchor='middle' fill='%23ff6a00'%3EF%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,700..900;1,100..125,700..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@500;700&family=Rajdhani:wght@500;600;700&display=swap">
<style>:root{color-scheme:dark;--font-archivo:"Archivo";--font-orbitron:"Orbitron";--font-rajdhani:"Rajdhani";--font-inter:"Inter";--font-jetbrains:"JetBrains Mono"}html,body{margin:0;background:#030405;color:#e6ebf2}#boot{font:12px/1.4 monospace;letter-spacing:.2em;color:#58626f;padding:40px 16px;text-align:center}</style>
<link rel="stylesheet" href="/assets/app.css?v=__V__">
</head><body><div id="root"><div id="boot">FLOWHUB // BOOTING</div></div>
<script type="importmap">{"imports":{
  "react":"https://esm.sh/react@19.1.1",
  "react/jsx-runtime":"https://esm.sh/react@19.1.1/jsx-runtime",
  "react-dom":"https://esm.sh/react-dom@19.1.1?deps=react@19.1.1",
  "react-dom/client":"https://esm.sh/react-dom@19.1.1/client?deps=react@19.1.1"
}}</script>
<script type="module" src="/assets/app.js?v=__V__"></script>
</body></html>`;
var pageHtml = /* @__PURE__ */ new Map();
var fhNav = (user, current) => `<nav class="fh-nav" aria-label="FLOWHUB"><a href="/#home">Home</a><a href="/#dashboard">My Dashboard</a><a href="/#plan">Trading Plan</a><a href="/school"${current === "school" ? ' aria-current="page"' : ""}>Trading School</a><a href="/practice"${current === "practice" ? ' aria-current="page"' : ""}>Practice</a>${isStaff(user) ? '<a href="/#coach">Coach Portal</a>' : ""}</nav>`;
var PAGES = [["school", "/school", "school"], ["practice", "/practice", "practice"]];
for (const [name, route, current] of PAGES) {
  app.get(route, async (c) => {
    const user = await currentUser(c);
    if (!user) return c.redirect("/");
    const a = await asset(`${name}.html`);
    if (!a) return c.text("This page isn't installed yet.", 404);
    const key = `${name}:${a.etag}`;
    if (!pageHtml.has(key)) pageHtml.set(key, gunzipSync(a.body).toString("utf8"));
    return c.html(pageHtml.get(key).replace("<!--FH_NAV-->", fhNav(user, current)), 200, { "Cache-Control": "no-cache" });
  });
}
app.get("*", async (c) => {
  const js = await asset("app.js");
  return c.html(SHELL.replaceAll("__V__", js?.etag.replaceAll('"', "") ?? "0"), 200, { "Cache-Control": "no-cache" });
});
var server_default = { port: Number(env.PORT ?? 3e3), fetch: app.fetch };
console.log("FLOWHUB up \xB7 discord", discordReady() ? "configured" : "NOT configured");
export {
  server_default as default
};
