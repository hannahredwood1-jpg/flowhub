// Signal stats for the coach portal: every number comes from the results Hannah enters for each trade entry.
// Same rules as the weekly win rate: a target, a break-even or a manual close at 0 or better is a win, a stop (or a manual close below 0) is a loss,
// and an entry with no result yet is "open" and counts nowhere. Points: wins add their size, stops count against.
export type SigRow = {
  id: number; received_at: string; indicator: string | null; direction: string | null; entry_px: number | null; stop_px: number | null;
  target_px: number | null; session_key: string | null; result: string | null; result_pts: number | null; headline: string | null;
};
export type Outcome = { kind: "win" | "loss" | "open"; pts: number };

export const STRATEGY_LABEL: Record<string, string> = { INVERTIX: "INVERTIX", RB: "ECHO", ORBIT: "ORBIT", EXO: "ECHO X ORBIT (earlier)", HL: "H/L", PO3: "PO3", NEWS: "News fade" };
export const SESSION_LABEL: Record<string, string> = { asia: "Asia", london: "London", ny_am: "NY morning", ny_pm: "NY afternoon", other: "Other times" };
export const SESSION_ORDER = ["asia", "london", "ny_am", "ny_pm", "other"];
export const strategyOf = (r: SigRow) => STRATEGY_LABEL[r.indicator ?? ""] ?? (r.indicator || "Other");
export const sessionOf = (r: SigRow) => r.session_key ?? "other";

export function outcomeOf(r: Pick<SigRow, "result" | "result_pts">): Outcome {
  const p = Number(r.result_pts) || 0;
  const res = r.result === "manual" ? (Number(r.result_pts) >= 0 ? "target" : "stopped") : r.result;
  if (!res) return { kind: "open", pts: 0 };
  if (res === "stopped") return { kind: "loss", pts: -Math.abs(p) };
  return { kind: "win", pts: res === "be" ? p : Math.abs(p) };
}

const fmtET = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
/** The New York calendar day of a timestamp, YYYY-MM-DD. */
export const etDay = (iso: string) => fmtET.format(new Date(iso));
const noon = (ymd: string) => Date.parse(ymd + "T12:00:00Z");
export const addDays = (ymd: string, n: number) => new Date(noon(ymd) + n * 86400000).toISOString().slice(0, 10);
export const mondayOf = (ymd: string) => addDays(ymd, -((new Date(noon(ymd)).getUTCDay() + 6) % 7));
/** 0 = Monday … 6 = Sunday */
export const weekdayIdx = (ymd: string) => (new Date(noon(ymd)).getUTCDay() + 6) % 7;
export const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type Tally = { entries: number; wins: number; losses: number; open: number; pts: number; rate: number | null; avgWin: number | null; avgLoss: number | null };
export function tally(rows: SigRow[]): Tally {
  let wins = 0, losses = 0, open = 0, pts = 0, wp = 0, lp = 0;
  for (const r of rows) { const o = outcomeOf(r); if (o.kind === "open") open++; else if (o.kind === "win") { wins++; wp += o.pts; pts += o.pts; } else { losses++; lp += o.pts; pts += o.pts; } }
  return { entries: rows.length, wins, losses, open, pts, rate: wins + losses ? wins / (wins + losses) : null, avgWin: wins ? wp / wins : null, avgLoss: losses ? lp / losses : null };
}

export type Group = Tally & { key: string; label: string };
export function groupBy(rows: SigRow[], key: (r: SigRow) => string, label: (k: string) => string, order?: string[]): Group[] {
  const m = new Map<string, SigRow[]>();
  for (const r of rows) { const k = key(r); (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
  const keys = [...m.keys()];
  keys.sort(order ? (a, b) => order.indexOf(a) - order.indexOf(b) : (a, b) => tally(m.get(b)!).pts - tally(m.get(a)!).pts);
  return keys.map((k) => ({ key: k, label: label(k), ...tally(m.get(k)!) }));
}

export type DayRow = Tally & { date: string };
/** Every calendar day from `from` to `to` (weekends only if something happened), with its tally. */
export function byDay(rows: SigRow[], from: string, to: string): DayRow[] {
  const m = new Map<string, SigRow[]>();
  for (const r of rows) { const d = etDay(r.received_at); (m.get(d) ?? m.set(d, []).get(d)!).push(r); }
  const out: DayRow[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) { const rs = m.get(d) ?? []; if (weekdayIdx(d) >= 5 && !rs.length) continue; out.push({ date: d, ...tally(rs) }); }
  return out;
}

/** Cumulative points after each decided trade, oldest first. */
export function equityCurve(rows: SigRow[]) {
  const dec = rows.filter((r) => outcomeOf(r).kind !== "open").sort((a, b) => a.received_at.localeCompare(b.received_at));
  let c = 0; return dec.map((r) => ({ id: r.id, at: r.received_at, pts: (c += outcomeOf(r).pts) }));
}

/** The win streak that is running now (newest decided trades first). */
export function currentStreak(rows: SigRow[]) {
  const dec = rows.filter((r) => outcomeOf(r).kind !== "open").sort((a, b) => b.received_at.localeCompare(a.received_at));
  const kind = dec[0] ? outcomeOf(dec[0]).kind : null; let n = 0;
  for (const r of dec) { if (outcomeOf(r).kind === kind) n++; else break; }
  return { kind: kind as "win" | "loss" | null, n };
}

export type Range = "week" | "4w" | "12w" | "all";
export const RANGE_LABEL: Record<Range, string> = { week: "This week", "4w": "4 weeks", "12w": "12 weeks", all: "All loaded" };
/** First day of a range, given today's New York date. */
export function rangeStart(range: Range, today: string) {
  const mon = mondayOf(today);
  return range === "week" ? mon : range === "4w" ? addDays(mon, -21) : range === "12w" ? addDays(mon, -77) : "0000-00-00";
}
export const inRange = (rows: SigRow[], range: Range, today: string) => { const s = rangeStart(range, today); return rows.filter((r) => etDay(r.received_at) >= s); };

export const ptsText = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("en-US")} pts`;
