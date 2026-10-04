"use client";
// Trading Plan tab: "Build your plan" (6-step written plan) + "Projections" (multi-account income planner).
// The saved plan shows on the dashboard, feeds the pre-session checklist, and coaches can read it.
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { CatalogFirm, DashboardData } from "@/lib/types";
import {
  PLAN_DAYS, PLAN_ENTRY, PLAN_MODELS, PLAN_SESSIONS, SESSION_RANGE, fmtTime, planWindows, windowsText, planMaxDailyLoss, planRewardPerTrade, planRiskPerTrade,
  type PlanModel, type PlanSession, type TradingPlanDTO, type TradingPlanInput,
} from "@/lib/tradingPlan";
import { usd } from "@/lib/format";
import { ErrorLine, Field, Panel, Stat, cx } from "./ui";
import { IconTarget } from "./icons";
import { ProjectionsPage } from "./Projections";
import { EvalSniperPage } from "./EvalSniper";

const STEPS = ["Schedule", "Models", "Entries & targets", "Risk & limits", "Your numbers", "Plan card"] as const;

function defaults(data: DashboardData): TradingPlanInput {
  if (data.tradingPlan) { const { done: _d, updatedAt: _u, ...p } = data.tradingPlan; if (!p.schedule.windows && p.schedule.sessions[0]) p.schedule = { ...p.schedule, windows: { [p.schedule.sessions[0]]: { start: p.schedule.start, end: p.schedule.end } } }; return p; }
  const rm = data.roadmap;
  return {
    schedule: { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], sessions: ["NY"], start: "09:30", end: "11:00", windows: { NY: { start: "09:30", end: "11:00" } } },
    models: ["ECHO_X_ORBIT"],
    entries: { entry: "both", stopPts: rm?.avgStopPoints ?? 15, targetPts: 40, beAt1R: true, partials: false },
    risk: { instrument: rm?.primaryInstrument === "NQ" ? "NQ" : "MNQ", contracts: 1, maxLossesPerDay: 2, maxTradesPerDay: 3, dailyProfitStop: null, noNews: true },
    numbers: { monthlyGoal: rm?.monthlyIncomeGoal ?? 1000, tradingDays: Math.min(23, (rm?.tradingDaysPerWeek ?? 5) * 4) },
    rules: [],
  };
}

export function TradingPlanPage({ data, catalog, onSaved }: { data: DashboardData; catalog: CatalogFirm[]; onSaved: () => Promise<void> }) {
  const [tab, setTab] = useState<"build" | "proj" | "sniper">(() => (typeof location !== "undefined" && location.hash === "#plan-projections" ? "proj" : typeof location !== "undefined" && location.hash === "#plan-sniper" ? "sniper" : "build"));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Trading Plan">
        {([["build", "Build your plan"], ["proj", "Projections"], ["sniper", "EVAL SNIPER"]] as const).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cx("border px-4 py-2 font-hud text-[10.5px] uppercase tracking-[0.16em]", tab === k ? "border-ice bg-ice/10 text-ice shadow-[inset_0_-2px_0_var(--color-signal)]" : "border-line text-ink-3 hover:text-ink-2")}>{t}</button>
        ))}
      </div>
      {tab === "build" ? <PlanBuilder data={data} onSaved={onSaved} onProjections={() => setTab("proj")} /> : tab === "sniper" ? <EvalSniperPage data={data} /> : <ProjectionsPage data={data} catalog={catalog} onSaved={onSaved} />}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cx("border px-3 py-2 text-sm transition-colors", on ? "border-ice bg-ice/10 text-ink" : "border-line text-ink-2 hover:border-ice-dim")}>{children}</button>;
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-3 border px-3 py-2 text-sm", on ? "border-win/40 text-ink" : "border-line text-ink-2")}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 flex-none" style={{ accentColor: "var(--color-win)" }} checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
const num = (v: string) => (v === "" ? 0 : Number(v));
const toggleIn = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

function PlanBuilder({ data, onSaved, onProjections }: { data: DashboardData; onSaved: () => Promise<void>; onProjections: () => void }) {
  const [p, setP] = useState<TradingPlanInput>(() => defaults(data));
  const [step, setStep] = useState(data.tradingPlan ? 5 : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(data.tradingPlan?.updatedAt ?? null);
  const set = <K extends keyof TradingPlanInput>(k: K, v: Partial<TradingPlanInput[K]>) => setP((x) => ({ ...x, [k]: Array.isArray(v) ? v : { ...(x[k] as object), ...v } }));

  const syncWin = (sessions: PlanSession[], windows: NonNullable<TradingPlanInput["schedule"]["windows"]>) => { const first = sessions[0] && (windows[sessions[0]] ?? SESSION_RANGE[sessions[0]]); return { sessions, windows, ...(first ? { start: first.start, end: first.end } : {}) }; };
  const toggleSession = (s: PlanSession) => { const sessions = toggleIn(p.schedule.sessions, s); const windows = { ...(p.schedule.windows ?? {}) }; if (sessions.includes(s) && !windows[s]) windows[s] = { ...SESSION_RANGE[s] }; if (!sessions.includes(s)) delete windows[s]; set("schedule", syncWin(sessions, windows)); };
  const setWindow = (s: PlanSession, w: { start: string; end: string }) => set("schedule", syncWin(p.schedule.sessions, { ...(p.schedule.windows ?? {}), [s]: w }));
  const problems: (string | null)[] = [
    !p.schedule.days.length ? "Pick at least one day." : !p.schedule.sessions.length ? "Pick at least one session." : planWindows(p).some((w) => w.start >= w.end) ? "Each window’s end time must be after its start time." : null,
    !p.models.length ? "Pick at least one model." : null,
    p.entries.stopPts <= 0 || p.entries.targetPts <= 0 ? "Stop and target must be above 0." : null,
    p.risk.contracts < 1 ? "At least 1 contract." : p.risk.maxLossesPerDay < 1 ? "Max losses must be at least 1." : null,
    p.numbers.tradingDays < 1 ? "At least 1 trading day." : null,
    null,
  ];
  const risk = planRiskPerTrade(p), reward = planRewardPerTrade(p), rr = p.entries.targetPts / Math.max(0.01, p.entries.stopPts);
  const perDay = p.numbers.monthlyGoal / Math.max(1, p.numbers.tradingDays);

  async function save() {
    setBusy(true); setError(null);
    try { await api.savePlan({ ...p, rules: p.rules.map((r) => r.trim()).filter(Boolean) }); await onSaved(); setSaved(new Date().toISOString()); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <header className="hud animate-rise flex flex-wrap items-end justify-between gap-4 px-4 py-4">
        <div className="min-w-0">
          <div className="label flex items-center gap-2 !text-ice"><IconTarget size={13} /> Trading plan</div>
          <h1 className="mt-1 font-display text-[clamp(22px,3vw,30px)] font-black uppercase leading-none">Build your plan</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-2">Six steps. Every decision you make here is one you don’t make under pressure. Your plan card shows on your dashboard and turns into your pre-trade checklist.</p>
        </div>
        <span className="text-xs text-ink-3">{saved ? `Saved ${new Date(saved).toLocaleDateString()}` : "Not saved yet"}</span>
      </header>

      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((t, i) => (
          <li key={t}><button type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
            className={cx("flex w-full items-center gap-2 border px-3 py-2 text-left text-sm", step === i ? "border-ice bg-ice/10 text-ink" : i < step ? "border-win/40 text-ink-2" : "border-line text-ink-3")}>
            <span className={cx("grid h-6 w-6 flex-none place-items-center border font-mono text-xs", i < step ? "border-win bg-win text-[#032015]" : step === i ? "border-ice text-ice" : "border-line-2")}>{i < step ? "✓" : i + 1}</span>{t}
          </button></li>
        ))}
      </ol>

      <Panel title={`Step ${step + 1} · ${STEPS[step]}`}>
        <div className="grid gap-4 p-4">
          {step === 0 && (
            <>
              <p className="text-sm text-ink-2">When do you trade? Pick the days and sessions you’ll actually be at the screen, and your window. Outside it, you don’t trade.</p>
              <div className="flex flex-wrap gap-2">{PLAN_DAYS.map((d) => <Chip key={d} on={p.schedule.days.includes(d)} onClick={() => set("schedule", { days: toggleIn(p.schedule.days, d) })}>{d}</Chip>)}</div>
              <div className="flex flex-wrap gap-2">{(Object.keys(PLAN_SESSIONS) as PlanSession[]).map((s) => <Chip key={s} on={p.schedule.sessions.includes(s)} onClick={() => toggleSession(s)}>{PLAN_SESSIONS[s]}</Chip>)}</div>
              {p.schedule.days.includes("Sun") && !p.schedule.sessions.includes("ASIA") && <p className="text-xs text-ink-3">Sunday only has the Asia open (from 6 PM). Add Asia if you trade Sunday night.</p>}
              <div className="grid gap-2">
                <div className="label">Your windows (ET) · pick the part of each session that fits your day</div>
                {p.schedule.sessions.map((s) => { const w = p.schedule.windows?.[s] ?? SESSION_RANGE[s]; return (
                  <div key={s} className="grid max-w-xl grid-cols-[110px_1fr_1fr] items-end gap-3">
                    <span className="pb-2 text-sm">{PLAN_SESSIONS[s].split(" ·")[0]}</span>
                    <Field label="From" htmlFor={`pl-${s}-a`}><input id={`pl-${s}-a`} type="time" className="field" value={w.start} onChange={(e) => setWindow(s, { ...w, start: e.target.value })} /></Field>
                    <Field label="To" htmlFor={`pl-${s}-b`}><input id={`pl-${s}-b`} type="time" className="field" value={w.end} onChange={(e) => setWindow(s, { ...w, end: e.target.value })} /></Field>
                  </div>); })}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <p className="text-sm text-ink-2">Which setups are you allowed to take? Anything not on this list is a no.</p>
              <div className="grid gap-2 sm:grid-cols-2">{(Object.keys(PLAN_MODELS) as PlanModel[]).map((m) => <Toggle key={m} on={p.models.includes(m)} onChange={() => set("models", toggleIn(p.models, m))} label={PLAN_MODELS[m]} />)}</div>
              <p className="text-xs text-ink-3">New to the models? Finish them in the Trading School before adding them here.</p>
            </>
          )}
          {step === 2 && (
            <>
              <div className="grid gap-2">{(Object.keys(PLAN_ENTRY) as (keyof typeof PLAN_ENTRY)[]).map((k) => <Toggle key={k} on={p.entries.entry === k} onChange={() => set("entries", { entry: k })} label={PLAN_ENTRY[k]} />)}</div>
              <div className="grid max-w-md grid-cols-2 gap-3">
                <Field label="Stop (points)" htmlFor="pl-stop"><input id="pl-stop" type="number" min={1} className="field num" value={p.entries.stopPts} onChange={(e) => set("entries", { stopPts: num(e.target.value) })} /></Field>
                <Field label="Target (points)" htmlFor="pl-tgt"><input id="pl-tgt" type="number" min={1} className="field num" value={p.entries.targetPts} onChange={(e) => set("entries", { targetPts: num(e.target.value) })} /></Field>
              </div>
              <p className="text-sm text-ink-2">That’s <b className="num text-ink">{rr.toFixed(2)}R</b> per win, {p.entries.stopPts * 4} / {p.entries.targetPts * 4} ticks on the ticket.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle on={p.entries.beAt1R} onChange={(v) => set("entries", { beAt1R: v })} label="Move my stop to breakeven at 1:1" />
                <Toggle on={p.entries.partials} onChange={(v) => set("entries", { partials: v })} label="Take partials at structure" />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Instrument" htmlFor="pl-ins"><select id="pl-ins" className="field" value={p.risk.instrument} onChange={(e) => set("risk", { instrument: e.target.value as "MNQ" | "NQ" })}><option>MNQ</option><option>NQ</option></select></Field>
                <Field label="Contracts" htmlFor="pl-ct"><input id="pl-ct" type="number" min={1} className="field num" value={p.risk.contracts} onChange={(e) => set("risk", { contracts: num(e.target.value) })} /></Field>
                <Field label="Max losses / day" htmlFor="pl-ml"><input id="pl-ml" type="number" min={1} className="field num" value={p.risk.maxLossesPerDay} onChange={(e) => set("risk", { maxLossesPerDay: num(e.target.value) })} /></Field>
                <Field label="Max trades / day" htmlFor="pl-mt"><input id="pl-mt" type="number" min={1} className="field num" value={p.risk.maxTradesPerDay} onChange={(e) => set("risk", { maxTradesPerDay: num(e.target.value) })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Stat label="Risk per trade" value={usd(risk)} tone="loss" />
                <Stat label="Max loss per day" value={usd(planMaxDailyLoss(p))} tone="loss" sub={`${p.risk.maxLossesPerDay} × ${usd(risk)}`} />
                <Stat label="Reward per win" value={usd(reward)} tone="win" />
              </div>
              <Field label="Stop for the day once I’m up (optional, $)" htmlFor="pl-ps" className="max-w-xs"><input id="pl-ps" type="number" min={0} className="field num" value={p.risk.dailyProfitStop ?? ""} placeholder="No limit" onChange={(e) => set("risk", { dailyProfitStop: e.target.value === "" ? null : num(e.target.value) })} /></Field>
              <Toggle on={p.risk.noNews} onChange={(v) => set("risk", { noNews: v })} label="No trading into red-folder news" />
              <p className="text-xs text-ink-3">Check this against your prop firm’s daily loss limit: your max loss per day should sit well inside it.</p>
            </>
          )}
          {step === 4 && (
            <>
              <div className="grid max-w-md grid-cols-2 gap-3">
                <Field label="Monthly goal ($)" htmlFor="pl-goal"><input id="pl-goal" type="number" min={0} className="field num" value={p.numbers.monthlyGoal} onChange={(e) => set("numbers", { monthlyGoal: num(e.target.value) })} /></Field>
                <Field label="Trading days / month" htmlFor="pl-days"><input id="pl-days" type="number" min={1} max={23} className="field num" value={p.numbers.tradingDays} onChange={(e) => set("numbers", { tradingDays: num(e.target.value) })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Stat label="Needed per day" value={usd(perDay)} tone="ice" />
                <Stat label="Wins per day at your size" value={reward > 0 ? (perDay / reward).toFixed(1) : "–"} sub={`${usd(reward)} per win`} />
                <Stat label="Max trades / day" value={p.risk.maxTradesPerDay} />
              </div>
              <p className="text-sm text-ink-2">{reward > 0 && perDay / reward > p.risk.maxTradesPerDay ? "Your goal needs more wins a day than your plan allows. Lower the goal, add accounts, or size up only when the account can afford it." : "Your goal fits inside your daily limits."} Running more than one account? <button className="text-ice underline-offset-2 hover:underline" onClick={onProjections}>Open Projections</button>.</p>
            </>
          )}
          {step === 5 && (
            <>
              <PlanCardBody plan={p} />
              <div className="grid gap-2">
                <div className="label">Your own rules (optional, up to 5)</div>
                {[...p.rules, ""].slice(0, 5).map((r, i) => (
                  <input key={i} className="field" maxLength={140} placeholder={i === 0 ? "e.g. No trades after a 2R win" : "Another rule"} value={r}
                    onChange={(e) => { const rules = [...p.rules]; rules[i] = e.target.value; setP((x) => ({ ...x, rules: rules.filter((y, j) => y !== "" || j < rules.length - 1) })); }} />
                ))}
              </div>
              <ErrorLine error={error} />
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn btn-primary" onClick={save} disabled={busy || problems.some(Boolean)}>{busy ? "Saving…" : data.tradingPlan ? "Update my plan" : "Save my plan"}</button>
                {problems.some(Boolean) && <span className="text-sm text-loss">{problems.find(Boolean)}</span>}
              </div>
            </>
          )}
          {step < 5 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Back</button>}
              <button className="btn btn-primary" disabled={!!problems[step]} onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]} →</button>
              {problems[step] && <span className="text-sm text-loss">{problems[step]}</span>}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function PlanCardBody({ plan }: { plan: TradingPlanInput }) {
  const risk = planRiskPerTrade(plan);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Stat label="Window (ET)" value={windowsText(plan)} sub={plan.schedule.days.join(" ")} />
        <Stat label="Bracket" value={`${plan.entries.stopPts} / ${plan.entries.targetPts}`} sub={`${plan.risk.contracts} ${plan.risk.instrument} · ${usd(risk)} risk`} />
        <Stat label="Daily stop" value={`${plan.risk.maxLossesPerDay} L · ${plan.risk.maxTradesPerDay} T`} tone="loss" sub={`max ${usd(planMaxDailyLoss(plan))}`} />
        <Stat label="Goal" value={usd(plan.numbers.monthlyGoal)} tone="ice" sub={`${plan.numbers.tradingDays} days · ${usd(plan.numbers.monthlyGoal / Math.max(1, plan.numbers.tradingDays))}/day`} />
      </div>
      <ul className="grid gap-1.5 text-sm">
        <li className="border-t border-line pt-1.5"><span className="label mr-2">Models</span>{plan.models.map((m) => PLAN_MODELS[m].replace(" (Discord calls)", "")).join(" · ")}</li>
        <li className="border-t border-line pt-1.5"><span className="label mr-2">Entry</span>{PLAN_ENTRY[plan.entries.entry]}{plan.entries.beAt1R ? " · breakeven at 1:1" : ""}{plan.entries.partials ? " · partials at structure" : ""}</li>
        <li className="border-t border-line pt-1.5"><span className="label mr-2">Limits</span>{plan.risk.noNews ? "No red-folder news" : "News allowed"}{plan.risk.dailyProfitStop ? ` · done once up ${usd(plan.risk.dailyProfitStop)}` : ""}</li>
        {plan.rules.filter(Boolean).map((r, i) => <li key={i} className="border-t border-line pt-1.5"><span className="label mr-2">Rule</span>{r}</li>)}
      </ul>
    </div>
  );
}

/** Dashboard + coach view of the saved plan. */
export function PlanCard({ data, href }: { data: DashboardData; href?: string }) {
  const plan: TradingPlanDTO | null = data.tradingPlan;
  if (!plan) {
    return href && !data.readOnly ? (
      <a href={href} className="hud animate-rise flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:border-ice-dim">
        <span className="flex items-center gap-2 text-sm text-ink-2"><IconTarget size={14} className="text-ice" /> No written plan yet. Build it in 6 steps: it becomes your pre-trade checklist.</span>
        <span className="label !text-ice">Build my plan →</span>
      </a>
    ) : null;
  }
  return (
    <Panel title={<span className="flex items-center gap-2"><IconTarget size={13} /> {data.readOnly ? "Their" : "My"} trading plan</span>}
      right={href && !data.readOnly ? <a href={href} className="label !text-ice hover:underline">Edit plan →</a> : <span className="label">Updated {new Date(plan.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}>
      <div className="p-4"><PlanCardBody plan={plan} /></div>
    </Panel>
  );
}
