import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGoalPlan, breakdownOf, comfortFrom, defaultAnswers, fitFor, monthPath, recommendAccounts, requirementsOf, STYLE_PRESETS } from "./goalPlan";
import { PROP_PRICES } from "./propPrices";
import { rowToTemplate, type CatalogRow } from "./catalog";
import type { CatalogFirm } from "./types";

const rows = JSON.parse(readFileSync(new URL("../../prisma/data/prop_firm_accounts.json", import.meta.url), "utf8")) as CatalogRow[];
const catalog: CatalogFirm[] = [];
for (const r of rows) {
  const t = rowToTemplate(r);
  let f = catalog.find((x) => x.firm === r.firm); if (!f) catalog.push((f = { firm: r.firm, plans: [] }));
  let p = f.plans.find((x) => x.plan === r.plan); if (!p) f.plans.push((p = { plan: r.plan, sizes: [] }));
  p.sizes.push({ id: r.id, accountSize: t.accountSize, profitTarget: t.profitTarget, maxLoss: t.maxLoss, dailyLossLimit: t.dailyLossLimit, consistencyPct: t.consistencyPct, minDays: t.minDays, drawdownNote: t.drawdownNote, dataStatus: t.dataStatus, drawdownModel: t.drawdownModel, maxMinis: t.maxMinis, maxMicros: t.maxMicros, profitSplit: t.profitSplit, notes: t.notes });
}

test("the goal breaks down into weekly, daily and per-trade numbers", () => {
  const b = breakdownOf(defaultAnswers({ monthlyGoal: 2600, daysPerWeek: 5, tradesPerDay: 2 }));
  assert.equal(b.monthly, 2600);
  assert.equal(b.weekly, 600);                       // 2600 × 12 / 52
  assert.ok(Math.abs(b.tradingDaysPerMonth - 21.7) < 0.1);
  assert.ok(b.grossMonthly > b.monthly);              // the firm keeps a share
  assert.equal(b.tradesPerMonth, Math.round(b.tradingDaysPerMonth * 2));
});

test("what it takes: risk per trade follows from the goal and the edge, and a negative edge is flagged", () => {
  const a = defaultAnswers({ monthlyGoal: 2000, winRate: 0.5, stopPts: 20, targetPts: 30, tradesPerDay: 2 });
  const r = requirementsOf(a);
  assert.equal(r.rr, 1.5);
  assert.ok(Math.abs(r.expectancyR - 0.25) < 1e-9);
  assert.ok(r.riskPerTrade != null && r.riskPerTrade > 0);
  const bad = requirementsOf(defaultAnswers({ winRate: 0.3, stopPts: 20, targetPts: 20 }));
  assert.equal(bad.riskPerTrade, null);
  assert.equal(buildGoalPlan(defaultAnswers({ winRate: 0.3, stopPts: 20, targetPts: 20 }), catalog).picks.length, 0);
});

test("recommendations: at most three, one per firm, ranked, each with reasons", () => {
  const picks = recommendAccounts(defaultAnswers({ monthlyGoal: 1500, budget: 600 }), catalog, { runs: 150 });
  assert.ok(picks.length >= 1 && picks.length <= 3);
  assert.equal(new Set(picks.map((p) => p.firm)).size, picks.length);
  for (let i = 1; i < picks.length; i++) assert.ok(picks[i - 1].score >= picks[i].score);
  for (const p of picks) { assert.ok(p.reasons.length >= 4); assert.ok(p.accountsNeeded >= 1); assert.ok(p.riskPerTrade > 0); }
});

test("a smaller goal never needs more accounts than a bigger one on the same account", () => {
  const small = recommendAccounts(defaultAnswers({ monthlyGoal: 1000 }), catalog, { runs: 100 })[0];
  const big = recommendAccounts(defaultAnswers({ monthlyGoal: 8000 }), catalog, { runs: 100 }).find((p) => p.templateId === small.templateId) ?? recommendAccounts(defaultAnswers({ monthlyGoal: 8000 }), catalog, { runs: 100 })[0];
  assert.ok(small.accountsNeeded <= big.accountsNeeded || small.templateId !== big.templateId);
});

test("a low budget is respected or clearly flagged", () => {
  const tight = recommendAccounts(defaultAnswers({ monthlyGoal: 6000, budget: 150 }), catalog, { runs: 100 });
  for (const p of tight) assert.ok(p.withinBudget || p.reasons.some((r) => r.includes("above your")));
});

test("style presets set sensible starting assumptions", () => {
  for (const s of Object.values(STYLE_PRESETS)) assert.ok(s.winRate > 0 && s.winRate < 1 && s.targetPts / s.stopPts >= 1);
});

test("the month path has a target line and actual P&L only up to today", () => {
  const path = monthPath([{ tradeDate: "2026-11-03", pnl: 200 }, { tradeDate: "2026-11-04", pnl: -50 }], "2026-11-10", 2000);
  assert.equal(path.length, 30);
  assert.equal(path[2].actual, 200); assert.equal(path[3].actual, 150);
  assert.equal(path[10].actual, null);
  assert.equal(path[29].target, 2000);
});

test("real prices are used where confirmed and an estimate is flagged where not", () => {
  const picks = recommendAccounts(defaultAnswers({ monthlyGoal: 1500, budget: 800 }), catalog, { runs: 100 });
  for (const p of picks) {
    if (p.priceKnown) assert.ok(p.price && p.reasons.some((r) => r.startsWith("Price: $")));
    else assert.ok(p.reasons.some((r) => r.includes("could not confirm")));
    assert.ok(p.costEach > 0 && p.evalSpend === p.costEach * p.accountsNeeded);
  }
});

test("strengths and weaknesses steer the ranking in plain, stated ways", () => {
  const base = defaultAnswers({ monthlyGoal: 1500, budget: 2000 });
  const tilt = fitFor({ ...base, weaknesses: ["overtrade", "revenge"] }, { accountSize: 50000, profitTarget: 3000, maxLoss: 2000, drawdownModel: "EOD_TRAILING", dailyLossLimit: 1000, consistencyPct: null, minDays: 1, maxMinis: 5, maxMicros: 50 });
  const none = fitFor({ ...base, weaknesses: ["overtrade", "revenge"] }, { accountSize: 50000, profitTarget: 3000, maxLoss: 2000, drawdownModel: "INTRADAY_TRAILING", dailyLossLimit: null, consistencyPct: null, minDays: 1, maxMinis: 5, maxMicros: 50 });
  assert.ok(tilt.score > none.score);
  assert.ok(tilt.reasons[0].includes("daily loss limit"));
  const runner = fitFor({ ...base, strengths: ["runner"] }, { accountSize: 50000, profitTarget: 3000, maxLoss: 2000, drawdownModel: "EOD_TRAILING", dailyLossLimit: null, consistencyPct: 40, minDays: 1, maxMinis: 5, maxMicros: 50 });
  assert.ok(runner.score < 0);
  assert.equal(comfortFrom(["calm", "discipline"], [], "experienced"), 600);
  assert.equal(comfortFrom([], ["overtrade"], "new"), 150);
});

test("prices: every confirmed price belongs to a real account in the catalog", () => {
  const ids = new Set(rows.map((r) => r.id));
  for (const id of Object.keys(PROP_PRICES)) assert.ok(ids.has(id), id);
  assert.ok(Object.keys(PROP_PRICES).length >= 40);
});
