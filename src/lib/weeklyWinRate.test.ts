import { test } from "node:test";
import assert from "node:assert/strict";
import { mondayOf, shareText, weeklyWinRate, weekWinRate, type WinRow } from "./weeklyWinRate";

const r = (tradeDate: string, outcome: WinRow["outcome"]): WinRow => ({ tradeDate, outcome });

test("weeks run Monday to Sunday", () => {
  assert.equal(mondayOf("2026-10-30"), "2026-10-26"); // Friday
  assert.equal(mondayOf("2026-10-26"), "2026-10-26");
  assert.equal(mondayOf("2026-11-01"), "2026-10-26"); // Sunday
  assert.equal(mondayOf("2026-11-02"), "2026-11-02");
});

test("win rate counts wins over wins + losses, breakeven shown but not counted", () => {
  const w = weekWinRate([r("2026-10-26", "WIN"), r("2026-10-27", "WIN"), r("2026-10-28", "LOSS"), r("2026-10-29", "BREAKEVEN"), r("2026-10-25", "LOSS"), r("2026-11-02", "LOSS")], "2026-10-26");
  assert.equal(w.wins, 2); assert.equal(w.losses, 1); assert.equal(w.breakeven, 1); assert.equal(w.trades, 4);
  assert.equal(w.rate, 2 / 3);
  assert.equal(w.label, "Oct 26 – Nov 1");
});

test("an empty or breakeven-only week has no rate", () => {
  assert.equal(weekWinRate([], "2026-10-26").rate, null);
  assert.equal(weekWinRate([r("2026-10-26", "BREAKEVEN")], "2026-10-26").rate, null);
});

test("history is newest first and includes the current week", () => {
  const w = weeklyWinRate([r("2026-10-20", "WIN"), r("2026-10-28", "LOSS")], "2026-10-30");
  assert.equal(w.history.length, 8);
  assert.equal(w.current.weekStart, "2026-10-26");
  assert.equal(w.previous.weekStart, "2026-10-19");
  assert.equal(w.current.rate, 0); assert.equal(w.previous.rate, 1);
});

test("share text", () => {
  const w = weekWinRate([r("2026-10-26", "WIN"), r("2026-10-27", "LOSS"), r("2026-10-28", "WIN")], "2026-10-26");
  assert.equal(shareText(w), "📊 FLOWMTD · Weekly win rate (Oct 26 – Nov 1)\n67% · 2W / 1L · 3 trades");
});
