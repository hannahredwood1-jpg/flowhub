// Goal planner: "I want to make $X a month" → what it takes, and which account fits best.
// Pure functions (no React, no DB). The numbers here are planning arithmetic built on assumptions the member can see and change.
// They are never a prediction of results.
import { expectancyR, expectedLosingStreak, parseSplit, riskLimits, buildPassPlan, simulatePass, POINT_VALUE, type RuleSet, type Strategy } from "./planner";
import type { CatalogFirm, CatalogSize } from "./types";
import { PLAN_MONTHS, PRICES_CHECKED, costToFund, priceOf, type PriceRow } from "./propPrices";
const PRICE_DATE = PRICES_CHECKED;

export type Experience = "new" | "some" | "experienced";
export type Style = "steady" | "balanced" | "faster";
export type PlanSessionKey = "NY_AM" | "NY_LUNCH" | "NY_PM" | "ASIA" | "LONDON" | "NY";

/** What the member says they are good at, and what trips them up. These steer which account suits them. */
export const STRENGTHS = {
  patience: "I wait for good setups", discipline: "I follow my plan", calm: "I stay calm after a loss", quick: "I make quick decisions", steady: "I make steady money day to day", runner: "I let winners run",
} as const;
export const WEAKNESSES = {
  overtrade: "I take too many trades", revenge: "I chase losses after a loss", bigloss: "I let a losing trade run or move my stop", fomo: "I jump in late, afraid to miss a move", early: "I cut winners too early", news: "News spikes catch me out", impatient: "I get impatient waiting for setups",
} as const;
export type StrengthKey = keyof typeof STRENGTHS;
export type WeaknessKey = keyof typeof WEAKNESSES;

/** What the member tells us (the question series) plus the planning assumptions behind the maths. */
export type GoalAnswers = {
  monthlyGoal: number;      // take-home $ per month
  daysPerWeek: number;      // 1..5
  experience: Experience;
  style: Style;
  maxLossDay: number;       // loss-per-day comfort in $, worked out from their strengths and weaknesses (150 / 300 / 600)
  budget: number;           // total $ they can spend on evaluations
  strengths: string[];      // keys of STRENGTHS
  weaknesses: string[];     // keys of WEAKNESSES
  sessions: PlanSessionKey[];
  tradesPerDay: number;     // 1..3
  winRate: number;          // planning assumption, 0.3..0.75
  stopPts: number;          // planning assumption
  targetPts: number;        // planning assumption
  instrument: "MNQ" | "NQ";
};

/** Each style only sets the starting assumptions. They are editable and never shown as a promise. */
export const STYLE_PRESETS: Record<Style, { label: string; blurb: string; winRate: number; stopPts: number; targetPts: number }> = {
  steady:   { label: "Steady",   blurb: "Win more often, smaller wins. Calmer, with shorter losing streaks.", winRate: 0.55, stopPts: 20, targetPts: 20 },
  balanced: { label: "Balanced", blurb: "A middle path: wins are a bit bigger than losses.",                  winRate: 0.45, stopPts: 20, targetPts: 30 },
  faster:   { label: "Faster",   blurb: "Win less often, bigger wins. Needs patience through losing streaks.", winRate: 0.40, stopPts: 20, targetPts: 40 },
};

export const defaultAnswers = (over: Partial<GoalAnswers> = {}): GoalAnswers => ({
  monthlyGoal: 2500, daysPerWeek: 5, experience: "new", style: "balanced", maxLossDay: 300, budget: 500, strengths: [], weaknesses: [],
  sessions: ["NY_AM"], tradesPerDay: 2, winRate: STYLE_PRESETS.balanced.winRate, stopPts: STYLE_PRESETS.balanced.stopPts, targetPts: STYLE_PRESETS.balanced.targetPts, instrument: "MNQ",
  ...over,
});

/** A daily loss comfort worked out from what the member says about themselves: more weak spots around losses means a tighter limit. */
export function comfortFrom(strengths: string[], weaknesses: string[], experience: Experience): number {
  const risky = weaknesses.filter((w) => w === "overtrade" || w === "revenge" || w === "bigloss").length;
  const steady = strengths.filter((x) => x === "calm" || x === "discipline").length;
  if (risky >= 2 || (risky >= 1 && experience === "new")) return 150;
  if (steady >= 2 && risky === 0 && experience !== "new") return 600;
  return 300;
}

const round = (n: number, step = 1) => Math.round(n / step) * step;
const floorTo = (n: number, step = 1) => Math.floor(n / step) * step;
const AVG_SPLIT = 0.9;

export const strategyOfAnswers = (a: GoalAnswers): Strategy => ({
  winRate: a.winRate, avgRR: a.targetPts / a.stopPts, tradesPerDay: a.tradesPerDay, instrument: a.instrument, avgStopPoints: a.stopPts, tradingDaysPerWeek: a.daysPerWeek,
});

export type Breakdown = {
  monthly: number; weekly: number; daily: number;          // take-home
  grossMonthly: number; grossDaily: number;                // before the firm's profit split
  tradingDaysPerMonth: number; tradesPerMonth: number;
  perTrade: number;                                        // gross $ each trade must earn on average
};
export type Requirements = {
  rr: number; expectancyR: number;
  riskPerTrade: number | null;       // $ risked per trade for the goal to work out on average (null: no positive edge)
  contracts: number | null;          // of the chosen instrument
  dailyStop: number;                 // stop for the day after this much loss
  losingStreak: number;              // longest streak to expect over a month
  winsPerMonth: number;
  losingDayBudgetOk: boolean;        // does one full losing day fit what they said they could accept?
  worstDay: number;                  // two full losses
};

export function breakdownOf(a: GoalAnswers): Breakdown {
  const tdpm = (a.daysPerWeek * 52) / 12;
  const grossMonthly = a.monthlyGoal / AVG_SPLIT;
  const grossDaily = grossMonthly / tdpm;
  return {
    monthly: a.monthlyGoal, weekly: round((a.monthlyGoal * 12) / 52), daily: round(a.monthlyGoal / tdpm),
    grossMonthly: round(grossMonthly), grossDaily: round(grossDaily), tradingDaysPerMonth: Math.round(tdpm * 10) / 10,
    tradesPerMonth: Math.round(tdpm * a.tradesPerDay),
    perTrade: a.tradesPerDay > 0 ? round(grossDaily / a.tradesPerDay) : 0,
  };
}

export function requirementsOf(a: GoalAnswers, b = breakdownOf(a)): Requirements {
  const rr = a.targetPts / a.stopPts, E = expectancyR(a.winRate, rr);
  const risk = E > 0 && a.tradesPerDay > 0 ? b.grossDaily / (a.tradesPerDay * E) : null;
  const perContract = a.stopPts * POINT_VALUE[a.instrument];
  const lossesPerDay = Math.min(2, Math.max(1, Math.ceil(a.tradesPerDay)));
  const worstDay = risk != null ? round(risk * lossesPerDay) : 0;
  return {
    rr: Math.round(rr * 100) / 100, expectancyR: Math.round(E * 1000) / 1000,
    riskPerTrade: risk != null ? round(risk, 5) : null,
    contracts: risk != null && perContract > 0 ? Math.max(1, Math.round(risk / perContract)) : null,
    dailyStop: risk != null ? round(risk * lossesPerDay, 5) : 0,
    losingStreak: expectedLosingStreak(a.winRate, Math.max(20, b.tradesPerMonth)),
    winsPerMonth: Math.round(b.tradesPerMonth * a.winRate),
    losingDayBudgetOk: risk != null ? worstDay <= a.maxLossDay : false,
    worstDay,
  };
}

export type Recommendation = {
  templateId: string; firm: string; plan: string; accountSize: number; label: string;
  rules: RuleSet; dataStatus: CatalogSize["dataStatus"];
  accountsNeeded: number;           // identical copy-traded accounts for the goal at safe risk
  riskPerTrade: number;             // the safe $ risk per trade on this account
  contracts: number;
  dailyCapacity: number;            // what one account can safely make per day on average
  price: PriceRow | null;           // the firm's own list price, when we could confirm one
  costEach: number;                 // $ to get one account through the evaluation and funded (an estimate when the price is not confirmed)
  evalSpend: number;                // accountsNeeded × costEach
  priceKnown: boolean;
  withinBudget: boolean;
  passRate: number | null;          // chance of passing the evaluation in a simulation using the assumptions
  fit: string[];                    // why this account suits the member's strengths and weaknesses
  score: number;
  reasons: string[];
};

const DD_LABEL = { EOD_TRAILING: "end-of-day trailing drawdown", INTRADAY_TRAILING: "intraday trailing drawdown", STATIC: "static drawdown" } as const;

export function toRules(s: CatalogSize): RuleSet {
  return { accountSize: s.accountSize, profitTarget: s.profitTarget, maxLoss: s.maxLoss, drawdownModel: s.drawdownModel, dailyLossLimit: s.dailyLossLimit, consistencyPct: s.consistencyPct, minDays: s.minDays, maxMinis: s.maxMinis, maxMicros: s.maxMicros, profitSplit: s.profitSplit };
}

/** How well an account's rules suit what the member says about themselves. Returns a score and the plain reasons. */
export function fitFor(a: GoalAnswers, r: RuleSet, notes?: string | null): { score: number; reasons: string[] } {
  const w = new Set(a.weaknesses ?? []), st = new Set(a.strengths ?? []);
  let score = 0; const why: string[] = [];
  const losses = ["overtrade", "revenge", "bigloss"].filter((k) => w.has(k));
  if (losses.length) {
    if (r.dailyLossLimit) { score += 7; why.push(`You said ${losses.map((k) => WEAKNESSES[k as WeaknessKey].toLowerCase().replace(/^i /, "you ")).join(" and ")}. This account has a $${r.dailyLossLimit.toLocaleString("en-US")} daily loss limit that stops a bad day for you.`); }
    else { score -= 4; why.push("You said bad days are a weak spot, and this account has no daily loss limit, so the stop has to come from you."); }
    if (r.drawdownModel === "INTRADAY_TRAILING") { score -= 4; why.push("Its drawdown follows your open profit in real time, which can punish a trade you let run."); }
    else if (r.drawdownModel === "STATIC") { score += 3; why.push("A fixed drawdown floor never moves, which is easy to respect."); }
  }
  if (w.has("early")) { if (r.consistencyPct) { score += 3; why.push("Cutting winners early keeps your days small and even, which works with a consistency rule."); } }
  if (w.has("fomo") || w.has("impatient")) { if (r.minDays >= 3) { score += 2; why.push("A minimum number of trading days takes the rush out of passing."); } else { score -= 1; } }
  if (w.has("news")) {
    if (/news trading allowed/i.test(notes ?? "")) { score += 4; why.push("News trading is allowed, so a news spike will not break a rule."); }
    else if (/no news|news.*(not allowed|restricted|prohibited)/i.test(notes ?? "")) { score -= 3; why.push("News is restricted here, which matters if news catches you out."); }
  }
  if (st.has("steady") && r.consistencyPct) { score += 4; why.push("You make steady money day to day, which fits a consistency rule."); }
  if (st.has("runner") && r.consistencyPct) { score -= 5; why.push("You let winners run, and a consistency rule caps how big one day can be."); }
  if (st.has("runner") && !r.consistencyPct) { score += 3; why.push("You let winners run, and there is no consistency rule capping a big day."); }
  if ((st.has("calm") || st.has("discipline")) && r.drawdownModel === "INTRADAY_TRAILING") { score += 3; why.push("You are calm and disciplined, so a tighter intraday drawdown is manageable."); }
  if (st.has("quick") && r.drawdownModel === "INTRADAY_TRAILING") { score += 1; }
  if (st.has("patience") && r.minDays >= 3) { score += 2; }
  return { score, reasons: why };
}

/** The middle price (cost to get funded) of the confirmed prices at one account size, used only when a firm's price could not be confirmed. */
function typicalCost(catalog: CatalogFirm[], size: number): number {
  const xs: number[] = [];
  for (const f of catalog) for (const p of f.plans) for (const s of p.sizes) { if (s.accountSize !== size) continue; const pr = priceOf(s.id); if (pr && s.profitTarget != null) xs.push(costToFund(pr)); }
  xs.sort((x, y) => x - y);
  return xs.length ? xs[Math.floor(xs.length / 2)] : 150;
}

/** Rank every account in the catalog for this member and return the best three (at most one per firm). */
export function recommendAccounts(a: GoalAnswers, catalog: CatalogFirm[], opts: { runs?: number } = {}): Recommendation[] {
  const strat = strategyOfAnswers(a), b = breakdownOf(a), E = expectancyR(a.winRate, strat.avgRR);
  if (E <= 0) return [];
  const perMicro = a.stopPts * POINT_VALUE[a.instrument === "NQ" ? "MNQ" : a.instrument];
  const lossesPerDay = Math.min(2, Math.max(1, Math.ceil(a.tradesPerDay)));
  const comfortCap = a.maxLossDay / lossesPerDay;
  const typical = new Map<number, number>();
  const cands: (Recommendation & { _notes?: string | null })[] = [];
  for (const f of catalog) for (const p of f.plans) for (const s of p.sizes) {
    const rules = toRules(s);
    const lim = riskLimits({ ...rules, profitTarget: null }, strat, a.tradesPerDay * 20);
    const contractCap = (a.instrument === "NQ" ? rules.maxMinis : rules.maxMicros) * (a.instrument === "NQ" ? a.stopPts * 20 : perMicro);
    const risk = floorTo(Math.min(lim.riskCap, comfortCap, contractCap), 5);
    if (risk <= 0) continue;
    const cap = a.tradesPerDay * E * risk;
    const split = parseSplit(s.profitSplit, AVG_SPLIT);
    const need = Math.max(1, Math.ceil(b.grossDaily * (AVG_SPLIT / split) / cap));
    const price = priceOf(s.id);
    if (!typical.has(s.accountSize)) typical.set(s.accountSize, typicalCost(catalog, s.accountSize));
    const costEach = price ? costToFund(price) : typical.get(s.accountSize)!;
    const fee = costEach * need;
    const perContract = a.stopPts * POINT_VALUE[a.instrument];
    cands.push({
      templateId: s.id, firm: f.firm, plan: p.plan, accountSize: s.accountSize, label: `${f.firm} ${p.plan} ${s.accountSize / 1000}K`, rules, dataStatus: s.dataStatus,
      accountsNeeded: need, riskPerTrade: risk, contracts: Math.max(1, Math.floor(risk / perContract)), dailyCapacity: round(cap, 5),
      price, costEach: Math.round(costEach), evalSpend: Math.round(fee), priceKnown: !!price, withinBudget: fee <= a.budget,
      passRate: null, fit: [], score: 0, reasons: [], _notes: (s as { notes?: string | null }).notes ?? null,
    });
  }
  // A cheap first score, then a simulation for the front-runners only.
  const pre = (c: Recommendation) => -Math.min(c.accountsNeeded, 25) * 3 + (c.withinBudget ? 20 : -Math.min(30, ((c.evalSpend - a.budget) / Math.max(a.budget, 1)) * 15));
  cands.sort((x, y) => pre(y) - pre(x));
  for (const c of cands.slice(0, 30)) {
    if (c.rules.profitTarget == null) { c.passRate = null; continue; }
    const plan = buildPassPlan(c.rules, strat, { riskOverride: c.riskPerTrade });
    c.passRate = plan ? simulatePass(c.rules, strat, plan, { runs: opts.runs ?? 500, maxDays: 45 }).passRate : null;
  }
  for (const c of cands) {
    const r = c.rules;
    const ft = fitFor(a, r, c._notes);
    c.fit = ft.reasons;
    let sc = pre(c) + (c.passRate != null ? c.passRate * 40 : 8) + ft.score;
    const dd = r.drawdownModel;
    sc += dd === "INTRADAY_TRAILING" ? (a.experience === "experienced" ? 0 : -6) : 6;
    if (r.consistencyPct && a.style === "faster") sc -= 4;
    if (a.experience === "new") sc += c.accountSize <= 50000 ? 5 : c.accountSize >= 100000 ? -3 : 0;
    sc += c.dataStatus === "OFFICIAL" ? 3 : c.dataStatus === "VERIFY" ? -4 : 0;
    if (!c.priceKnown) sc -= 3;
    c.score = Math.round(sc * 10) / 10;
    const priceText = c.price
      ? `Price: $${c.price.price.toLocaleString("en-US")} ${c.price.billing === "monthly" ? "a month until you pass" : "one-time"}${c.price.activation ? `, plus a $${c.price.activation} activation fee after you pass` : ""} (list price, checked ${PRICE_DATE}).`
      : "Price: we could not confirm this firm's current price, so the figure below is an estimate. Check the firm's site.";
    c.reasons = [
      ...c.fit,
      c.accountsNeeded === 1 ? "One account of this size is enough for your goal at a safe risk." : `You would copy-trade about ${c.accountsNeeded} accounts of this size to reach your goal at a safe risk.`,
      `Safe risk here is about $${c.riskPerTrade} per trade (${c.contracts} ${a.instrument === "NQ" ? "NQ" : "MNQ"}), kept inside the account's loss limits.`,
      `${dd === "INTRADAY_TRAILING" ? "Intraday trailing drawdown is stricter: it follows your open profit." : `${DD_LABEL[dd][0].toUpperCase()}${DD_LABEL[dd].slice(1)}: easier to plan around.`}`,
      priceText,
      c.withinBudget ? `Getting ${c.accountsNeeded} account${c.accountsNeeded > 1 ? "s" : ""} funded comes to about $${c.evalSpend}${c.price?.billing === "monthly" ? ` (assuming ${PLAN_MONTHS} months of fees)` : ""}, inside your $${a.budget} budget.` : `Getting ${c.accountsNeeded} account${c.accountsNeeded > 1 ? "s" : ""} funded comes to about $${c.evalSpend}${c.price?.billing === "monthly" ? ` (assuming ${PLAN_MONTHS} months of fees)` : ""}, above your $${a.budget} budget. Start with fewer accounts and add more as you earn.`,
      ...(c.passRate != null ? [`In a simulation using your assumptions, about ${Math.round(c.passRate * 100)}% of attempts passed the evaluation. That is arithmetic on assumptions, not a forecast.`] : []),
      ...(r.profitTarget == null ? ["Instant funded: there is no evaluation to pass, you are funded from day one (these usually cost more up front), so a bad stretch can end the account straight away."] : []),
      ...(r.consistencyPct ? [`Has a consistency rule: no single day may be more than ${r.consistencyPct}% of your profit.`] : []),
    ];
  }
  cands.sort((x, y) => y.score - x.score);
  const out: Recommendation[] = [], seen = new Set<string>();
  for (const c of cands) { if (seen.has(c.firm)) continue; seen.add(c.firm); const { _notes: _n, ...rec } = c; out.push(rec); if (out.length === 3) break; }
  return out;
}

export type GoalPlan = { answers: GoalAnswers; breakdown: Breakdown; req: Requirements; picks: Recommendation[]; notes: string[] };

export function buildGoalPlan(a: GoalAnswers, catalog: CatalogFirm[], opts: { runs?: number } = {}): GoalPlan {
  const breakdown = breakdownOf(a), req = requirementsOf(a, breakdown), picks = recommendAccounts(a, catalog, opts), notes: string[] = [];
  if (req.riskPerTrade == null) notes.push("With these assumptions the average trade does not make money, so no goal can be reached. Raise the reward or the win rate, or choose a different style.");
  else if (!req.losingDayBudgetOk) notes.push(`Two losing trades in a day would cost about $${req.worstDay}. That is more than the pace you said you are comfortable with (about $${a.maxLossDay} a day), so the plan keeps each trade's risk smaller, which means more accounts or more time.`);
  if (picks[0] && picks[0].accountsNeeded > 5) notes.push(`This goal is large for the risk you are comfortable with: it takes about ${picks[0].accountsNeeded} accounts at once. Many traders build toward it in stages.`);
  return { answers: a, breakdown, req, picks, notes };
}

/** Sum of journal P&L per calendar day this month, and the straight-line target pace for the month. */
export function monthPath(journal: { tradeDate: string; pnl: number }[], today: string, goal: number) {
  const ym = today.slice(0, 7), dim = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const days: { d: number; target: number; actual: number | null }[] = [];
  const pnl = new Map<number, number>();
  for (const j of journal) if (j.tradeDate.startsWith(ym)) pnl.set(Number(j.tradeDate.slice(8, 10)), (pnl.get(Number(j.tradeDate.slice(8, 10))) ?? 0) + j.pnl);
  let cum = 0, tradingDays = 0;
  const isTrading = (d: number) => { const w = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, d).getDay(); return w >= 1 && w <= 5; };
  const total = Array.from({ length: dim }, (_, i) => i + 1).filter(isTrading).length || 1;
  const todayN = Number(today.slice(8, 10));
  for (let d = 1; d <= dim; d++) {
    if (isTrading(d)) tradingDays++;
    cum += pnl.get(d) ?? 0;
    days.push({ d, target: Math.round((goal * tradingDays) / total), actual: d <= todayN ? Math.round(cum) : null });
  }
  return days;
}
