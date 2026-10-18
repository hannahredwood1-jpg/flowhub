import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clampPace, expectedPassed, finishDate, nudgeGapDays, paceStatus, weeksToFinish } from "./schoolPace";

test("weeks to finish and finish date follow the pace", () => {
  assert.equal(weeksToFinish(32, 4), 8);
  assert.equal(weeksToFinish(32, 10), 3);
  assert.equal(weeksToFinish(0, 4), 0);
  const d = finishDate(28, 4, new Date("2026-01-01T00:00:00Z"));
  assert.equal(d.toISOString().slice(0, 10), "2026-02-19");
});

test("pace is clamped to 1-14 a week", () => {
  assert.equal(clampPace(0), 4);
  assert.equal(clampPace(99), 14);
  assert.equal(clampPace(-3), 1);
});

test("status compares passed modules with where the pace says they should be", () => {
  const start = new Date("2026-01-01T00:00:00Z"), now = new Date("2026-01-15T00:00:00Z"); // 2 weeks in
  const exp = expectedPassed(0, 4, start, now, 32);
  assert.equal(exp, 8);
  assert.equal(paceStatus(9, exp, 32), "ahead");
  assert.equal(paceStatus(8, exp, 32), "on");
  assert.equal(paceStatus(7, exp, 32), "on");
  assert.equal(paceStatus(6, exp, 32), "behind");
  assert.equal(paceStatus(32, exp, 32), "done");
  assert.equal(expectedPassed(5, 4, start, now, 10), 10); // never above the total
});

test("reminder gap scales with pace", () => {
  assert.equal(nudgeGapDays(10), 2);
  assert.equal(nudgeGapDays(4), 3);
  assert.equal(nudgeGapDays(2), 5);
  assert.equal(nudgeGapDays(1), 6);
});

test("the school page uses the same presets", () => {
  const js = readFileSync(new URL("../../school/src/pace.js", import.meta.url), "utf8");
  for (const p of ["sprint:10", "steady:4", "relaxed:2"]) assert.ok(js.includes(p.replace(":", ":")), p);
});
