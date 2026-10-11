import { test } from "node:test";
import assert from "node:assert/strict";
import { practiceTier, summarizePractice } from "./practice";

test("tiers need both reps and accuracy", () => {
  assert.equal(practiceTier(4, 1), "none");
  assert.equal(practiceTier(5, 0.2), "bronze");
  assert.equal(practiceTier(20, 0.69), "bronze");
  assert.equal(practiceTier(20, 0.7), "silver");
  assert.equal(practiceTier(60, 0.85), "gold");
  assert.equal(practiceTier(120, 0.9), "elite");
});

test("summary: accuracy on the last 40 reps per model, top mistakes, week count", () => {
  const now = Date.UTC(2026, 9, 2);
  const old = new Date(now - 30 * 864e5);
  const rows = [
    ...Array.from({ length: 6 }, () => ({ model: "esc", drill: "mark", ok: false, tags: ["early-entry"], createdAt: old })),
    ...Array.from({ length: 40 }, (_, i) => ({ model: "esc", drill: "mark", ok: i % 4 !== 0, tags: i % 4 ? [] : ["stop-inside"], createdAt: new Date(now - 864e5) })),
    { model: "dl", drill: "limit", ok: false, tags: ["limit-no-lrl", "be-missed"], createdAt: new Date(now - 3600e3) },
  ];
  const s = summarizePractice(rows, now)!;
  const hl = s.models.find((m) => m.model === "esc")!;
  assert.equal(hl.reps, 46);
  assert.equal(hl.accuracy, 0.75); // only the last 40 count
  assert.equal(hl.tier, "silver");
  assert.equal(s.repsThisWeek, 41);
  assert.equal(s.mistakes[0].tag, "stop-inside");
  assert.equal(s.models.find((m) => m.model === "exo")!.accuracy, null);
  assert.equal(summarizePractice([]), null);
});
