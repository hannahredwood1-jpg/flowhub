// Evaluation prices, collected from each firm's own pages (or the firm's own help-centre pricing article) on the date shown.
// Prices and promotions change often: these are list prices, never discount-code prices. The plan page always tells members to check the firm's site.
// A template with no entry here means we could not confirm a price, and the planner says so instead of guessing.

export type PriceRow = {
  price: number;                         // $ list price
  billing: "one-time" | "monthly";       // monthly: charged every month until you pass
  activation?: number;                   // $ one-time fee charged after you pass, if any
  reset?: number;                        // $ to reset a failed attempt, if known
  source: "firm site" | "firm help centre";
  note?: string;
};
export const PRICES_CHECKED = "2026-11-16";

const rows: Record<string, PriceRow> = {};
const set = (ids: string[], r: PriceRow | PriceRow[]) => ids.forEach((id, i) => { rows[id] = Array.isArray(r) ? r[i] : r; });

// Bulenox: pricing page (30 days of access per qualification; the same price for both drawdown options)
for (const opt of ["option-1-trailing", "option-2-eod"]) {
  [["25k", 145], ["50k", 175], ["100k", 215], ["150k", 325]].forEach(([s, p]) => { rows[`bulenox--qualification-${opt}--${s}`] = { price: p as number, billing: "one-time", source: "firm site", note: "Access lasts 30 days. A coupon code can lower the price." }; });
}
// My Funded Futures: home page plan cards (the 50K card; list price, not the promotion price shown beside it)
rows["my-funded-futures--builder--50k"] = { price: 153, billing: "one-time", source: "firm site", note: "Often on promotion for less." };
rows["my-funded-futures--rapid-intraday--50k"] = { price: 209, billing: "one-time", source: "firm site", note: "Often on promotion for less." };
rows["my-funded-futures--rapid-eod--50k"] = { price: 275, billing: "one-time", source: "firm site", note: "Often on promotion for less." };
rows["my-funded-futures--pro--50k"] = { price: 265, billing: "one-time", source: "firm site", note: "Often on promotion for less." };
// Alpha Futures: pricing section of the home page (evaluation is a monthly fee; no fee once qualified)
set(["alpha-futures--zero--25k", "alpha-futures--zero--50k", "alpha-futures--zero--100k"], [
  { price: 89, billing: "monthly", reset: 79, source: "firm site" }, { price: 169, billing: "monthly", reset: 149, source: "firm site" }, { price: 279, billing: "monthly", reset: 249, source: "firm site" }]);
rows["alpha-futures--standard--50k"] = { price: 129, billing: "monthly", reset: 109, source: "firm site" };
// Tradeify: the firm's pricing reference (help centre)
set(["tradeify--growth--25k", "tradeify--growth--50k", "tradeify--growth--100k", "tradeify--growth--150k"], [99, 145, 255, 369].map((p, i) => ({ price: p, billing: "one-time" as const, reset: [60, 95, 169, 229][i], source: "firm help centre" as const })));
set(["tradeify--select--25k", "tradeify--select--50k", "tradeify--select--100k", "tradeify--select--150k"], [109, 165, 265, 369].map((p, i) => ({ price: p, billing: "one-time" as const, reset: [75, 109, 169, 239][i], source: "firm help centre" as const, note: "Standard version with a 40% consistency rule." })));
// Topstep: the firm's pricing article (help centre). The Standard path charges monthly, then a flat activation fee after you pass.
rows["topstep--trading-combine--50k"] = { price: 49, billing: "monthly", activation: 149, source: "firm help centre", note: "Another path has no activation fee and a higher monthly price." };
rows["topstep--trading-combine--100k"] = { price: 99, billing: "monthly", activation: 149, source: "firm help centre", note: "Another path has no activation fee and a higher monthly price." };
// Take Profit Trader: monthly test fee, one-time activation to move to a funded PRO account
set(["take-profit-trader--test-pro-pro--25k", "take-profit-trader--test-pro-pro--50k", "take-profit-trader--test-pro-pro--75k", "take-profit-trader--test-pro-pro--100k", "take-profit-trader--test-pro-pro--150k"],
  [150, 170, 245, 330, 360].map((p) => ({ price: p, billing: "monthly" as const, activation: 130, source: "firm help centre" as const })));
// Alpha Funded: pricing page data (one-time, no recurring charges)
set(["alpha-funded--1-step--50k", "alpha-funded--1-step--100k", "alpha-funded--1-step--150k"], [384, 604, 824].map((p) => ({ price: p, billing: "one-time" as const, source: "firm site" as const })));
set(["alpha-funded--pro--50k", "alpha-funded--pro--100k", "alpha-funded--pro--150k"], [250, 375, 500].map((p) => ({ price: p, billing: "one-time" as const, source: "firm site" as const })));
set(["alpha-funded--instant--50k", "alpha-funded--instant--100k", "alpha-funded--instant--150k"], [649, 849, 1049].map((p) => ({ price: p, billing: "one-time" as const, source: "firm site" as const, note: "Instant funded: no evaluation." })));

export const PROP_PRICES: Readonly<Record<string, PriceRow>> = rows;
export const priceOf = (templateId: string): PriceRow | null => rows[templateId] ?? null;

/** Months of a monthly evaluation fee we plan for (most traders need more than one). */
export const PLAN_MONTHS = 2;
/** What it costs to get one account through the evaluation and funded, from the price row. */
export const costToFund = (r: PriceRow) => r.price * (r.billing === "monthly" ? PLAN_MONTHS : 1) + (r.activation ?? 0);
