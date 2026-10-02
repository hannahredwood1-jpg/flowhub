// Converts the researched catalog rows (prisma/data/prop_firm_accounts.json)
// into structured AccountTemplate fields the planner can compute with.

export type CatalogRow = {
  id: string;
  firm: string;
  plan: string;
  size: number;
  profit_target: number | null;
  max_loss: number;
  drawdown_type: string;
  daily_loss_limit: string;
  consistency_eval: string;
  min_days: number;
  max_minis: number;
  max_micros: number;
  profit_split: string;
  notes: string;
  source: string;
  checked: string;
  status: "Official source" | "Secondary source" | "Verify";
};

export type DrawdownModel = "EOD_TRAILING" | "INTRADAY_TRAILING" | "STATIC";

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** "Intraday trailing (…)" → INTRADAY; "Choose at checkout…" defaults to EOD; everything else EOD. */
export function parseDrawdownModel(text: string): DrawdownModel {
  const t = text.trim().toLowerCase();
  if (t.startsWith("intraday")) return "INTRADAY_TRAILING";
  if (t.startsWith("static") || t.startsWith("fixed")) return "STATIC";
  return "EOD_TRAILING";
}

/** First dollar amount in the text, unless the rule starts with "None". "$1,250 soft breach" → 1250. */
export function parseDollar(text: string): number | null {
  if (/^\s*none/i.test(text)) return null;
  const m = text.match(/\$([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

/** "50% (eval only)" → 50, "Best day < 55% of profit target" → 55, "None in eval; 40% once funded" → null. */
export function parseConsistency(text: string): number | null {
  if (/^\s*none/i.test(text)) return null;
  const m = text.match(/(\d{1,3})\s*%/);
  return m ? Number(m[1]) : null;
}

export function toDataStatus(s: CatalogRow["status"]): "OFFICIAL" | "SECONDARY" | "VERIFY" {
  return s === "Official source" ? "OFFICIAL" : s === "Secondary source" ? "SECONDARY" : "VERIFY";
}

export function rowToTemplate(row: CatalogRow) {
  return {
    id: row.id,
    planName: row.plan,
    accountSize: row.size,
    profitTarget: row.profit_target,
    maxLoss: row.max_loss,
    drawdownModel: parseDrawdownModel(row.drawdown_type),
    drawdownNote: row.drawdown_type,
    dailyLossLimit: parseDollar(row.daily_loss_limit),
    dailyLossNote: row.daily_loss_limit,
    consistencyPct: parseConsistency(row.consistency_eval),
    consistencyNote: row.consistency_eval,
    minDays: row.min_days,
    maxMinis: row.max_minis,
    maxMicros: row.max_micros,
    profitSplit: row.profit_split || null,
    notes: row.notes || null,
    sourceUrl: row.source,
    dataStatus: toDataStatus(row.status),
    lastVerifiedAt: new Date(row.checked),
  };
}
