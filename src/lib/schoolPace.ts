// Trading School pace (not the account pace in pace.ts): the student picks how many modules a week they will pass, and everything else
// (finish date, on-track status, reminder timing) comes from that one number. The school page keeps
// its own small copy of these formulas (school/src/pace.js); a test keeps the two in step.
export const PACE_PRESETS = [
  { id: "sprint", name: "Sprint", perWeek: 10 },
  { id: "steady", name: "Steady", perWeek: 4 },
  { id: "relaxed", name: "Relaxed", perWeek: 2 },
] as const;
export const PACE_MIN = 1;
export const PACE_MAX = 14;
export const PACE_MAX_NUDGES = 3; // reminders in a row with no activity in between, then we stop

export type PaceStatus = "done" | "ahead" | "on" | "behind";
const DAY = 86400_000;

export const clampPace = (n: unknown) => Math.max(PACE_MIN, Math.min(PACE_MAX, Math.round(Number(n) || 0) || 4));

export function weeksToFinish(remaining: number, perWeek: number) {
  return remaining <= 0 ? 0 : Math.max(1, Math.round(remaining / clampPace(perWeek)));
}
export function finishDate(remaining: number, perWeek: number, from: Date) {
  return new Date(from.getTime() + (remaining <= 0 ? 0 : (remaining / clampPace(perWeek)) * 7 * DAY));
}
/** Modules that should be passed by `now` if they kept to the pace since `startedAt`. */
export function expectedPassed(baseline: number, perWeek: number, startedAt: Date, now: Date, total: number) {
  const weeks = Math.max(0, now.getTime() - startedAt.getTime()) / (7 * DAY);
  return Math.min(total, baseline + Math.floor(clampPace(perWeek) * weeks));
}
export function paceStatus(passed: number, expected: number, total: number): PaceStatus {
  if (passed >= total) return "done";
  if (passed > expected) return "ahead";
  if (passed >= expected - 1) return "on"; // one module of grace
  return "behind";
}
/** Days of silence before a reminder: about one study gap at their pace, never under 2 or over 6. */
export const nudgeGapDays = (perWeek: number) => Math.max(2, Math.min(6, Math.round(7 / clampPace(perWeek)) + 1));
