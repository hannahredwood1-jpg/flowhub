// Practice tab scoring, shared by the server (coach summary) and the dashboard card.
// Tiers match the Practice page: accuracy over a model's last 40 reps, plus a minimum rep count.
export const PRACTICE_MODELS = ["hl", "po3", "dl", "asia", "exo"] as const;
export type PracticeModel = (typeof PRACTICE_MODELS)[number];
export const PRACTICE_MODEL_LABEL: Record<PracticeModel, string> = { dl: "Extended Learning", exo: "ECHO X ORBIT", hl: "NYFlow · H/L", po3: "NYFlow · PO3", asia: "AsiaFlow · PO3" };
export type PracticeTier = "none" | "bronze" | "silver" | "gold" | "elite";
export const PRACTICE_TAGS: Record<string, string> = {
  "early-entry": "Enters before the flip closes",
  "traded-range": "Trades while the range is still building",
  "sold-the-trap": "Trades the fake move (the sweep) as if it's real",
  "counter-trend": "Takes setups against the 4H trend",
  "forced-trade": "Forces a trade on a no-sweep day",
  "stop-inside": "Stop inside the swept wick",
  "stop-wide": "Stop far wider than needed",
  "wrong-target": "Target not at the draw",
  "entry-off": "Entry not at the flip close",
  "wrong-side": "Stop on the wrong side of entry",
  "level-off": "Marks levels at closes, not wicks",
  window: "Uses candles outside the session window",
  oversize: "Sizes too big for the risk",
  "order-type": "Wrong order type for the entry",
  timing: "Trades outside the model's hours",
  "fvg-read": "Misreads fair value gaps",
  "flip-read": "Counts a wick as a flip",
  "missed-setup": "Skips valid A+ setups",
  "limit-no-lrl": "Sets limits without LRL and a short-term low",
  "limit-news": "Sets limits into the open or news",
  "entry-zone": "Limit outside the posted level",
  "stop-50": "Stop not at 50 ticks",
  "be-missed": "Doesn't move the stop to breakeven at 1:1",
  "cisd-read": "Misreads the CISD",
  "rb-read": "Marks the rejection block outside the FVG",
  "fib-anchor": "Anchors the fib on the wrong swing",
  "ote-read": "Enters outside the OTE zone",
  "inv-read": "Misses the inversion on the leg in",
  "draw-invalid": "Takes trades without a 2× draw",
};
export type PracticeRepRow = { model: string; drill: string; ok: boolean; tags: string[]; createdAt: Date | string };
export type PracticeSummary = {
  totalReps: number;
  repsThisWeek: number;
  lastRepAt: string | null;
  models: { model: PracticeModel; label: string; reps: number; accuracy: number | null; tier: PracticeTier }[];
  mistakes: { tag: string; label: string; count: number }[];
};

export function practiceTier(reps: number, acc: number): PracticeTier {
  if (reps >= 100 && acc >= 0.88) return "elite";
  if (reps >= 50 && acc >= 0.8) return "gold";
  if (reps >= 20 && acc >= 0.7) return "silver";
  if (reps >= 5) return "bronze";
  return "none";
}

/** rows: oldest → newest. */
export function summarizePractice(rows: PracticeRepRow[], now = Date.now()): PracticeSummary | null {
  if (!rows.length) return null;
  const t = (r: PracticeRepRow) => new Date(r.createdAt).getTime();
  const models = PRACTICE_MODELS.map((model) => {
    const mine = rows.filter((r) => r.model === model);
    const recent = mine.slice(-40);
    const accuracy = recent.length ? recent.filter((r) => r.ok).length / recent.length : null;
    return { model, label: PRACTICE_MODEL_LABEL[model], reps: mine.length, accuracy, tier: practiceTier(mine.length, accuracy ?? 0) };
  });
  const counts = new Map<string, number>();
  for (const r of rows.slice(-120)) for (const tag of r.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  const mistakes = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag, count]) => ({ tag, label: PRACTICE_TAGS[tag] ?? tag, count }));
  return {
    totalReps: rows.length,
    repsThisWeek: rows.filter((r) => t(r) > now - 7 * 864e5).length,
    lastRepAt: new Date(t(rows[rows.length - 1])).toISOString(),
    models,
    mistakes,
  };
}
