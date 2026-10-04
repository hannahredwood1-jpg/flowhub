"use client";
// Income projection + trading plan builder.
// Members lay out any mix of prop firm accounts; we project month-by-month income (Monte Carlo, same
// trades copied across every account) and turn it into a daily trading plan they can save as their plan.
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { CatalogFirm, CatalogSize, DashboardData, ProjectionDTO, ProjectionRowInput, RoadmapDTO } from "@/lib/types";
import type { RuleSet } from "@/lib/planner";
import {
  RISK_LEVELS, buildDayPlan, defaultPayoutCap, expectedIncome, planAccount, simulateProjection,
  type DayPlan, type PhasePlan, type ProjectionResult, type ProjectionRow, type RiskLevel,
} from "@/lib/projection";
import { sessionsOf, strategyLabel } from "@/lib/strategies";
import { strategyOf, shortFirm } from "@/lib/viewmodel";
import { k, pct, usd } from "@/lib/format";
import { ErrorLine, Field, Panel, Stat, cx } from "./ui";
import { IconAlert, IconCoin, IconPlus, IconTarget, IconX } from "./icons";
import { RoadmapModal } from "./RoadmapModal";
import { WhatIfPlanner } from "./Routine";

// ── Catalog helpers ─────────────────────────────────────────
type Tpl = { firm: string; plan: string; size: CatalogSize };
const indexCatalog = (catalog: CatalogFirm[]) => {
  const m = new Map<string, Tpl>();
  for (const f of catalog) for (const p of f.plans) for (const s of p.sizes) m.set(s.id, { firm: f.firm, plan: p.plan, size: s });
  return m;
};
const rulesOf = (s: CatalogSize): RuleSet => ({
  accountSize: s.accountSize, profitTarget: s.profitTarget, maxLoss: s.maxLoss, drawdownModel: s.drawdownModel,
  dailyLossLimit: s.dailyLossLimit, consistencyPct: s.consistencyPct, minDays: s.minDays, maxMinis: s.maxMinis,
  maxMicros: s.maxMicros, profitSplit: s.profitSplit,
});
const tplLabel = (t: Tpl) => `${shortFirm(t.firm)} ${t.plan.replace(/\s*\(.*\)/, "")} ${k(t.size.accountSize)}`;

/** Saved rows → engine rows (drops rows whose template left the catalog). */
export function toEngineRows(rows: ProjectionRowInput[], idx: Map<string, Tpl>): ProjectionRow[] {
  return rows.flatMap((r, i) => {
    const t = idx.get(r.templateId);
    if (!t) return [];
    return [{ key: `${i}-${r.templateId}`, label: tplLabel(t), rules: rulesOf(t.size), quantity: r.quantity, start: t.size.profitTarget == null ? "FUNDED" : r.start,
      costPerAttempt: r.costPerAttempt, monthlyFee: r.monthlyFee, payoutCap: r.payoutCap }];
  });
}

const newRow = (t: Tpl | undefined, start: "EVAL" | "FUNDED" = "EVAL"): ProjectionRowInput => ({
  templateId: t?.size.id ?? "", quantity: 1, start: t?.size.profitTarget == null ? "FUNDED" : start,
  costPerAttempt: 0, monthlyFee: 0, payoutCap: t ? defaultPayoutCap(t.size.accountSize) : null,
});

function initialDraft(data: DashboardData, catalog: CatalogFirm[], idx: Map<string, Tpl>): ProjectionDTO {
  if (data.projection) return data.projection;
  const mine = data.accounts.filter((a) => ["EVALUATION", "PASSED", "FUNDED", "LIVE"].includes(a.stage) && idx.has(a.templateId));
  const rows = mine.length
    ? mine.map((a) => ({ ...newRow(idx.get(a.templateId), a.stage === "EVALUATION" ? "EVAL" : "FUNDED"), quantity: a.quantity }))
    : [newRow(idx.get(catalog[0]?.plans[0]?.sizes.find((s) => s.accountSize === 50000)?.id ?? catalog[0]?.plans[0]?.sizes[0]?.id ?? ""))];
  return { name: "My plan", months: 6, riskLevel: "STANDARD", rebuyOnFail: true, rows, updatedAt: null };
}

// ── Page ────────────────────────────────────────────────────
export function ProjectionsPage({ data, catalog, onSaved }: { data: DashboardData; catalog: CatalogFirm[]; onSaved: () => Promise<void> }) {
  const idx = useMemo(() => indexCatalog(catalog), [catalog]);
  const [draft, setDraft] = useState<ProjectionDTO>(() => initialDraft(data, catalog, idx));
  const [editRoadmap, setEditRoadmap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(data.projection?.updatedAt ?? null);
  const dirty = JSON.stringify({ ...draft, updatedAt: null }) !== JSON.stringify({ ...(data.projection ?? {}), updatedAt: null });

  const roadmap = data.roadmap;
  const strat = strategyOf(roadmap);
  const deferred = useDeferredValue(draft);
  const rows = useMemo(() => toEngineRows(deferred.rows, idx), [deferred.rows, idx]);
  const result = useMemo(
    () => (roadmap && rows.length ? simulateProjection(rows, strat, { months: deferred.months, riskLevel: deferred.riskLevel, rebuyOnFail: deferred.rebuyOnFail }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, deferred.months, deferred.riskLevel, deferred.rebuyOnFail, roadmap && JSON.stringify(roadmap)],
  );
  const expected = useMemo(() => (roadmap ? expectedIncome(rows, strat, deferred.riskLevel, roadmap.monthlyIncomeGoal) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, deferred.riskLevel, roadmap && JSON.stringify(roadmap)]);
  const dayPlan = useMemo(() => (roadmap ? buildDayPlan(rows, strat, deferred.riskLevel) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, deferred.riskLevel, roadmap && JSON.stringify(roadmap)]);

  const setRow = (i: number, patch: Partial<ProjectionRowInput>) => setDraft((d) => ({ ...d, rows: d.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  async function save() {
    setBusy(true); setError(null);
    try {
      await api.saveProjection({ ...draft, rows: draft.rows.filter((r) => idx.has(r.templateId)) });
      await onSaved();
      setSavedAt(new Date().toISOString());
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!roadmap)
    return (
      <Panel title={<span className="flex items-center gap-2"><IconTarget size={13} /> Income projection</span>}>
        <div className="grid justify-items-center gap-3 px-4 py-12 text-center">
          <p className="max-w-md text-ink-2">Projections use your strategy: which FLOWMTD setups you trade, your R:R, trades per day and stop size. Set those first.</p>
          <button className="btn btn-primary" onClick={() => setEditRoadmap(true)}>Set my strategy</button>
        </div>
        {editRoadmap && <RoadmapModal open onClose={() => setEditRoadmap(false)} roadmap={null} onSaved={onSaved} />}
      </Panel>
    );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <header className="hud animate-rise flex flex-wrap items-end justify-between gap-4 px-4 py-4">
        <div className="min-w-0">
          <div className="label flex items-center gap-2 !text-ice"><IconCoin size={13} /> Income projection</div>
          <h1 className="mt-1 font-display text-[clamp(22px,3vw,30px)] font-black uppercase leading-none">Plan your accounts</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-2">
            Pick the accounts you run or plan to buy. FLOWHUB projects what they can pay you month by month, then turns it into a daily plan. It uses your setups
            ({roadmap.strategies.map(strategyLabel).join(", ")} · {pct(roadmap.winRate, 1)} win rate), {roadmap.avgRR}R, {roadmap.tradesPerDay} trades a day.{" "}
            <button className="text-ice underline-offset-2 hover:underline" onClick={() => setEditRoadmap(true)}>Change strategy</button>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-3">{dirty ? "Unsaved changes" : savedAt ? `Saved ${new Date(savedAt).toLocaleDateString()}` : "Not saved yet"}</span>
          <button className="btn btn-primary" onClick={save} disabled={busy || !draft.rows.length}>{busy ? "Saving…" : data.projection ? "Update my plan" : "Save as my plan"}</button>
        </div>
      </header>
      <ErrorLine error={error} />
      <WhatIfPlanner data={data} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <AccountMix draft={draft} setDraft={setDraft} setRow={setRow} catalog={catalog} idx={idx} />
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {result && expected && <Summary result={result} expected={expected} months={draft.months} goal={roadmap.monthlyIncomeGoal} />}
          {result && <IncomePanel result={result} goal={roadmap.monthlyIncomeGoal} />}
          {result && <AccountResults rows={rows} result={result} strat={strat} risk={deferred.riskLevel} />}
        </div>
      </div>

      {dayPlan && <DayPlanPanel plan={dayPlan} roadmap={roadmap} />}
      {editRoadmap && <RoadmapModal open onClose={() => setEditRoadmap(false)} roadmap={roadmap} onSaved={onSaved} />}
    </div>
  );
}

// ── Account mix editor ──────────────────────────────────────
function AccountMix({ draft, setDraft, setRow, catalog, idx }: {
  draft: ProjectionDTO; setDraft: React.Dispatch<React.SetStateAction<ProjectionDTO>>;
  setRow: (i: number, p: Partial<ProjectionRowInput>) => void; catalog: CatalogFirm[]; idx: Map<string, Tpl>;
}) {
  const units = draft.rows.reduce((s, r) => s + r.quantity, 0);
  return (
    <Panel title={<span className="flex items-center gap-2"><IconTarget size={13} /> Account mix · {units} account{units === 1 ? "" : "s"}</span>}>
      <div className="grid gap-3 p-4">
        {draft.rows.map((r, i) => (
          <RowEditor key={i} i={i} row={r} catalog={catalog} idx={idx} onChange={(p) => setRow(i, p)}
            onRemove={draft.rows.length > 1 ? () => setDraft((d) => ({ ...d, rows: d.rows.filter((_, j) => j !== i) })) : undefined} />
        ))}
        {draft.rows.length < 12 && (
          <button className="btn btn-ghost justify-self-start" onClick={() => setDraft((d) => ({ ...d, rows: [...d.rows, { ...d.rows[d.rows.length - 1] ?? newRow(undefined) }] }))}>
            <IconPlus size={14} /> Add account type
          </button>
        )}

        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <Field label="Project over" htmlFor="pj-months">
            <Segmented id="pj-months" value={String(draft.months)} options={[["3", "3 mo"], ["6", "6 mo"], ["12", "12 mo"]]} onChange={(v) => setDraft((d) => ({ ...d, months: Number(v) }))} />
          </Field>
          <Field label="Risk level" htmlFor="pj-risk" hint={RISK_LEVELS.find((x) => x.key === draft.riskLevel)?.note}>
            <Segmented id="pj-risk" value={draft.riskLevel} options={RISK_LEVELS.map((x) => [x.key, x.label])} onChange={(v) => setDraft((d) => ({ ...d, riskLevel: v as RiskLevel }))} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-ink-2 sm:col-span-2">
            <input type="checkbox" className="mt-1 accent-[var(--color-ice)]" checked={draft.rebuyOnFail} onChange={(e) => setDraft((d) => ({ ...d, rebuyOnFail: e.target.checked }))} />
            <span>Buy a new evaluation when an account fails <span className="text-ink-3">(its cost is counted)</span></span>
          </label>
          <Field label="Plan name" htmlFor="pj-name" className="sm:col-span-2">
            <input id="pj-name" className="field" maxLength={60} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
        </div>
      </div>
    </Panel>
  );
}

function RowEditor({ i, row, catalog, idx, onChange, onRemove }: {
  i: number; row: ProjectionRowInput; catalog: CatalogFirm[]; idx: Map<string, Tpl>; onChange: (p: Partial<ProjectionRowInput>) => void; onRemove?: () => void;
}) {
  const t = idx.get(row.templateId);
  const firm = t?.firm ?? catalog[0]?.firm ?? "";
  const plans = catalog.find((f) => f.firm === firm)?.plans ?? [];
  const plan = t?.plan ?? plans[0]?.plan ?? "";
  const sizes = plans.find((p) => p.plan === plan)?.sizes ?? [];
  const pickTemplate = (id: string) => {
    const nt = idx.get(id);
    if (!nt) return;
    onChange({ templateId: id, payoutCap: defaultPayoutCap(nt.size.accountSize), start: nt.size.profitTarget == null ? "FUNDED" : row.start });
  };
  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v)));
  const id = `pj${i}`;
  const instant = t?.size.profitTarget == null;
  return (
    <div className="grid gap-3 border border-line bg-abyss/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="label !text-ink-2">{t ? tplLabel(t) : "Pick an account"}{row.quantity > 1 && <span className="text-ice"> ×{row.quantity}</span>}</span>
        {onRemove && <button className="btn btn-ghost !h-7 !px-1.5" onClick={onRemove} aria-label="Remove account type"><IconX size={14} /></button>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Firm" htmlFor={`${id}-f`}>
          <select id={`${id}-f`} className="field" value={firm} onChange={(e) => { const p = catalog.find((f) => f.firm === e.target.value)?.plans[0]; pickTemplate(p?.sizes.find((s) => s.accountSize === t?.size.accountSize)?.id ?? p?.sizes[0]?.id ?? ""); }}>
            {catalog.map((f) => <option key={f.firm}>{f.firm}</option>)}
          </select>
        </Field>
        <Field label="Plan" htmlFor={`${id}-p`}>
          <select id={`${id}-p`} className="field" value={plan} onChange={(e) => { const s = plans.find((p) => p.plan === e.target.value)?.sizes; pickTemplate(s?.find((x) => x.accountSize === t?.size.accountSize)?.id ?? s?.[0]?.id ?? ""); }}>
            {plans.map((p) => <option key={p.plan}>{p.plan}</option>)}
          </select>
        </Field>
        <Field label="Size" htmlFor={`${id}-s`}>
          <select id={`${id}-s`} className="field" value={row.templateId} onChange={(e) => pickTemplate(e.target.value)}>
            {sizes.map((s) => <option key={s.id} value={s.id}>{k(s.accountSize)}</option>)}
          </select>
        </Field>
        <Field label="How many" htmlFor={`${id}-q`}>
          <input id={`${id}-q`} type="number" min={1} max={20} className="field num" value={row.quantity} onChange={(e) => onChange({ quantity: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} />
        </Field>
        <Field label="Starting as" htmlFor={`${id}-st`} className="col-span-2">
          {instant ? <div className="field flex items-center text-ink-3">Instant funded</div> : (
            <Segmented id={`${id}-st`} value={row.start} options={[["EVAL", "Evaluation"], ["FUNDED", "Already funded"]]} onChange={(v) => onChange({ start: v as "EVAL" | "FUNDED" })} />
          )}
        </Field>
        {!instant && <Field label="Cost per attempt $" htmlFor={`${id}-c`} hint="Eval + activation, per account">
          <input id={`${id}-c`} type="number" min={0} className="field num" value={row.costPerAttempt || ""} placeholder="0" onChange={(e) => onChange({ costPerAttempt: num(e.target.value) })} />
        </Field>}
        {!instant && <Field label="Monthly fee $" htmlFor={`${id}-m`} hint="While evaluating">
          <input id={`${id}-m`} type="number" min={0} className="field num" value={row.monthlyFee || ""} placeholder="0" onChange={(e) => onChange({ monthlyFee: num(e.target.value) })} />
        </Field>}
        <Field label="Max payout / mo $" htmlFor={`${id}-cap`} hint="Per account. Check your firm's payout rules">
          <input id={`${id}-cap`} type="number" min={0} className="field num" value={row.payoutCap ?? ""} placeholder="No cap" onChange={(e) => onChange({ payoutCap: e.target.value === "" ? null : num(e.target.value) })} />
        </Field>
      </div>
      {t && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-2 text-xs">
          <span className="text-ink-3">Firm max drawdown <span className="num text-ink">{usd(t.size.maxLoss)}</span> <span className="text-ink-3">{fundedModel(t.plan, t.size.drawdownModel) !== t.size.drawdownModel ? `${ddText(t.size.drawdownModel)} in eval, ${ddText(fundedModel(t.plan, t.size.drawdownModel))} once funded` : ddText(t.size.drawdownModel)}</span></span>
          <span className="text-ink-3">Daily loss limit <span className="num text-ink">{t.size.dailyLossLimit ? usd(t.size.dailyLossLimit) : "None"}</span></span>
          {t.size.profitTarget != null && <span className="text-ink-3">Profit target <span className="num text-ink">{usd(t.size.profitTarget)}</span></span>}
        </div>
      )}
      {t && t.size.dataStatus !== "OFFICIAL" && <p className="text-xs text-lag">Some rules for this account need checking against the firm&apos;s site.</p>}
    </div>
  );
}

function Segmented({ id, value, options, onChange }: { id: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div id={id} role="radiogroup" className="flex h-10 border border-line-2">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cx("min-w-0 flex-1 truncate px-2 font-hud text-[10px] tracking-[0.12em] uppercase transition-colors", value === v ? "bg-ice/10 text-ice" : "text-ink-3 hover:text-ink-2")}>
          {l}
        </button>
      ))}
    </div>
  );
}

// ── Results ─────────────────────────────────────────────────
function Summary({ result, expected, months, goal }: { result: ProjectionResult; expected: ReturnType<typeof expectedIncome>; months: number; goal: number }) {
  const last = result.months[result.months.length - 1];
  const hitGoal = result.months.find((m) => m.p50 >= goal);
  return (
    <section className="hud animate-rise grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-4">
      <Stat label="Once all funded" value={usd(expected.monthlyTakeHome)} tone="ice" sub={`a month · ${usd(expected.dailyTakeHome)}/day`} />
      <Stat label={`Typical month ${last.month}`} value={usd(last.p50)} tone={last.p50 >= goal ? "win" : undefined} sub={`range ${usd(last.p10)} – ${usd(last.p90)}`} />
      <Stat label={`${months}-month total`} value={usd(result.totalP50)} tone={result.totalP50 > 0 ? "win" : "loss"} sub={`bad ${usd(result.totalP10)} · good ${usd(result.totalP90)}`} />
      <Stat label={`Goal ${usd(goal)}/mo`} value={hitGoal ? `Month ${hitGoal.month}` : "Not reached"} tone={hitGoal ? "win" : "loss"}
        sub={expected.unitsForGoal ? `needs ~${expected.unitsForGoal} funded account${expected.unitsForGoal > 1 ? "s" : ""} like these` : result.firstPayoutMonthP50 ? `first payout month ${result.firstPayoutMonthP50}` : undefined} />
    </section>
  );
}

function IncomePanel({ result, goal }: { result: ProjectionResult; goal: number }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Panel delay={60} title="Take-home by month · after costs" right={
      <div className="flex border border-line-2">
        {(["chart", "table"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cx("px-2.5 py-1 font-hud text-[9.5px] tracking-[0.12em] uppercase", view === v ? "bg-ice/10 text-ice" : "text-ink-3")}>{v}</button>
        ))}
      </div>
    }>
      <div className="p-4">
        {view === "chart" ? <IncomeChart months={result.months} goal={goal} /> : <IncomeTable result={result} />}
        <p className="mt-3 text-xs text-ink-3">
          Bars show a typical month; the thin line runs from a bad month to a good one ({result.runs} simulated runs, the same trades copied on every account).
          Payouts are taken at month end above a cushion of one max loss, up to your payout cap. Real firms add payout rules (minimum days, buffers, consistency) that can delay payouts.
        </p>
      </div>
    </Panel>
  );
}

function IncomeChart({ months, goal }: { months: ProjectionResult["months"]; goal: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [W, setW] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 220 : 240, L = 48, R = 62, T = 14, B = 26;
  const hi = Math.max(goal, ...months.map((m) => m.p90), 1);
  const lo = Math.min(0, ...months.map((m) => m.p10));
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const band = (W - L - R) / months.length;
  const bw = Math.max(8, Math.min(44, band * 0.56));
  const ticks = niceTicks(lo, hi, 4);
  const h = hover != null ? months[hover] : null;
  return (
    <div className="relative" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Projected take-home by month">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={t === 0 ? 1.2 : 1} />
            <text x={L - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-3)" fontFamily="var(--font-mono, monospace)">{shortUsd(t)}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx0 = L + band * i + band / 2;
          const top = y(Math.max(0, m.p50)), bot = y(Math.min(0, m.p50));
          return (
            <g key={m.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} className="outline-none">
              <rect x={L + band * i} y={T} width={band} height={H - T - B} fill="transparent" />
              {hover === i && <rect x={L + band * i + 2} y={T} width={band - 4} height={H - T - B} fill="var(--color-ice)" opacity="0.05" />}
              <rect x={cx0 - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} rx="3" fill={m.p50 >= 0 ? "var(--color-ice)" : "var(--color-loss)"} opacity={hover == null || hover === i ? 0.85 : 0.45} />
              <line x1={cx0} x2={cx0} y1={y(m.p90)} y2={y(m.p10)} stroke="var(--color-ink-2)" strokeWidth="1.5" />
              <line x1={cx0 - 5} x2={cx0 + 5} y1={y(m.p90)} y2={y(m.p90)} stroke="var(--color-ink-2)" strokeWidth="1.5" />
              <line x1={cx0 - 5} x2={cx0 + 5} y1={y(m.p10)} y2={y(m.p10)} stroke="var(--color-ink-2)" strokeWidth="1.5" />
              <text x={cx0} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-ink-3)" fontFamily="var(--font-mono, monospace)">M{m.month}</text>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke="var(--color-signal)" strokeWidth="1.2" strokeDasharray="5 4" />
        <text x={W - R + 6} y={y(goal) - 2} fontSize="10" fill="var(--color-ink-2)" fontFamily="var(--font-mono, monospace)">goal</text>
        <text x={W - R + 6} y={y(goal) + 10} fontSize="10" fill="var(--color-ink-2)" fontFamily="var(--font-mono, monospace)">{shortUsd(goal)}</text>
      </svg>
      {h && hover != null && (
        <div className="pointer-events-none absolute top-1 z-10 w-44 border border-line-2 bg-panel/95 p-2.5 text-xs shadow-lg backdrop-blur"
          style={{ left: `clamp(0px, calc(${((L + band * hover + band / 2) / W) * 100}% - 88px), calc(100% - 176px))` }}>
          <div className="label mb-1 !text-ink-2">Month {h.month}</div>
          <Row l="Typical" v={usd(h.p50)} strong /><Row l="Bad month" v={usd(h.p10)} /><Row l="Good month" v={usd(h.p90)} />
          <Row l="Costs" v={usd(-h.costs)} /><Row l="Funded accts" v={String(h.fundedUnits)} /><Row l="Running total" v={usd(h.cumulativeP50)} />
        </div>
      )}
    </div>
  );
}
const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => (
  <div className="flex justify-between gap-2"><span className="text-ink-3">{l}</span><span className={cx("num", strong ? "text-ink" : "text-ink-2")}>{v}</span></div>
);
const shortUsd = (n: number) => (Math.abs(n) >= 1000 ? `${n < 0 ? "−" : ""}$${(Math.abs(n) / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}K` : usd(n));
function niceTicks(lo: number, hi: number, n: number) {
  const span = hi - lo || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

function IncomeTable({ result }: { result: ProjectionResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead><tr className="label text-left">{["Month", "Bad", "Typical", "Good", "Costs", "Funded", "Running total"].map((h) => <th key={h} className="px-2 py-2 font-normal">{h}</th>)}</tr></thead>
        <tbody>
          {result.months.map((m) => (
            <tr key={m.month} className="border-t border-line">
              <td className="px-2 py-2 num">M{m.month}</td>
              <td className={cx("px-2 py-2 num", m.p10 < 0 && "text-loss")}>{usd(m.p10)}</td>
              <td className={cx("px-2 py-2 num", m.p50 < 0 ? "text-loss" : "text-ink")}>{usd(m.p50)}</td>
              <td className="px-2 py-2 num text-ink-2">{usd(m.p90)}</td>
              <td className="px-2 py-2 num text-ink-3">{usd(-m.costs)}</td>
              <td className="px-2 py-2 num text-ink-2">{m.fundedUnits}</td>
              <td className="px-2 py-2 num">{usd(m.cumulativeP50)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountResults({ rows, result, strat, risk }: { rows: ProjectionRow[]; result: ProjectionResult; strat: ReturnType<typeof strategyOf>; risk: RiskLevel }) {
  const warnings = [...new Set(rows.flatMap((r) => planAccount(r.rules, strat, risk).warnings))];
  return (
    <Panel delay={120} title="Per account">
      <div className="overflow-x-auto p-4 pt-2">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="label text-left">{["Account", "Pass rate", "Days to pass", "Blow-up risk", "Evals bought", "Paid you (each)"].map((h) => <th key={h} className="px-2 py-2 font-normal">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => {
              const res = result.rows.find((x) => x.key === r.key)!;
              return (
                <tr key={r.key} className="border-t border-line">
                  <td className="px-2 py-2">{r.label}{r.quantity > 1 && <span className="text-ice"> ×{r.quantity}</span>}</td>
                  <td className={cx("px-2 py-2 num", res.passRate != null && (res.passRate >= 0.7 ? "text-win" : res.passRate < 0.45 ? "text-loss" : "text-ice"))}>{res.passRate == null ? "Funded" : pct(res.passRate)}</td>
                  <td className="px-2 py-2 num text-ink-2">{res.medianDaysToPass ?? "—"}</td>
                  <td className={cx("px-2 py-2 num", res.fundedBlowupRate > 0.25 ? "text-loss" : "text-ink-2")}>{pct(res.fundedBlowupRate)}</td>
                  <td className="px-2 py-2 num text-ink-2">{res.avgAttempts ? res.avgAttempts.toFixed(1) : "—"}</td>
                  <td className="px-2 py-2 num">{usd(res.avgPayouts)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {warnings.map((w) => <p key={w} className="mt-3 flex items-start gap-2 text-xs text-lag"><IconAlert size={13} className="mt-0.5 shrink-0" />{w}</p>)}
      </div>
    </Panel>
  );
}

// ── Daily trading plan ──────────────────────────────────────
const SESSION_TIME = { ASIA: "Asia · 6:00 PM – 2:00 AM ET", NY: "New York · 9:30 AM – 4:00 PM ET" } as const;
export const ddText = (m: RuleSet["drawdownModel"]) =>
  m === "INTRADAY_TRAILING" ? "intraday trailing" : m === "STATIC" ? "static" : "end-of-day trailing";
// Plans whose drawdown switches from end-of-day (eval) to intraday trailing once funded.
const INTRADAY_WHEN_FUNDED = /Rapid \(Intraday\)|LucidDaily/i;
const fundedModel = (plan: string, m: RuleSet["drawdownModel"]): RuleSet["drawdownModel"] => (INTRADAY_WHEN_FUNDED.test(plan) ? "INTRADAY_TRAILING" : m);
const ddShort = (m: RuleSet["drawdownModel"]) => (m === "INTRADAY_TRAILING" ? "intraday" : m === "STATIC" ? "static" : "EOD");
function stopSub(plan: DayPlan) {
  if (plan.rows.length === 1) {
    const r = plan.rows[0];
    return `${r.quantity > 1 ? `${r.quantity} × ` : ""}${usd(r.plan.dailyStop)} each · firm max DD ${usd(r.firmMaxLoss)}`;
  }
  return `your own stop, not a firm limit · after ${plan.maxLosses} loss${plan.maxLosses > 1 ? "es" : ""}`;
}
export const sizeText = (c: PhasePlan["contracts"]) =>
  c.minis > 0 ? `${c.minis} ${c.mini} or ${c.micros} ${c.micro}` : c.micros > 0 ? `${c.micros} ${c.micro}` : "Stop too wide";

export function planRules(plan: DayPlan, roadmap: RoadmapDTO) {
  const setups = roadmap.strategies.map(strategyLabel).join(", ");
  const caps = plan.rows.filter((r) => r.phase === "EVAL" && r.plan.bestDayCap);
  return [
    `Only take ${setups}. Max ${plan.maxTrades} trade${plan.maxTrades > 1 ? "s" : ""} a day.`,
    `Same entry on every account, sized per account as below (${usd(plan.totalRisk)} total at risk per trade).`,
    `Stop for the day after ${plan.maxLosses} loss${plan.maxLosses > 1 ? "es" : ""}, or once an account hits its daily stop (${usd(plan.totalStop)} if every account hits it). Your daily stop sits well inside each firm's max drawdown, so one bad day can't fail an account.`,
    `Aim for ${usd(plan.totalTarget)} a day (${usd(plan.weeklyTarget)} a week). Stop an account once it's up its walk-away amount.`,
    ...(caps.length ? [`Evaluations: don't make more than the best-day cap in a day (${caps.map((r) => `${r.label} ${usd(r.plan.bestDayCap)}`).join(", ")}). It protects the consistency rule.`] : []),
    "Log every trade in your journal. It keeps your plan and your coach up to date.",
  ];
}

function DayPlanPanel({ plan, roadmap }: { plan: DayPlan; roadmap: RoadmapDTO }) {
  const sessions = sessionsOf({ mode: roadmap.strategyMode, multiSession: roadmap.multiSession, strategies: roadmap.strategies });
  return (
    <Panel delay={160} title={<span className="flex items-center gap-2"><IconTarget size={13} /> Daily trading plan</span>}>
      <div className="grid gap-5 p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat label="Daily target · all accounts" value={usd(plan.totalTarget)} tone="ice" sub={`${usd(plan.weeklyTarget)} a week`} />
          <Stat label="Your daily stop · all accounts" value={usd(plan.totalStop)} tone="loss" sub={stopSub(plan)} />
          <Stat label="Risk per trade · all" value={usd(plan.totalRisk)} />
          <Stat label="Trades a day" value={`≤ ${plan.maxTrades}`} sub={sessions.length ? sessions.map((s) => SESSION_TIME[s]).join(" · ") : "on ECHO X ORBIT calls"} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="label text-left">{["Account", "Phase", "Firm max drawdown", "Firm daily limit", "Risk / trade", "Size", "Daily target", "Your daily stop", "Walk away at", "Best-day cap"].map((h) => <th key={h} className="px-2 py-2 font-normal">{h}</th>)}</tr></thead>
            <tbody>
              {plan.rows.map((r) => (
                <tr key={r.key} className="border-t border-line">
                  <td className="px-2 py-2">{r.label}{r.quantity > 1 && <span className="text-ice"> ×{r.quantity}</span>}</td>
                  <td className="px-2 py-2">{r.phase === "EVAL" ? <span className="chip whitespace-nowrap text-lag">Eval{r.daysToPass ? ` · ~${r.daysToPass}d` : ""}</span> : <span className="chip whitespace-nowrap text-win">Funded</span>}</td>
                  <td className="px-2 py-2 num whitespace-nowrap">{usd(r.firmMaxLoss)} <span className="text-ink-3">{ddShort(r.phase === "FUNDED" ? fundedModel(r.label, r.drawdownModel) : r.drawdownModel)}</span></td>
                  <td className="px-2 py-2 num text-ink-2">{r.firmDll ? usd(r.firmDll) : "None"}</td>
                  <td className="px-2 py-2 num">{usd(r.plan.riskPerTrade)}</td>
                  <td className="px-2 py-2 num text-ink-2">{sizeText(r.plan.contracts)}</td>
                  <td className="px-2 py-2 num text-ice">{usd(r.plan.dailyTarget)}</td>
                  <td className="px-2 py-2 num text-loss">{usd(-r.plan.dailyStop)}</td>
                  <td className="px-2 py-2 num text-ink-2">{usd(r.plan.walkAway)}</td>
                  <td className="px-2 py-2 num text-ink-3">{r.plan.bestDayCap ? usd(r.plan.bestDayCap) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ol className="grid gap-2 border-t border-line pt-4 text-sm text-ink-2 md:grid-cols-2">
          {planRules(plan, roadmap).map((t, i) => (
            <li key={i} className="flex gap-3"><span className="num mt-0.5 grid h-5 w-5 shrink-0 place-items-center border border-line-2 text-[10px] text-ice">{i + 1}</span><span>{t}</span></li>
          ))}
        </ol>
      </div>
    </Panel>
  );
}

// ── Compact card for the dashboard + coach view ─────────────
let catalogCache: Promise<CatalogFirm[]> | null = null;
function useCatalog(given?: CatalogFirm[]) {
  const [c, setC] = useState<CatalogFirm[] | null>(given ?? null);
  useEffect(() => {
    if (given) return;
    (catalogCache ??= api.catalog()).then(setC, () => setC([]));
  }, [given]);
  return c;
}

export function TradingPlanCard({ data, catalog, planHref }: { data: DashboardData; catalog?: CatalogFirm[]; planHref?: string }) {
  const cat = useCatalog(catalog);
  const pj = data.projection;
  const plan = useMemo(() => {
    if (!pj || !cat || !data.roadmap) return null;
    return buildDayPlan(toEngineRows(pj.rows, indexCatalog(cat)), strategyOf(data.roadmap), pj.riskLevel);
  }, [pj, cat, data.roadmap]);
  if (!pj) {
    return planHref && !data.readOnly ? (
      <a href={planHref} className="hud animate-rise flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:border-ice-dim">
        <span className="flex items-center gap-2 text-sm text-ink-2"><IconCoin size={14} className="text-ice" /> Running more than one account? Project your income and build a daily plan.</span>
        <span className="label !text-ice">Open planner →</span>
      </a>
    ) : null;
  }
  if (!plan || !data.roadmap) return null;
  return (
    <Panel title={<span className="flex items-center gap-2"><IconTarget size={13} /> {data.readOnly ? "Their" : "Today's"} plan · {pj.name}</span>}
      right={planHref && !data.readOnly ? <a href={planHref} className="label !text-ice hover:underline">Edit plan →</a> : undefined}>
      <div className="grid gap-4 p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Stat label="Daily target" value={usd(plan.totalTarget)} tone="ice" />
          <Stat label="Your daily stop · all" value={usd(plan.totalStop)} tone="loss" sub={stopSub(plan)} />
          <Stat label="Risk / trade · all" value={usd(plan.totalRisk)} />
          <Stat label="Trades" value={`≤ ${plan.maxTrades}`} />
        </div>
        <ul className="grid gap-1.5 text-sm">
          {plan.rows.map((r) => (
            <li key={r.key} className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-line pt-1.5">
              <span>{r.label}{r.quantity > 1 && <span className="text-ice"> ×{r.quantity}</span>} <span className={cx("label !text-[9px]", r.phase === "EVAL" ? "!text-lag" : "!text-win")}>{r.phase === "EVAL" ? "eval" : "funded"}</span></span>
              <span className="num text-ink-2">{usd(r.plan.riskPerTrade)} · {sizeText(r.plan.contracts)} · target {usd(r.plan.dailyTarget)} · stop {usd(r.plan.dailyStop)} · firm DD {usd(r.firmMaxLoss)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
