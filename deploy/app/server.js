// FLOWHUB server — built by deploy/build.mjs from deploy/server.ts. Do not edit here.
// deploy/server.ts
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { ZodError } from "zod";
import { SQL } from "bun";
import { gunzipSync } from "node:zlib";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

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
  DAILY_LEVELS: { key: "DAILY_LEVELS", indicator: "ECHO X ORBIT", name: "ECHO X ORBIT", winRate: 0.94, session: null },
  ASIAFLOW_PO3: { key: "ASIAFLOW_PO3", indicator: "AsiaFlow", name: "PO3", winRate: 0.7, session: "ASIA" },
  // A3IA is retired: kept only so old roadmaps and journal rows still resolve. Not selectable.
  ASIAFLOW_A3IA: { key: "ASIAFLOW_A3IA", indicator: "AsiaFlow", name: "A3IA", winRate: 0.81, session: "ASIA" },
  NYFLOW_PO3: { key: "NYFLOW_PO3", indicator: "NYFlow", name: "PO3", winRate: 0.745, session: "NY" },
  NYFLOW_HL: { key: "NYFLOW_HL", indicator: "NYFlow", name: "H/L", winRate: 0.84, session: "NY" }
};
var STRATEGY_KEYS = Object.keys(STRATEGIES);
var RETIRED_STRATEGIES = ["ASIAFLOW_A3IA"];
var SELECTABLE_STRATEGY_KEYS = STRATEGY_KEYS.filter((k) => !RETIRED_STRATEGIES.includes(k));
var strategyLabel = (k) => k === "DAILY_LEVELS" ? "ECHO X ORBIT" : `${STRATEGIES[k].indicator} \xB7 ${STRATEGIES[k].name}`;
function normalizeSelection(sel) {
  if (sel.mode === "DAILY_LEVELS") return { mode: "DAILY_LEVELS", multiSession: false, strategies: ["DAILY_LEVELS"] };
  let picks = [...new Set(sel.strategies)].filter((k) => k !== "DAILY_LEVELS" && STRATEGIES[k] && !RETIRED_STRATEGIES.includes(k));
  if (!sel.multiSession && picks.length) {
    const session = STRATEGIES[picks[0]].session;
    picks = picks.filter((k) => STRATEGIES[k].session === session);
  }
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
  const greenDays = new Set(journal.filter((j) => j.pnl > 0).map((j) => j.tradeDate)).size;
  const xp = journal.length * 10 + journal.filter((j) => j.followedPlan).length * 15 + greenDays * 25 + journal.filter((j) => j.screenshotUrl).length * 5;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const nextLevelXp = level * level * 100;
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
      planFollowed30: last30.length ? last30.filter((j) => j.followedPlan).length / last30.length : null,
      level,
      xp,
      xpToNext: nextLevelXp - xp
    }
  };
}
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
    statuses: live.map((a) => ({ label: a.label, status: a.pace.status }))
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
var PLAN_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

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
    days: z.array(z.enum(PLAN_DAYS)).min(1, "Pick at least one day").max(5),
    sessions: z.array(z.enum(["ASIA", "LONDON", "NY"])).min(1, "Pick at least one session").max(3),
    start: planTime,
    end: planTime
  }),
  models: z.array(z.enum(["ECHO_X_ORBIT", "NYFLOW_HL", "NYFLOW_PO3", "ASIAFLOW_PO3"])).min(1, "Pick at least one model").max(4),
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
var PRACTICE_MODELS = ["hl", "po3", "dl", "asia", "exo"];
var PRACTICE_MODEL_LABEL = { dl: "Extended Learning", exo: "ECHO X ORBIT", hl: "NYFlow \xB7 H/L", po3: "NYFlow \xB7 PO3", asia: "AsiaFlow \xB7 PO3" };
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
var SCHOOL_LEVELS = [
  { id: "beginner", name: "Beginner", modules: [
    { id: "b1", lessons: ["d:futures"] },
    { id: "b2", lessons: ["d:charts"] },
    { id: "b3", lessons: ["d:setup", "c:chart", "c:connect+order", "d:orders"] },
    { id: "b4", lessons: ["d:risk", "c:manage", "c:limits"] },
    { id: "b5", lessons: ["c:end"], noCheck: true }
  ], exam: true },
  { id: "intermediate", name: "Intermediate", modules: [
    { id: "i1", lessons: ["d:prop"] },
    { id: "i2", lessons: ["d:math"] },
    { id: "i3", lessons: ["d:manage", "d:mistakes"] },
    { id: "i4", lessons: ["d:psych"] },
    { id: "i5", lessons: ["d:day", "d:planlesson"] }
  ], exam: true },
  { id: "advanced", name: "Advanced", modules: [
    { id: "a1", lessons: ["d:rs", "c:dl"] },
    { id: "a2", lessons: ["c:hl", "c:po3", "c:asia"] }
  ], exam: true },
  { id: "exo", name: "ECHO X ORBIT", modules: [
    { id: "x1", lessons: ["d:exo-intro", "d:echo", "d:orbit", "d:exo-rules", "d:exo-replay"] }
  ], exam: false }
];
var SCHOOL_LEVEL_IDS = SCHOOL_LEVELS.map((l) => l.id);
var DIVE_PARTS = {
  futures: 5,
  charts: 5,
  orders: 3,
  risk: 3,
  rs: 3,
  planlesson: 2,
  setup: 5,
  prop: 4,
  math: 4,
  manage: 3,
  mistakes: 4,
  psych: 1,
  day: 4,
  "exo-intro": 3,
  echo: 4,
  orbit: 4,
  "exo-rules": 4,
  "exo-replay": 2
};
var MODULE_LABEL = {
  b1: "How futures & NQ work",
  b2: "Reading charts",
  b3: "Platform & orders",
  b4: "Risk basics",
  i1: "Prop Firm 101",
  i2: "Why the math works",
  i3: "Trade management",
  i4: "Trading psychology",
  i5: "Day in the life & plan",
  a1: "Extended Learning",
  a2: "Indicator models",
  x1: "ECHO X ORBIT"
};
function summarizeSchool(state, unlocks, attempts) {
  const s = state ?? {}, ch = new Set(s.ch ?? []), dives = s.dives ?? {};
  const done = (key) => {
    const [k, id] = key.split(":");
    if (k === "c") return id.split("+").every((c) => ch.has(c));
    return Object.keys(dives[id] ?? {}).length >= (DIVE_PARTS[id] ?? 1);
  };
  const levels = SCHOOL_LEVELS.map((l) => {
    const mods = l.modules;
    const lessons = mods.flatMap((m) => m.lessons);
    const cks = mods.filter((m) => !m.noCheck);
    const ex = s.ex?.[l.id];
    return {
      id: l.id,
      name: l.name,
      lessons: lessons.length,
      lessonsDone: lessons.filter(done).length,
      checkpoints: cks.length,
      checkpointsPassed: cks.filter((m) => s.ck?.[m.id]?.pass).length,
      exam: l.exam ? { best: ex?.best ?? 0, pass: !!ex?.pass, tries: ex?.n ?? 0 } : null,
      manualUnlock: unlocks.includes(l.id)
    };
  });
  const current = (levels.find((l) => l.lessonsDone < l.lessons || l.checkpointsPassed < l.checkpoints || l.exam && !l.exam.pass) ?? levels[levels.length - 1]).name;
  return {
    levels,
    current,
    attempts: attempts.slice(0, 12).map((a) => ({
      kind: a.kind === "ex" ? "ex" : "ck",
      ref: a.ref,
      label: a.kind === "ex" ? `${SCHOOL_LEVELS.find((l) => l.id === a.ref)?.name ?? a.ref} exam` : `Checkpoint \xB7 ${MODULE_LABEL[a.ref] ?? a.ref}`,
      pct: a.total ? a.score / a.total : 0,
      pass: a.pass,
      at: new Date(a.createdAt).toISOString()
    }))
  };
}

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
  launched: (env.FLOWHUB_LAUNCHED ?? "").toLowerCase() === "true",
  // false = staff only
  botToken: env.DISCORD_BOT_TOKEN ?? "",
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
if (CFG.botToken && CFG.guildId)
  fetch(`${DISCORD}/guilds/${CFG.guildId}/roles`, { headers: { Authorization: `Bot ${CFG.botToken}` } }).then((r) => r.ok ? r.json() : r.text().then((t) => Promise.reject(`${r.status} ${t}`))).then((roles) => console.log("FLOWHUB roles:", roles.map((x) => `${x.name}=${x.id}`).join(" | "))).catch((e) => console.error("FLOWHUB roles lookup failed", e));
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
    tradingPlan: tp ? { ...jsonOf(tp.plan), done: true, updatedAt: new Date(tp.updatedAt).toISOString() } : null,
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
app.get("/healthz", async (c) => c.json({ ok: true, db: (await sql`select 1 as ok`)[0].ok === 1, discord: discordReady() }));
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
  return c.redirect("/#dashboard");
});
app.get("/auth/logout", (c) => {
  deleteCookie(c, "fh_session", { path: "/" });
  return c.redirect("/");
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
app.get("/api/catalog", async (c) => c.json(await loadCatalog()));
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
var SCHOOL_LEVELS_SET = new Set(SCHOOL_LEVEL_IDS);
var ID_RE = /^[a-z0-9-]{1,20}$/;
function cleanSchoolState(b) {
  const o = b && typeof b === "object" ? b : {};
  const ch = Array.isArray(o.ch) ? o.ch.filter((x) => typeof x === "string" && ID_RE.test(x)).slice(0, 60) : [];
  const dives = {};
  for (const [k, v] of Object.entries(o.dives && typeof o.dives === "object" ? o.dives : {}).slice(0, 60)) {
    if (!ID_RE.test(k) || !v || typeof v !== "object") continue;
    dives[k] = Object.fromEntries(Object.keys(v).filter((x) => ID_RE.test(x)).slice(0, 30).map((x) => [x, 1]));
  }
  const best = (m) => {
    const out = {};
    for (const [k, v] of Object.entries(m && typeof m === "object" ? m : {}).slice(0, 40)) {
      if (!ID_RE.test(k) || !v || typeof v !== "object") continue;
      out[k] = { best: Math.max(0, Math.min(1, Number(v.best) || 0)), pass: v.pass === true, n: Math.max(0, Math.min(1e4, Math.round(Number(v.n) || 0))), at: Math.max(0, Number(v.at) || 0) };
    }
    return out;
  };
  return { ch, dives, ck: best(o.ck), ex: best(o.ex) };
}
app.get("/api/school", async (c) => {
  const u = c.get("user");
  const [row] = await sql`select state, unlocks from "SchoolProgress" where "userId" = ${u.id}`;
  return c.json({ state: row ? typeof row.state === "string" ? JSON.parse(row.state) : row.state : null, unlocks: row?.unlocks ?? [], staff: isStaff(u) });
});
app.put("/api/school", async (c) => {
  const json = JSON.stringify(cleanSchoolState(await c.req.json()));
  if (json.length > 2e4) throw new HttpError(400, "Too long");
  await sql`insert into "SchoolProgress" ("userId", state) values (${c.get("user").id}, ${json}::jsonb)
            on conflict ("userId") do update set state = excluded.state, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.post("/api/school/attempt", async (c) => {
  const b = await c.req.json();
  const score = Math.round(Number(b.score)), total = Math.round(Number(b.total));
  if (b.kind !== "ck" && b.kind !== "ex" || !b.ref || !ID_RE.test(b.ref) || !(total > 0 && total <= 50) || !(score >= 0 && score <= total) || typeof b.pass !== "boolean")
    throw new HttpError(400, "Bad attempt");
  await sql`insert into "SchoolAttempt" (id, "userId", kind, ref, score, total, pass) values (${randomUUID()}, ${c.get("user").id}, ${b.kind}, ${b.ref}, ${score}, ${total}, ${b.pass})`;
  return c.json({ ok: true });
});
app.get("/api/plan", async (c) => {
  const [row] = await sql`select plan, "updatedAt" from "TradingPlan" where "userId" = ${c.get("user").id}`;
  const plan = row ? { ...typeof row.plan === "string" ? JSON.parse(row.plan) : row.plan, done: true, updatedAt: new Date(row.updatedAt).toISOString() } : null;
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
  if (!b.level || !SCHOOL_LEVELS_SET.has(b.level) || b.level === "beginner" || typeof b.on !== "boolean") throw new HttpError(400, "Bad level");
  const id = c.req.param("id");
  if (!(await sql`select 1 from "User" where id = ${id}`).length) throw new HttpError(404, "Not found");
  if (b.on)
    await sql`insert into "SchoolProgress" ("userId", unlocks) values (${id}, ${pgArray([b.level])}::text[])
              on conflict ("userId") do update set unlocks = array(select distinct unnest("SchoolProgress".unlocks || ${pgArray([b.level])}::text[])), "updatedAt" = now()`;
  else await sql`update "SchoolProgress" set unlocks = array_remove(unlocks, ${b.level}), "updatedAt" = now() where "userId" = ${id}`;
  await audit(c.get("user").id, b.on ? "SCHOOL_UNLOCK" : "SCHOOL_RELOCK", id, { level: b.level });
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,700..900;1,100..125,700..900&family=Orbitron:wght@500;700&family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>:root{color-scheme:dark;--font-archivo:"Archivo";--font-orbitron:"Orbitron";--font-rajdhani:"Rajdhani";--font-jetbrains:"JetBrains Mono"}html,body{margin:0;background:#030405;color:#e6ebf2}#boot{font:12px/1.4 monospace;letter-spacing:.2em;color:#58626f;padding:40px 16px;text-align:center}</style>
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
var fhNav = (user, current) => `<nav class="fh-nav" aria-label="FLOWHUB"><a href="/#dashboard">My Dashboard</a><a href="/#plan">Trading Plan</a><a href="/school"${current === "school" ? ' aria-current="page"' : ""}>Trading School</a><a href="/practice"${current === "practice" ? ' aria-current="page"' : ""}>Practice</a>${isStaff(user) ? '<a href="/#coach">Coach Portal</a>' : ""}</nav>`;
for (const page of ["school", "practice"]) {
  app.get(`/${page}`, async (c) => {
    const user = await currentUser(c);
    if (!user) return c.redirect("/");
    const a = await asset(`${page}.html`);
    if (!a) return c.text("This page isn't installed yet.", 404);
    const key = `${page}:${a.etag}`;
    if (!pageHtml.has(key)) pageHtml.set(key, gunzipSync(a.body).toString("utf8"));
    return c.html(pageHtml.get(key).replace("<!--FH_NAV-->", fhNav(user, page)), 200, { "Cache-Control": "no-cache" });
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
