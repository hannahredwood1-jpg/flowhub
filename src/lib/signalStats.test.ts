import { test } from "node:test";
import assert from "node:assert/strict";
import { byDay, currentStreak, equityCurve, etDay, groupBy, inRange, mondayOf, outcomeOf, rangeStart, sessionOf, strategyOf, tally, weekdayIdx, type SigRow } from "./signalStats";

let id = 0;
const row = (day: string, o: Partial<SigRow> = {}): SigRow => ({ id: ++id, received_at: `${day}T15:00:00Z`, indicator: "INVERTIX", direction: "LONG", entry_px: 100, stop_px: 90, target_px: 140, session_key: "ny_am", result: null, result_pts: null, headline: null, ...o });

test("outcomes follow the Signals rules", () => {
  assert.deepEqual(outcomeOf({ result: "target", result_pts: 40 }), { kind: "win", pts: 40 });
  assert.deepEqual(outcomeOf({ result: "stopped", result_pts: 25 }), { kind: "loss", pts: -25 });
  assert.deepEqual(outcomeOf({ result: "stopped", result_pts: -25 }), { kind: "loss", pts: -25 });
  assert.deepEqual(outcomeOf({ result: "be", result_pts: 0 }), { kind: "win", pts: 0 });
  assert.deepEqual(outcomeOf({ result: "manual", result_pts: 15 }), { kind: "win", pts: 15 });
  assert.deepEqual(outcomeOf({ result: "manual", result_pts: -12 }), { kind: "loss", pts: -12 });
  assert.deepEqual(outcomeOf({ result: null, result_pts: null }), { kind: "open", pts: 0 });
});

test("tally counts wins over wins + losses and leaves open entries out", () => {
  const t = tally([row("2026-10-26", { result: "target", result_pts: 40 }), row("2026-10-26", { result: "target", result_pts: 20 }), row("2026-10-27", { result: "stopped", result_pts: 30 }), row("2026-10-27")]);
  assert.equal(t.wins, 2); assert.equal(t.losses, 1); assert.equal(t.open, 1); assert.equal(t.entries, 4);
  assert.equal(t.rate, 2 / 3); assert.equal(t.pts, 30); assert.equal(t.avgWin, 30); assert.equal(t.avgLoss, -30);
  assert.equal(tally([row("2026-10-26")]).rate, null);
});

test("days use New York time and weeks start on Monday", () => {
  assert.equal(etDay("2026-10-27T01:30:00Z"), "2026-10-26");   // 9:30 PM ET the evening before
  assert.equal(mondayOf("2026-10-30"), "2026-10-26"); assert.equal(mondayOf("2026-11-01"), "2026-10-26"); assert.equal(weekdayIdx("2026-11-02"), 0);
  assert.equal(rangeStart("week", "2026-10-30"), "2026-10-26"); assert.equal(rangeStart("4w", "2026-10-30"), "2026-10-05");
  const rows = [row("2026-10-20", { result: "target", result_pts: 10 }), row("2026-10-28", { result: "target", result_pts: 10 })];
  assert.equal(inRange(rows, "week", "2026-10-30").length, 1); assert.equal(inRange(rows, "all", "2026-10-30").length, 2);
});

test("byDay lists Monday to Friday, and a weekend day only if something happened", () => {
  const rows = [row("2026-10-26", { result: "target", result_pts: 40 }), row("2026-10-28", { result: "stopped", result_pts: 20 }), row("2026-10-31", { result: "target", result_pts: 5 })];
  const d = byDay(rows, "2026-10-26", "2026-11-01");
  assert.deepEqual(d.map((x) => x.date), ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
  assert.equal(d[2].pts, -20); assert.equal(d[1].entries, 0);
});

test("groups, equity and streak", () => {
  const rows = [row("2026-10-26", { result: "target", result_pts: 40, session_key: "asia", indicator: "RB" }), row("2026-10-27", { result: "stopped", result_pts: 20, session_key: null }), row("2026-10-28", { result: "target", result_pts: 30 }), row("2026-10-29", { result: "target", result_pts: 12 })];
  const g = groupBy(rows, sessionOf, (k) => k);
  assert.equal(g[0].key, "ny_am"); assert.equal(g[0].pts, 42);                       // best first
  const o = groupBy(rows, sessionOf, (k) => k, ["asia", "london", "ny_am", "ny_pm", "other"]);
  assert.deepEqual(o.map((x) => x.key), ["asia", "ny_am", "other"]);
  assert.equal(strategyOf(rows[0]), "ECHO"); assert.equal(strategyOf(rows[1]), "INVERTIX");
  assert.deepEqual(equityCurve(rows).map((x) => x.pts), [40, 20, 50, 62]);
  assert.deepEqual(currentStreak(rows), { kind: "win", n: 2 });
});
