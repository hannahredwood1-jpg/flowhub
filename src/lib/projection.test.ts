import { test } from "node:test";
import assert from "node:assert/strict";
import rows from "../../prisma/data/prop_firm_accounts.json";
import { rowToTemplate, type CatalogRow } from "./catalog";
import type { Strategy } from "./planner";
import { buildDayPlan, expectedIncome, planAccount, simulateProjection, type ProjectionRow } from "./projection";

// NYFlow H/L (84%) at 1.5R, 3 trades a day, 20-pt NQ stop
const strat: Strategy = { winRate: 0.84, avgRR: 1.5, tradesPerDay: 3, instrument: "NQ", avgStopPoints: 20, tradingDaysPerWeek: 5 };
const tpl = (id: string) => {
  const t = (rows as CatalogRow[]).map(rowToTemplate).find((x) => x.id === id);
  assert.ok(t, id);
  return t!;
};
const row = (id: string, quantity: number, start: "EVAL" | "FUNDED", cost = 0, fee = 0): ProjectionRow =>
  ({ key: id, label: id, rules: tpl(id), quantity, start, costPerAttempt: cost, monthlyFee: fee, payoutCap: null });

test("planAccount: eval and funded plans stay inside the firm's rules", () => {
  const p = planAccount(tpl("lucid-trading--lucidflex--50k"), strat);
  assert.ok(p.eval);
  assert.ok(p.eval!.riskPerTrade > 0 && p.eval!.riskPerTrade <= 2000 / 4, "risk survives several losses");
  assert.ok(p.eval!.dailyStop <= 2000 * 0.35);
  assert.ok(p.eval!.daysToPass! >= p.eval!.minDays);
  if (p.eval!.bestDayCap) assert.ok(p.eval!.walkAway <= p.eval!.bestDayCap, "walk-away respects consistency");
  assert.ok(p.funded.expectedMonthlyTakeHome > 0);
  assert.ok(p.funded.expectedMonthlyTakeHome <= p.funded.expectedMonthlyGross);
});

test("planAccount: instant-funded accounts have no evaluation", () => {
  const p = planAccount(tpl("lucid-trading--luciddirect-instant-funded--50k"), strat);
  assert.equal(p.eval, null);
});

test("planAccount: risk level scales risk per trade", () => {
  const r = tpl("apex-trader-funding--eod-trailing--50k");
  const c = planAccount(r, strat, "CONSERVATIVE").funded.riskPerTrade;
  const s = planAccount(r, strat, "STANDARD").funded.riskPerTrade;
  const a = planAccount(r, strat, "AGGRESSIVE").funded.riskPerTrade;
  assert.ok(c < s && s < a, `${c} < ${s} < ${a}`);
});

test("expectedIncome: scales with copies and reports units needed for the goal", () => {
  const one = expectedIncome([row("lucid-trading--lucidflex--50k", 1, "FUNDED")], strat, "STANDARD", 10000);
  const three = expectedIncome([row("lucid-trading--lucidflex--50k", 3, "FUNDED")], strat, "STANDARD", 10000);
  assert.ok(Math.abs(three.monthlyTakeHome - one.monthlyTakeHome * 3) <= 15);
  assert.ok(one.unitsForGoal! >= 1);
  assert.equal(three.fundedUnits, 3);
});

test("simulateProjection: funded accounts earn, evals cost first, percentiles ordered", () => {
  const res = simulateProjection(
    [row("lucid-trading--lucidflex--50k", 2, "EVAL", 100, 0), row("apex-trader-funding--eod-trailing--50k", 1, "FUNDED")],
    strat, { months: 6, riskLevel: "STANDARD", rebuyOnFail: true }, { runs: 300 },
  );
  assert.equal(res.months.length, 6);
  for (const m of res.months) assert.ok(m.p10 <= m.p50 && m.p50 <= m.p90, `month ${m.month}`);
  assert.ok(res.months[0].costs >= 200, "first attempt fees charged in month 1");
  assert.ok(res.totalP50 > 0, "profitable strategy should net positive over 6 months");
  assert.ok(res.months[5].fundedUnits >= 1);
  const lucid = res.rows[0];
  assert.ok(lucid.passRate! > 0.3 && lucid.passRate! <= 1);
  assert.ok(lucid.avgAttempts >= 1);
  assert.equal(res.rows[1].passRate, null, "already-funded rows have no pass rate");
  assert.ok(res.firstPayoutMonthP50 != null && res.firstPayoutMonthP50 <= 3);
});

test("simulateProjection: deterministic for the same seed", () => {
  const rs = [row("topstep--trading-combine--50k", 1, "EVAL", 50, 49)];
  const a = simulateProjection(rs, strat, { months: 3, riskLevel: "STANDARD", rebuyOnFail: false }, { runs: 200, seed: 3 });
  const b = simulateProjection(rs, strat, { months: 3, riskLevel: "STANDARD", rebuyOnFail: false }, { runs: 200, seed: 3 });
  assert.deepEqual(a, b);
});

test("simulateProjection: a losing strategy loses money", () => {
  const bad: Strategy = { ...strat, winRate: 0.3, avgRR: 1 };
  const res = simulateProjection([row("apex-trader-funding--eod-trailing--50k", 1, "EVAL", 150)], bad, { months: 4, riskLevel: "STANDARD", rebuyOnFail: true }, { runs: 200 });
  assert.ok(res.totalP50 < 0);
});

test("buildDayPlan: totals add up across copies", () => {
  const rs = [row("lucid-trading--lucidflex--50k", 3, "EVAL"), row("apex-trader-funding--eod-trailing--50k", 2, "FUNDED")];
  const d = buildDayPlan(rs, strat, "STANDARD");
  const expectRisk = d.rows.reduce((s, r) => s + r.plan.riskPerTrade * r.quantity, 0);
  assert.ok(Math.abs(d.totalRisk - expectRisk) <= 5);
  assert.equal(d.rows[0].phase, "EVAL");
  assert.equal(d.rows[1].phase, "FUNDED");
  assert.equal(d.maxTrades, 3);
  assert.ok(d.maxLosses >= 1);
});

test("payout caps limit monthly take-home", () => {
  const capped = { ...row("lucid-trading--lucidflex--50k", 1, "FUNDED"), payoutCap: 2000 };
  const e = expectedIncome([capped], strat, "STANDARD", null);
  assert.ok(e.monthlyTakeHome <= 2000);
  const res = simulateProjection([capped], strat, { months: 4, riskLevel: "STANDARD", rebuyOnFail: false }, { runs: 200 });
  for (const m of res.months) assert.ok(m.p90 <= 2000 + 1, `month ${m.month}: ${m.p90}`);
});
