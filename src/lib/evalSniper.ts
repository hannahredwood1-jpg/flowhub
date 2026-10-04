// EVAL SNIPER sizing: how many contracts it takes to pass an eval in N winning trades,
// and whether that size survives the account's drawdown, daily loss limit, max size and consistency rule.
export const SNIPER_DEFAULTS = { pad: 21, tp: 50, sl: 30 };
const PV = { NQ: 20, MNQ: 2 } as const;
export type SniperInput = {
  remaining: number;          // $ left to the profit target
  drawdownRoom: number;       // $ between balance and the fail floor
  dailyLossLimit: number | null;
  maxMinis: number; maxMicros: number;
  consistencyPct: number | null; // 0.5 = no day over 50% of profit
  tp: number; sl: number;     // points
};
export type SniperOption = {
  wins: number; instrument: "NQ" | "MNQ"; contracts: number; perWin: number; risk: number;
  lossesToFail: number; ok: boolean; problems: string[];
};
export function minWinningDays(consistencyPct: number | null) {
  if (!consistencyPct || consistencyPct >= 1) return 1;
  return Math.ceil(1 / consistencyPct - 1e-9);
}
export function sniperOptions(x: SniperInput, maxWins = 6): SniperOption[] {
  const out: SniperOption[] = [];
  if (x.remaining <= 0 || x.tp <= 0 || x.sl <= 0) return out;
  const needDays = minWinningDays(x.consistencyPct);
  for (let wins = 1; wins <= maxWins; wins++) {
    // MNQ sizes to the exact target; switch to NQ when the micro count is over the firm's max
    let instrument: "NQ" | "MNQ" = "MNQ", contracts = Math.ceil(x.remaining / (wins * x.tp * PV.MNQ));
    if (x.maxMicros > 0 && contracts > x.maxMicros) { instrument = "NQ"; contracts = Math.ceil(x.remaining / (wins * x.tp * PV.NQ)); }
    const perWin = contracts * x.tp * PV[instrument], risk = contracts * x.sl * PV[instrument];
    const problems: string[] = [];
    const max = instrument === "NQ" ? x.maxMinis : x.maxMicros;
    if (max > 0 && contracts > max) problems.push(`Over the firm's max of ${max} ${instrument}`);
    if (risk >= x.drawdownRoom) problems.push("One loss fails the account");
    if (x.dailyLossLimit && risk > x.dailyLossLimit) problems.push("One loss breaks the daily loss limit");
    if (wins < needDays) problems.push(`Consistency rule needs ${needDays}+ winning days`);
    out.push({ wins, instrument, contracts, perWin, risk, lossesToFail: risk > 0 ? Math.floor(x.drawdownRoom / risk) : 0, ok: problems.length === 0, problems });
  }
  return out;
}
/** Smallest number of wins with a size that passes every rule and survives at least 2 losses. */
export function recommended(opts: SniperOption[]) {
  return opts.find((o) => o.ok && o.lossesToFail >= 2) ?? opts.find((o) => o.ok) ?? null;
}
