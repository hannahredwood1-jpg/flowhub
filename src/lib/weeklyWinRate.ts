/** Weekly win rate: wins ÷ (wins + losses) for the trades logged in a Monday–Sunday week. Breakeven trades are shown but not counted either way. */
export type WinRow = { tradeDate: string; outcome: "WIN" | "LOSS" | "BREAKEVEN" };
export type WeekWinRate = {
  weekStart: string;       // Monday, YYYY-MM-DD
  weekEnd: string;         // Sunday, YYYY-MM-DD
  label: string;           // "Oct 26 – Nov 1"
  wins: number; losses: number; breakeven: number;
  trades: number;          // every signal/trade that week, including ones with no result yet
  pending: number;         // no result entered yet
  days?: DayStat[];        // current week only: Monday to Sunday
  pts: number;             // net points won (stops count against), as entered in the Signals back end
  rate: number | null;     // 0..1, null when no win/loss trades
};
/** One day of the current week (Monday first), from the Signals back end. */
export type DayStat = { date: string; wins: number; losses: number; be: number; pending: number; signals: number; pts: number };
export type WeeklyWinRate = { current: WeekWinRate; previous: WeekWinRate; history: WeekWinRate[] }; // history: newest first, 8 weeks incl. current

const DAY = 86400000;
const parse = (ymd: string) => Date.parse(ymd + "T12:00:00Z");
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (ymd: string) => `${MON[+ymd.slice(5, 7) - 1]} ${+ymd.slice(8, 10)}`;

export function mondayOf(ymd: string) {
  const dow = new Date(parse(ymd)).getUTCDay(); // 0 = Sunday
  return fmt(parse(ymd) - ((dow + 6) % 7) * DAY);
}

export function weekWinRate(rows: WinRow[], weekStart: string): WeekWinRate {
  const weekEnd = fmt(parse(weekStart) + 6 * DAY);
  const inWeek = rows.filter((r) => r.tradeDate >= weekStart && r.tradeDate <= weekEnd);
  const wins = inWeek.filter((r) => r.outcome === "WIN").length;
  const losses = inWeek.filter((r) => r.outcome === "LOSS").length;
  return {
    weekStart, weekEnd, label: `${short(weekStart)} – ${short(weekEnd)}`,
    wins, losses, breakeven: inWeek.length - wins - losses, trades: inWeek.length, pending: 0, pts: 0,
    rate: wins + losses ? wins / (wins + losses) : null,
  };
}

export function weeklyWinRate(rows: WinRow[], today: string, weeks = 8): WeeklyWinRate {
  const start = mondayOf(today);
  const history = Array.from({ length: weeks }, (_, i) => weekWinRate(rows, fmt(parse(start) - i * 7 * DAY)));
  return { current: history[0], previous: history[1], history };
}

/** The text that goes to Discord (and the copy button). */
export function shareText(w: WeekWinRate, name = "FLOWMTD") {
  const pct = w.rate == null ? "—" : `${Math.round(w.rate * 100)}%`;
  return `📊 ${name} · Weekly win rate (${w.label})\n${pct} · ${w.wins}W / ${w.losses}L${w.breakeven ? ` (${w.breakeven} BE)` : ""}${w.pts ? ` · ${w.pts > 0 ? "+" : "−"}${Math.abs(Math.round(w.pts)).toLocaleString("en-US")} pts` : ""}`;
}

/** The Signals site's own weekly numbers (entered by FLOWMTD in the back end). Break-even counts as a win (it is inside `wins`), only a stop is a loss, no result yet = pending. */
export type SignalsWeek = { weekStart: string; wins: number; losses: number; be: number; pending: number; signals: number; pts?: number };
export function fromSignalsWeeks(weeks: SignalsWeek[], days?: DayStat[]): WeeklyWinRate {
  const history = [...weeks].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map<WeekWinRate>((w) => ({
    weekStart: w.weekStart, weekEnd: fmt(parse(w.weekStart) + 6 * DAY), label: `${short(w.weekStart)} – ${short(fmt(parse(w.weekStart) + 6 * DAY))}`,
    wins: w.wins, losses: w.losses, breakeven: w.be, trades: w.signals, pending: w.pending, pts: w.pts ?? 0,
    rate: w.wins + w.losses ? w.wins / (w.wins + w.losses) : null,
  }));
  if (days?.length) history[0].days = days;
  return { current: history[0], previous: history[1] ?? history[0], history };
}

/** "+1,209 pts" */
export const ptsText = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("en-US")} pts`;
