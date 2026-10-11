import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { summarizeSchool, SCHOOL_MODULES } from "./school";
import { planChecklist, planRiskPerTrade, type TradingPlanInput } from "./tradingPlan";

test("school summary counts steps, passed modules and exam attempts", () => {
  const s = summarizeSchool({ v2: { m: { m01: { s: "1111", p: 1, sc: 92, n: 2 }, m19: { s: "110" } } } }, ["m05"],
    [{ kind: "ex", ref: "m01", score: 23, total: 25, pass: true, createdAt: "2026-10-01T10:00:00Z" }, { kind: "ck", ref: "b1", score: 1, total: 1, pass: true, createdAt: "2026-10-01T10:00:00Z" }]);
  assert.equal(s.passed, 1);
  assert.equal(s.total, SCHOOL_MODULES.length);
  assert.equal(s.modules.find((x) => x.id === "m01")!.best, 92);
  assert.equal(s.modules.find((x) => x.id === "m19")!.stepsDone, 2);
  assert.equal(s.modules.find((x) => x.id === "m05")!.manualUnlock, true);
  assert.equal(s.current, "Module 1");
  assert.equal(s.attempts.length, 1);
  assert.equal(s.attempts[0].label, "Module 2 exam · Trading Mindset");
});

test("module list matches the school page content", () => {
  const dir = new URL("../../school/src/content/", import.meta.url);
  const src = readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
  const clean = (t: string) => t.replace(/\\'/g, "'");
  const found = [...[...src.matchAll(/(?:MODS\.push|quick)\(\{id:'(m\d+)',[^]*?\bt:'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], clean(m[2])]), ...[...src.matchAll(/common\('(m\d+)',\d+,\d+,'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], clean(m[2])])];
  assert.deepEqual([...found].sort(), SCHOOL_MODULES.map((m) => [m.id, m.title]).sort());
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

import { sniperOptions, recommended, minWinningDays } from "./evalSniper";
test("eval sniper: contracts to pass in N wins", () => {
  const o = sniperOptions({ remaining: 3000, drawdownRoom: 2000, dailyLossLimit: null, maxMinis: 5, maxMicros: 50, consistencyPct: 0.5, tp: 50, sl: 30 });
  const one = o.find((x) => x.wins === 1)!;
  assert.equal(one.instrument, "MNQ"); assert.equal(one.contracts, 30); assert.equal(one.perWin, 3000); assert.equal(one.risk, 1800);
  const nq = sniperOptions({ remaining: 3000, drawdownRoom: 2000, dailyLossLimit: null, maxMinis: 5, maxMicros: 20, consistencyPct: null, tp: 50, sl: 30 })[0];
  assert.equal(nq.instrument, "NQ"); assert.equal(nq.contracts, 3);
  assert.ok(!one.ok); // consistency needs 2+ days
  const r = recommended(o)!;
  assert.ok(r.ok && r.lossesToFail >= 2); assert.equal(r.wins, 2); assert.equal(r.contracts, 15);
  assert.equal(minWinningDays(0.4), 3);
  assert.equal(minWinningDays(null), 1);
});
