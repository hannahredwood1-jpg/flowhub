import { test } from "node:test";
import assert from "node:assert/strict";
import rows from "../../prisma/data/prop_firm_accounts.json";
import { rowToTemplate, parseDollar, parseConsistency, parseDrawdownModel, type CatalogRow } from "./catalog";
import {
  buildIncomePlan, buildPassPlan, expectancyR, expectedLosingStreak, minDaysForConsistency, parseSplit, simulatePass,
  type RuleSet, type Strategy,
} from "./planner";
import { computePace, weekdaysBetween, memberRiskSummary } from "./pace";

const strat: Strategy = { winRate: 0.5, avgRR: 2, tradesPerDay: 3, instrument: "NQ", avgStopPoints: 15, tradingDaysPerWeek: 5 };
const templates = (rows as CatalogRow[]).map(rowToTemplate);
const tpl = (id: string): RuleSet => {
  const t = templates.find((x) => x.id === id);
  assert.ok(t, `missing template ${id}`);
  return t!;
};

// ── Catalog parsing ─────────────────────────────────────────
test("catalog: every row converts to a usable template", () => {
  assert.equal(templates.length, 90);
  assert.equal(new Set(templates.map((t) => t.id)).size, 90);
  for (const t of templates) {
    assert.ok(t.maxLoss > 0 && t.accountSize > 0, t.id);
    assert.ok(t.profitTarget === null || t.profitTarget > 0, t.id);
  }
});

test("catalog: rule text parsing", () => {
  assert.equal(parseDollar("$1,250 soft breach"), 1250);
  assert.equal(parseDollar("Optional $2,000 (choose at purchase)"), 2000);
  assert.equal(parseDollar("None (optional DLL at checkout)"), null);
  assert.equal(parseConsistency("Best day < 55% of profit target"), 55);
  assert.equal(parseConsistency("None in eval; 40% once qualified"), null);
  assert.equal(parseConsistency("50% (eval only)"), 50);
  assert.equal(parseDrawdownModel("Intraday trailing (includes open P/L)"), "INTRADAY_TRAILING");
  assert.equal(parseDrawdownModel("EOD trailing in eval; intraday trailing once funded"), "EOD_TRAILING");
});

test("catalog: spot-check researched values", () => {
  const mffu = tpl("my-funded-futures--rapid-eod--50k");
  assert.deepEqual([mffu.profitTarget, mffu.maxLoss, mffu.consistencyPct, mffu.minDays], [3000, 2000, 30, 4]);
  const lucid = tpl("lucid-trading--lucidpro--50k");
  assert.equal(lucid.dailyLossLimit, 1200);
  assert.equal(tpl("tradeify--lightning-instant-funded--100k").profitTarget, null);
});

// ── Core math ───────────────────────────────────────────────
test("expectancy, losing streak, split, consistency days", () => {
  assert.equal(expectancyR(0.5, 2), 0.5);
  assert.ok(Math.abs(expectancyR(0.4, 1) - -0.2) < 1e-9);
  assert.equal(expectedLosingStreak(0.5, 64), 6); // ln64/ln2
  assert.equal(parseSplit("90/10"), 0.9);
  assert.equal(parseSplit("100% of first $10K, then 90/10"), 0.9);
  assert.equal(parseSplit(""), 0.9);
  assert.equal(minDaysForConsistency(50), 2);
  assert.equal(minDaysForConsistency(40), 3);
  assert.equal(minDaysForConsistency(30), 4); // matches MFFU Rapid EOD's stated 4-day minimum
  assert.equal(minDaysForConsistency(55), 2);
  assert.equal(minDaysForConsistency(null), 1);
});

// ── Pass plan ───────────────────────────────────────────────
test("pass plan: consistent numbers for MFFU 50K Rapid", () => {
  const rules = tpl("my-funded-futures--rapid-intraday--50k");
  const p = buildPassPlan(rules, strat)!;
  assert.ok(p.days >= 2);
  assert.ok(Math.abs(p.dailyGoal * p.days - 3000) <= 5 * p.days);
  assert.ok(p.riskPerTrade <= p.riskCap);
  assert.ok(p.riskPerTrade > 0);
  assert.ok(p.bestDayCap === 1500);
  assert.ok(p.contracts.micros <= rules.maxMicros && p.contracts.minis <= rules.maxMinis);
  assert.ok(p.lossesToFail >= p.expectedLosingStreak, "plan must survive an expected losing streak");
});

test("pass plan: too-fast target is raised to the consistency minimum", () => {
  const p = buildPassPlan(tpl("tradeify--select--50k"), strat, { targetDays: 1 })!;
  assert.equal(p.days, 3);
  assert.ok(p.warnings.some((w) => w.includes("under 3 trading days")));
});

test("pass plan: aggressive pace warns and caps risk", () => {
  const p = buildPassPlan(tpl("apex-trader-funding--intraday-trailing--50k"), strat, { targetDays: 1 })!;
  assert.equal(p.riskPerTrade, p.riskCap);
  assert.ok(p.warnings.some((w) => w.includes("above the safe cap")));
});

test("pass plan: negative edge and instant-funded", () => {
  const p = buildPassPlan(tpl("topstep--trading-combine--50k"), { ...strat, winRate: 0.3, avgRR: 1.5 })!;
  assert.ok(p.warnings.some((w) => w.includes("negative edge")));
  assert.equal(buildPassPlan(tpl("alpha-futures--direct-instant-funded--50k"), strat), null);
});

// ── Simulation ──────────────────────────────────────────────
test("simulation: deterministic and sensitive to risk", () => {
  const rules = tpl("lucid-trading--lucidflex--50k");
  const plan = buildPassPlan(rules, strat)!;
  const a = simulatePass(rules, strat, plan, { runs: 1500 });
  const b = simulatePass(rules, strat, plan, { runs: 1500 });
  assert.deepEqual(a, b);
  assert.ok(a.passRate > 0.3 && a.passRate <= 1, `passRate ${a.passRate}`);
  const reckless = simulatePass(rules, strat, { ...plan, riskPerTrade: 900, dailyStop: 5000 }, { runs: 1500 });
  assert.ok(reckless.failRate > a.failRate, `reckless ${reckless.failRate} vs ${a.failRate}`);
});

// ── Income plan ─────────────────────────────────────────────
test("income plan: goal splits monthly → weekly → daily per account", () => {
  const rules = tpl("my-funded-futures--rapid-intraday--50k");
  const plan = buildIncomePlan(5000, [
    { id: "a", label: "MFFU A", rules, quantity: 1, funded: true },
    { id: "b", label: "MFFU B", rules, quantity: 1, funded: true },
  ], strat);
  assert.equal(plan.fundedAccountCount, 2);
  assert.equal(plan.perAccount[0].monthlyGross, 2780); // 2500 / 0.9 → 2777.8 → nearest $5
  assert.equal(plan.weeklyGoal, 1155);                 // 5000 * 12 / 52
  assert.equal(plan.tradingDaysPerMonth, 21.7);
  assert.ok(plan.accountsNeeded! >= 1);
});

test("income plan: no funded accounts yet → warning", () => {
  const plan = buildIncomePlan(3000, [{ id: "e", label: "Eval", rules: tpl("topstep--trading-combine--50k"), quantity: 1, funded: false }], strat);
  assert.ok(plan.warnings[0].includes("No funded accounts"));
});

// ── Pace ────────────────────────────────────────────────────
test("pace: weekday counting", () => {
  assert.equal(weekdaysBetween("2026-09-21", "2026-09-27"), 5); // Mon → Sun
});

test("pace: EOD trailing floor trails then locks at starting balance", () => {
  const rules = tpl("topstep--trading-combine--50k"); // $2,000 EOD, locks at start
  const p = computePace({
    rules, startDate: "2026-09-21", today: "2026-09-25", dailyGoal: 600, mode: "EVAL",
    trades: [{ date: "2026-09-21", pnl: 1000 }, { date: "2026-09-22", pnl: 1500 }, { date: "2026-09-23", pnl: -500 }],
  });
  assert.equal(p.profit, 2000);
  assert.equal(p.floor, 50000);          // 52,500 - 2,000 = 50,500 → capped at 50,000
  assert.equal(p.drawdownRoom, 2000);
  assert.equal(p.bestDayShare, 0.75);    // 1,500 of 2,000 profit
  assert.equal(p.consistencyOk, false);  // Topstep 55%
  assert.equal(p.status, "AT_RISK");
});

test("pace: statuses", () => {
  const rules = tpl("apex-trader-funding--eod-trailing--50k");
  const base = { rules, startDate: "2026-09-21", today: "2026-09-25", dailyGoal: 600, mode: "EVAL" as const };
  assert.equal(computePace({ ...base, trades: [] }).status, "NO_TRADES");
  assert.equal(computePace({ ...base, trades: [{ date: "2026-09-21", pnl: 3100 }] }).status, "PASSED");
  assert.equal(computePace({ ...base, trades: [{ date: "2026-09-21", pnl: -2000 }] }).status, "FAILED");
  assert.equal(computePace({ ...base, trades: [{ date: "2026-09-21", pnl: -1700 }] }).status, "AT_RISK");
  assert.equal(computePace({ ...base, trades: [{ date: "2026-09-21", pnl: 300 }, { date: "2026-09-22", pnl: 200 }] }).status, "BEHIND");
  assert.equal(computePace({ ...base, trades: ["21", "22", "23", "24", "25"].map((d) => ({ date: `2026-09-${d}`, pnl: 580 })) }).status, "ON_PACE");
});

test("pace: coach risk rollup", () => {
  const rules = tpl("apex-trader-funding--eod-trailing--50k");
  const base = { rules, startDate: "2026-09-21", today: "2026-09-25", dailyGoal: 600, mode: "EVAL" as const };
  const s = memberRiskSummary([
    computePace({ ...base, trades: [{ date: "2026-09-21", pnl: -1500 }] }),
    computePace({ ...base, trades: [{ date: "2026-09-24", pnl: 400 }] }),
  ]);
  assert.equal(s.drawdownRisk, 0.75);
  assert.equal(s.lastTradeDate, "2026-09-24");
});

// ── FLOWMTD strategies ──────────────────────────────────────
import { blendedWinRate, normalizeSelection, sessionsOf } from "./strategies";

test("strategies: fixed win rates and selection rules", () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  near(blendedWinRate({ mode: "DAILY_LEVELS", multiSession: true, strategies: ["NYFLOW_HL"] }), 0.94); // ECHO X ORBIT
  near(blendedWinRate({ mode: "INDICATORS", multiSession: false, strategies: ["NYFLOW_HL"] }), 0.84);
  near(blendedWinRate({ mode: "INDICATORS", multiSession: false, strategies: ["NYFLOW_PO3", "NYFLOW_HL"] }), (0.745 + 0.84) / 2);
  near(blendedWinRate({ mode: "INDICATORS", multiSession: true, strategies: ["ASIAFLOW_PO3", "ASIAFLOW_A3IA", "NYFLOW_PO3", "NYFLOW_HL"] }), (0.7 + 0.745 + 0.84) / 3); // A3IA retired
  // single session keeps only the first indicator's setups
  assert.deepEqual(normalizeSelection({ mode: "INDICATORS", multiSession: false, strategies: ["ASIAFLOW_PO3", "NYFLOW_HL"] }).strategies, ["ASIAFLOW_PO3"]);
  assert.deepEqual(sessionsOf({ mode: "INDICATORS", multiSession: true, strategies: ["ASIAFLOW_PO3", "NYFLOW_HL"] }), ["ASIA", "NY"]);
  assert.deepEqual(normalizeSelection({ mode: "DAILY_LEVELS", multiSession: true, strategies: [] }).strategies, ["DAILY_LEVELS"]);
});
