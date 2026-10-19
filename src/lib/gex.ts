// Daily GEX levels for NQ, worked out from the Nasdaq-100 (NDX) options chain.
// GEX per option = open interest × gamma × 100 × spot² × 0.01 (dollars of the index dealers hedge per 1% move).
// Under the usual modelling assumption (dealers long calls, short puts) calls count positive and puts negative.
// This is a model of where hedging concentrates, a context level and not a signal.

export type ChainOption = { sym: string; oi: number; iv?: number | null; gamma?: number | null };
export type Parsed = { type: "C" | "P"; strike: number; exp: string; oi: number; iv: number; gamma: number | null };
export type Levels = { callWall: number | null; putWall: number | null; flip: number | null; regime: "positive" | "negative" | null; calls: number[]; puts: number[] };
export type GexResult = { spot: number; expiry0: string | null; all: Levels; zero: Levels; export: string };

const SIGMA_PROXY = 0.2; // used when an option has no implied volatility
const MIN_T = 0.25 / 365;

/** OCC-style option symbol: root + YYMMDD + C/P + strike×1000 (8 digits), e.g. NDXP261019C29500000. */
export function parseOption(o: ChainOption): Parsed | null {
  const m = /^[A-Z]+W?(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(o.sym.replace(/^_/, ""));
  if (!m || !(o.oi > 0)) return null;
  const iv = Number(o.iv);
  return { type: m[4] as "C" | "P", strike: Number(m[5]) / 1000, exp: `20${m[1]}-${m[2]}-${m[3]}`, oi: o.oi, iv: iv > 0.01 && iv < 5 ? iv : SIGMA_PROXY, gamma: Number.isFinite(Number(o.gamma)) && Number(o.gamma) > 0 ? Number(o.gamma) : null };
}

const phi = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
/** Black-Scholes gamma (no dividends or rates, which move it very little over one day). */
export function bsGamma(S: number, K: number, sigma: number, T: number) {
  const t = Math.max(T, MIN_T), v = sigma * Math.sqrt(t);
  return phi((Math.log(S / K) + 0.5 * v * v) / v) / (S * v);
}
const yearsTo = (exp: string, asOf: Date) => (Date.UTC(+exp.slice(0, 4), +exp.slice(5, 7) - 1, +exp.slice(8, 10), 20, 0) - asOf.getTime()) / (365 * 86400_000);
const gexAt = (o: Parsed, S: number, T: number, gamma: number) => (o.type === "C" ? 1 : -1) * o.oi * gamma * 100 * S * S * 0.01;

function levelsFor(opts: Parsed[], spot: number, asOf: Date): Levels {
  if (!opts.length) return { callWall: null, putWall: null, flip: null, regime: null, calls: [], puts: [] };
  const callBy = new Map<number, number>(), putBy = new Map<number, number>();
  for (const o of opts) {
    const g = o.gamma ?? bsGamma(spot, o.strike, o.iv, yearsTo(o.exp, asOf));
    const v = gexAt(o, spot, 0, g);
    (o.type === "C" ? callBy : putBy).set(o.strike, ((o.type === "C" ? callBy : putBy).get(o.strike) ?? 0) + v);
  }
  const rank = (m: Map<number, number>, sign: 1 | -1) => [...m.entries()].sort((a, b) => sign * (b[1] - a[1]) || Math.abs(a[0] - spot) - Math.abs(b[0] - spot)).map(([k]) => k);
  const calls = rank(callBy, 1), puts = rank(putBy, -1);
  // Gamma flip: the price where total GEX changes sign, found by re-pricing every option at nearby prices.
  const total = (S: number) => opts.reduce((s, o) => s + gexAt(o, S, 0, bsGamma(S, o.strike, o.iv, yearsTo(o.exp, asOf))), 0);
  let flip: number | null = null, best = Infinity, prevS = spot * 0.9, prevV = total(prevS);
  for (let i = 1; i <= 160; i++) {
    const S = spot * (0.9 + i * 0.00125), v = total(S);
    if (prevV === 0 || (prevV < 0) !== (v < 0)) {
      const x = prevV === v ? S : prevS + ((S - prevS) * (0 - prevV)) / (v - prevV);
      if (Math.abs(x - spot) < best) { best = Math.abs(x - spot); flip = x; }
    }
    prevS = S; prevV = v;
  }
  const regime = flip == null ? (total(spot) >= 0 ? "positive" : "negative") : spot >= flip ? "positive" : "negative";
  return { callWall: calls[0] ?? null, putWall: puts[0] ?? null, flip: flip == null ? null : Math.round(flip), regime, calls: calls.slice(0, 6), puts: puts.slice(0, 6) };
}

/** The nearest expiry that has not passed, in New York dates: today's while the day is live, otherwise the next one. */
export function nextExpiry(exps: string[], today: string) {
  return [...new Set(exps)].sort().find((e) => e >= today) ?? null;
}

/**
 * The line the indicator reads. 17 numbers then the symbol. Positions (a 0 means "not available"):
 *  1 call wall · 2 gamma flip · 3 put wall · 4 NDX spot
 *  5-9 next five call strikes (after the wall) · 10-14 next five put strikes (after the wall)
 *  15 0DTE call wall · 16 0DTE gamma flip · 17 0DTE put wall · then NDX
 */
export const EXPORT_LEGEND = ["Call wall", "Gamma flip", "Put wall", "NDX price", "Call strike 2", "Call strike 3", "Call strike 4", "Call strike 5", "Call strike 6", "Put strike 2", "Put strike 3", "Put strike 4", "Put strike 5", "Put strike 6", "0DTE call wall", "0DTE gamma flip", "0DTE put wall"];
export function exportLine(spot: number, all: Levels, zero: Levels) {
  const n = (v: number | null | undefined) => (v == null ? 0 : Math.round(v));
  const five = (a: number[]) => [1, 2, 3, 4, 5].map((i) => n(a[i]));
  return [n(all.callWall), n(all.flip), n(all.putWall), n(spot), ...five(all.calls), ...five(all.puts), n(zero.callWall), n(zero.flip), n(zero.putWall), "NDX"].join(",");
}

export function computeGex(chain: ChainOption[], spot: number, today: string, asOf: Date): GexResult | null {
  const opts = chain.map(parseOption).filter((o): o is Parsed => !!o && o.exp >= today);
  if (!(spot > 0) || opts.length < 20) return null;
  const e0 = nextExpiry(opts.map((o) => o.exp), today);
  const all = levelsFor(opts, spot, asOf), zero = levelsFor(opts.filter((o) => o.exp === e0), spot, asOf);
  return { spot, expiry0: e0, all, zero, export: exportLine(spot, all, zero) };
}

/** A rough NQ-over-NDX gap from cost of carry to the next quarterly expiry. Display only; the indicator measures the real gap on the chart. */
export function estimateBasis(spot: number, now: Date, rate = 0.035, divYield = 0.007) {
  const y = now.getUTCFullYear();
  const third = (yr: number, m: number) => { const d = new Date(Date.UTC(yr, m, 1)); d.setUTCDate(1 + ((5 - d.getUTCDay() + 7) % 7) + 14); return d; };
  const q = [2, 5, 8, 11].map((m) => third(y, m)).concat([third(y + 1, 2)]).find((d) => d.getTime() + 20 * 3600_000 > now.getTime())!;
  return spot * (rate - divYield) * ((q.getTime() - now.getTime()) / (365 * 86400_000));
}
