import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeSchool, DIVE_PARTS } from "./school";
import { planChecklist, planRiskPerTrade, type TradingPlanInput } from "./tradingPlan";

test("school summary counts lessons, checkpoints and exams", () => {
  const s = summarizeSchool({ ch: ["chart", "connect", "order"], dives: { futures: Object.fromEntries(Array.from({ length: DIVE_PARTS.futures }, (_, i) => [`s${i}`, 1])), charts: { candle: 1 } }, ck: { b1: { best: 0.86, pass: true } }, ex: {} }, ["intermediate"],
    [{ kind: "ck", ref: "b1", score: 6, total: 7, pass: true, createdAt: "2026-10-01T10:00:00Z" }]);
  const b = s.levels[0];
  assert.equal(b.lessonsDone, 3); // futures dive + chart + connect/order
  assert.equal(b.checkpointsPassed, 1);
  assert.equal(b.checkpoints, 4);
  assert.equal(s.levels[1].manualUnlock, true);
  assert.equal(s.current, "Beginner");
  assert.equal(s.attempts[0].label, "Checkpoint · How futures & NQ work");
});

test("trading plan validates and drives the checklist", () => {
  const p: TradingPlanInput = ({ schedule: { days: ["Mon", "Tue"], sessions: ["NY"], start: "09:30", end: "11:00" }, models: ["ECHO_X_ORBIT"],
    entries: { entry: "both", stopPts: 15, targetPts: 40, beAt1R: true, partials: false },
    risk: { instrument: "MNQ", contracts: 3, maxLossesPerDay: 2, maxTradesPerDay: 3, dailyProfitStop: null, noNews: true },
    numbers: { monthlyGoal: 2000, tradingDays: 20 }, rules: ["No trades after a 2R win"] });
  assert.equal(planRiskPerTrade(p), 90);
  const c = planChecklist(p);
  assert.match(c[0], /9:30 AM–11:00 AM/);
  assert.match(c[3], /15-pt stop, 40-pt target, 3 MNQ/);
  assert.equal(c[c.length - 1], "No trades after a 2R win");
});
