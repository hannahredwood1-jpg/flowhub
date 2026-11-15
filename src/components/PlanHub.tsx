"use client";
// The Trading Plan page: one place for the goal, what it takes, which accounts fit, the accounts you run, and your journal.
// It replaces the old My Dashboard and Trading Plan pages.
import { useCallback, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import type { AccountDTO, CatalogFirm, DashboardData, JournalDTO } from "@/lib/types";
import { usd } from "@/lib/format";
import {
  STYLE_PRESETS, buildGoalPlan, defaultAnswers, monthPath, type Experience, type GoalAnswers, type GoalPlan, type PlanSessionKey, type Recommendation, type Style,
} from "@/lib/goalPlan";
import { PLAN_SESSIONS, SESSION_RANGE, planChecklist, type TradingPlanInput } from "@/lib/tradingPlan";
import { PlanPanel } from "./PlanPanel";
import { JournalTable } from "./JournalTable";
import { AccountModal } from "./AccountModal";
import { TradeModal } from "./TradeModal";
import { FeedbackItem } from "./Feedback";
import { RoutineRow, TiltGuard } from "./Routine";
import { PracticeCard } from "./PracticeCard";
import { ErrorLine, Panel, cx } from "./ui";

type Tab = "plan" | "accounts" | "journal";
type ModalState = { kind: "none" } | { kind: "account"; editing: AccountDTO | null; templateId?: string } | { kind: "trade"; editing: JournalDTO | null };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const num = (v: string) => (v === "" ? 0 : Number(v.replace(/[^0-9.]/g, "")) || 0);
const money0 = (n: number) => usd(n);

/** Answers to start from: the saved ones, else whatever the old roadmap held, else sensible defaults. */
function startAnswers(d: DashboardData): GoalAnswers {
  if (d.tradingPlan?.goal) return d.tradingPlan.goal;
  const r = d.roadmap;
  return defaultAnswers(r ? { monthlyGoal: r.monthlyIncomeGoal || 2500, daysPerWeek: Math.min(5, r.tradingDaysPerWeek) } : {});
}

/** Turn the answers into the written plan the pre-session checklist and coaches read, keeping anything the member already wrote. */
export function planFromAnswers(a: GoalAnswers, plan: GoalPlan, existing: TradingPlanInput | null): TradingPlanInput {
  const win = (s: PlanSessionKey) => (s === "NY" ? { start: "09:30", end: "11:00" } : s === "LONDON" ? { start: "02:00", end: "05:00" } : { start: SESSION_RANGE.ASIA.start, end: "23:00" });
  const windows = Object.fromEntries(a.sessions.map((s) => [s, win(s)])) as Record<PlanSessionKey, { start: string; end: string }>;
  const first = windows[a.sessions[0]];
  const days = [...(a.sessions.includes("ASIA") ? (["Sun"] as const) : []), ...DAYS.slice(0, a.daysPerWeek)];
  const contracts = Math.max(1, Math.min(50, plan.picks[0]?.contracts ?? plan.req.contracts ?? 1));
  return {
    models: existing?.models ?? ["ECHO_X_ORBIT"],
    rules: existing?.rules ?? [],
    schedule: { days: days as TradingPlanInput["schedule"]["days"], sessions: a.sessions, start: first.start, end: first.end, windows },
    entries: { entry: existing?.entries.entry ?? "both", stopPts: a.stopPts, targetPts: a.targetPts, beAt1R: existing?.entries.beAt1R ?? false, partials: existing?.entries.partials ?? false },
    risk: { instrument: a.instrument, contracts, maxLossesPerDay: 2, maxTradesPerDay: Math.max(1, Math.ceil(a.tradesPerDay)), dailyProfitStop: existing?.risk.dailyProfitStop ?? null, noNews: existing?.risk.noNews ?? true },
    numbers: { monthlyGoal: a.monthlyGoal, tradingDays: Math.min(23, Math.max(1, Math.round((a.daysPerWeek * 52) / 12))) },
    goal: a,
  };
}

export function PlanHub({ initial, catalog }: { initial: DashboardData; catalog: CatalogFirm[] }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>(() => (typeof location !== "undefined" && location.hash === "#plan-accounts" ? "accounts" : typeof location !== "undefined" && location.hash === "#plan-journal" ? "journal" : "plan"));
  const [answers, setAnswers] = useState<GoalAnswers>(() => startAnswers(initial));
  const hasPlan = !!data.tradingPlan?.goal;
  const [building, setBuilding] = useState(!hasPlan);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const refresh = useCallback(async () => setData(await api.dashboard()), []);
  const close = useCallback(() => setModal({ kind: "none" }), []);
  const go = (t: Tab) => { setTab(t); try { history.replaceState(null, "", t === "plan" ? "#plan" : `#plan-${t}`); } catch { /* ignore */ } };

  const saved = data.tradingPlan?.goal ?? null;
  const plan = useMemo(() => buildGoalPlan(saved ?? answers, catalog, { runs: 300 }), [saved, answers, catalog]);
  const unread = data.feedback.filter((f) => !f.readAt && !f.journalEntryId);

  if (building) {
    return <Wizard data={data} catalog={catalog} answers={answers} setAnswers={setAnswers} canCancel={hasPlan} onCancel={() => { setAnswers(startAnswers(data)); setBuilding(false); }}
      onSaved={async () => { await refresh(); setBuilding(false); go("plan"); }} />;
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Your trading plan</h1>
          <p className="mt-1 text-[14.5px] text-ink-2">Your goal, what it takes to reach it, and where you stand this month.</p>
        </div>
        <button className="btn" onClick={() => { setAnswers(startAnswers(data)); setBuilding(true); }}>Change my goal</button>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Trading plan">
        {([["plan", "My plan"], ["accounts", "Accounts"], ["journal", "Journal and coach"]] as const).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)} className={cx("relative -mb-px h-10 px-4 text-[14px] font-medium transition-colors", tab === k ? "text-ink" : "text-ink-3 hover:text-ink-2")}>
            {t}{k === "journal" && unread.length > 0 && <span className="ml-1.5 rounded-full bg-signal px-1.5 text-[11px] font-semibold text-[#160a00]">{unread.length}</span>}
            {tab === k && <span className="absolute inset-x-3 bottom-0 h-[2px] bg-signal" />}
          </button>
        ))}
      </div>

      {tab === "plan" && <PlanView data={data} plan={plan} onAdd={(templateId) => setModal({ kind: "account", editing: null, templateId })} onTweak={async (a) => { const p = buildGoalPlan(a, catalog, { runs: 200 }); await api.savePlan(planFromAnswers(a, p, data.tradingPlan)); await refresh(); }} />}
      {tab === "accounts" && (
        <>
          <Recommended plan={plan} onAdd={(templateId) => setModal({ kind: "account", editing: null, templateId })} />
          <PlanPanel hideIncome data={data} onAddAccount={() => setModal({ kind: "account", editing: null })} onEditAccount={(a) => setModal({ kind: "account", editing: a })} onEditRoadmap={() => { setAnswers(startAnswers(data)); setBuilding(true); }} />
        </>
      )}
      {tab === "journal" && (
        <>
          {unread.length > 0 && <Panel title="New from your coach"><div className="grid gap-2 p-4">{unread.map((f) => <FeedbackItem key={f.id} f={f} onRead={async (id) => { await api.markFeedbackRead(id); await refresh(); }} />)}</div></Panel>}
          <TiltGuard data={data} />
          <RoutineRow data={data} />
          <JournalTable data={data} onNew={() => setModal({ kind: "trade", editing: null })} onEdit={(j) => setModal({ kind: "trade", editing: j })} onChanged={refresh} />
          {data.feedback.some((f) => !f.journalEntryId && f.readAt) && (
            <Panel title="Coaching notes"><div className="grid max-h-80 gap-2 overflow-auto p-4">{data.feedback.filter((f) => !f.journalEntryId && f.readAt).map((f) => <FeedbackItem key={f.id} f={f} />)}</div></Panel>
          )}
          <PracticeCard data={data} />
        </>
      )}

      {modal.kind === "account" && <AccountModal open onClose={close} catalog={catalog} editing={modal.editing} initialTemplateId={modal.templateId} today={data.today} onSaved={refresh} />}
      {modal.kind === "trade" && <TradeModal open onClose={close} accounts={data.accounts} editing={modal.editing} today={data.today} onSaved={refresh} />}
    </div>
  );
}

/* ───────────────────────── plan view ───────────────────────── */

function Tile({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="hud p-4">
      <div className="text-[12.5px] text-ink-3">{label}</div>
      <div className={cx("mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em]", tone)}>{value}</div>
      {sub && <div className="mt-1.5 text-[12.5px] leading-snug text-ink-3">{sub}</div>}
    </div>
  );
}

function PlanView({ data, plan, onAdd, onTweak }: { data: DashboardData; plan: GoalPlan; onAdd: (templateId: string) => void; onTweak: (a: GoalAnswers) => Promise<void> }) {
  const a = plan.answers, b = plan.breakdown, r = plan.req;
  const path = useMemo(() => monthPath(data.journal, data.today, a.monthlyGoal), [data.journal, data.today, a.monthlyGoal]);
  const todayN = Number(data.today.slice(8, 10));
  const nowRow = path[Math.min(todayN, path.length) - 1];
  const actual = nowRow?.actual ?? 0, pace = nowRow?.target ?? 0, ahead = actual - pace;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <section className="hud p-5">
        <div className="text-[13px] font-medium text-ink-3">Your goal</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3"><span className="text-[44px] font-semibold leading-none tracking-[-0.03em]">{money0(a.monthlyGoal)}</span><span className="text-[16px] text-ink-2">take-home per month</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Step label="Each month" value={money0(b.monthly)} sub={`${b.tradingDaysPerMonth} trading days`} />
          <Step label="Each week" value={money0(b.weekly)} sub={`${a.daysPerWeek} days a week`} />
          <Step label="Each day" value={money0(b.daily)} sub={`${a.tradesPerDay} trade${a.tradesPerDay === 1 ? "" : "s"} a day`} />
          <Step label="Each trade" value={money0(b.perTrade)} sub="on average, before the firm's split" last />
        </div>
        <p className="mt-3 text-[12.5px] text-ink-3">After the firm's profit split (about 90% to you), reaching {money0(b.monthly)} means earning about {money0(b.grossMonthly)} on the account each month.</p>
      </section>

      <Panel title="This month so far" right={<span className="text-[12.5px] text-ink-3">{ahead >= 0 ? "At or above" : "Below"} the straight-line pace by {money0(Math.abs(ahead))}</span>}>
        <div className="overflow-x-auto p-4"><div className="min-w-[560px]"><MonthChart path={path} goal={a.monthlyGoal} todayN={todayN} /></div></div>
        <div className="grid grid-cols-3 gap-3 border-t border-line px-4 py-3 text-[13px]">
          <div><div className="text-ink-3">Made so far</div><div className={cx("text-[17px] font-semibold", actual > 0 ? "text-win" : actual < 0 ? "text-loss" : "")}>{usd(actual, { sign: true })}</div></div>
          <div><div className="text-ink-3">Pace for today</div><div className="text-[17px] font-semibold">{money0(pace)}</div></div>
          <div><div className="text-ink-3">Month goal</div><div className="text-[17px] font-semibold">{money0(a.monthlyGoal)}</div></div>
        </div>
      </Panel>

      <Panel title="What it takes" right={<span className="text-[12.5px] text-ink-3">built from your goal and the assumptions below</span>}>
        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
          <Tile label="Risk per trade" value={r.riskPerTrade != null ? money0(r.riskPerTrade) : "n/a"} sub="What each trade must risk, on average, for the goal to work." />
          <Tile label="Size" value={r.contracts != null ? `${r.contracts} ${a.instrument}` : "n/a"} sub={`With a ${a.stopPts}-point stop. Spread across accounts if one cannot carry it.`} />
          <Tile label="Trades per day" value={a.tradesPerDay} sub={`${b.tradesPerMonth} trades a month, about ${r.winsPerMonth} of them winners.`} />
          <Tile label="Stop for the day" value={r.dailyStop ? money0(r.dailyStop) : "n/a"} sub="Two full losses and you are done for the day." />
          <Tile label="Expect a losing streak" value={`${r.losingStreak} in a row`} sub="Normal, even with a good plan. Size so it does not hurt." />
          <Tile label="Accounts to run" value={plan.picks[0] ? plan.picks[0].accountsNeeded : "n/a"} sub={plan.picks[0] ? `of ${plan.picks[0].label}, to reach this at a safe risk.` : "Add a realistic win rate to see this."} />
        </div>
        {plan.notes.map((n, i) => <p key={i} className="mx-4 mb-3 rounded-md border border-line-2 bg-panel-2 px-3 py-2.5 text-[13.5px] text-ink-2">{n}</p>)}
        <Assumptions a={a} onSave={onTweak} />
      </Panel>

      <Recommended plan={plan} onAdd={onAdd} top />

      {data.tradingPlan && (
        <Panel title="Your trading rules" right={<span className="text-[12.5px] text-ink-3">your pre-trade checklist is built from these</span>}>
          <ul className="grid gap-1.5 p-4 text-[14px] text-ink-2">{planChecklist(data.tradingPlan).map((l, i) => <li key={i} className="flex gap-2"><span className="text-ink-3">•</span>{l}</li>)}</ul>
        </Panel>
      )}
      <p className="text-[12.5px] leading-relaxed text-ink-3">This plan is arithmetic built from your goal and from the assumptions you can see and change. It is not a prediction, and it does not mean any month will turn out this way. Trading carries risk, and most people lose money.</p>
    </div>
  );
}

function Step({ label, value, sub, last }: { label: string; value: string; sub: string; last?: boolean }) {
  return (
    <div className="relative rounded-lg border border-line bg-panel-2 p-3.5">
      <div className="text-[12.5px] text-ink-3">{label}</div>
      <div className="mt-0.5 text-[24px] font-semibold tracking-[-0.02em]">{value}</div>
      <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>
      {!last && <span aria-hidden className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-ink-3 md:block">›</span>}
    </div>
  );
}

function MonthChart({ path, goal, todayN }: { path: { d: number; target: number; actual: number | null }[]; goal: number; todayN: number }) {
  const W = 720, H = 220, L = 46, R = 14, T = 12, B = 26;
  const vals = path.flatMap((p) => [p.target, p.actual ?? 0, 0]);
  const hi = Math.max(goal, ...vals) * 1.08, lo = Math.min(0, ...vals);
  const X = (d: number) => L + ((d - 1) / Math.max(1, path.length - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const act = path.filter((p) => p.actual != null);
  const ticks = [0, 0.5, 1].map((f) => Math.round((goal * f) / 50) * 50);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Your profit this month against the pace needed for your goal">
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="var(--color-line)" /><text x={L - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-3)">{usd(t)}</text></g>)}
      <polyline fill="none" stroke="var(--color-ink-3)" strokeWidth="1.6" strokeDasharray="5 5" points={path.map((p) => `${X(p.d)},${Y(p.target)}`).join(" ")} />
      {act.length > 1 && <polygon fill="var(--color-ink)" fillOpacity="0.06" points={`${X(act[0].d)},${Y(0)} ${act.map((p) => `${X(p.d)},${Y(p.actual!)}`).join(" ")} ${X(act[act.length - 1].d)},${Y(0)}`} />}
      {act.length > 0 && <polyline fill="none" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinejoin="round" points={act.map((p) => `${X(p.d)},${Y(p.actual!)}`).join(" ")} />}
      {act.length > 0 && <circle cx={X(act[act.length - 1].d)} cy={Y(act[act.length - 1].actual!)} r="4.5" fill="var(--color-signal)" />}
      <line x1={X(todayN)} x2={X(todayN)} y1={T} y2={H - B} stroke="var(--color-line-2)" strokeDasharray="2 3" />
      {[1, 8, 15, 22, path.length].map((d) => <text key={d} x={X(d)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-ink-3)">{d}</text>)}
      <text x={W - R} y={Y(goal) - 6} textAnchor="end" fontSize="11" fill="var(--color-ink-2)">Goal {usd(goal)}</text>
      <g fontSize="11" fill="var(--color-ink-2)"><line x1={L + 8} x2={L + 30} y1={T + 8} y2={T + 8} stroke="var(--color-ink-3)" strokeDasharray="5 5" strokeWidth="1.6" /><text x={L + 36} y={T + 12}>Pace needed</text><line x1={L + 128} x2={L + 150} y1={T + 8} y2={T + 8} stroke="var(--color-ink)" strokeWidth="2.4" /><text x={L + 156} y={T + 12}>You so far</text></g>
    </svg>
  );
}

/** The assumptions behind the maths, in the open, editable. */
function Assumptions({ a, onSave }: { a: GoalAnswers; onSave: (a: GoalAnswers) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ winRate: Math.round(a.winRate * 100), stopPts: a.stopPts, targetPts: a.targetPts, tradesPerDay: a.tradesPerDay });
  const [busy, setBusy] = useState(false);
  return (
    <div className="border-t border-line px-4 py-3">
      <button className="text-[13.5px] font-medium text-ice" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Hide" : "Show"} the assumptions behind these numbers</button>
      {!open && <span className="ml-2 text-[12.5px] text-ink-3">{Math.round(a.winRate * 100)}% of trades win · {a.stopPts}-point stop · {a.targetPts}-point target</span>}
      {open && (
        <div className="mt-3 grid gap-3">
          <p className="text-[13px] text-ink-2">These are planning assumptions, not predictions. A trader who wins {Math.round(a.winRate * 100)}% of the time with a {a.stopPts}-point stop and a {a.targetPts}-point target earns about {(a.winRate * (a.targetPts / a.stopPts) - (1 - a.winRate)).toFixed(2)}R per trade on average. Once you have logged about 20 trades, replace the win rate with your own.</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([["Win rate (%)", "winRate", 5, 90], ["Stop (points)", "stopPts", 1, 200], ["Target (points)", "targetPts", 1, 500], ["Trades per day", "tradesPerDay", 1, 10]] as const).map(([l, k, mn, mx]) => (
              <label key={k} className="grid gap-1 text-[12.5px] text-ink-3">{l}
                <input className="field" inputMode="decimal" value={String(v[k])} onChange={(e) => setV({ ...v, [k]: Math.min(mx, Math.max(mn, num(e.target.value))) })} />
              </label>
            ))}
          </div>
          <div><button className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); try { await onSave({ ...a, winRate: v.winRate / 100, stopPts: v.stopPts, targetPts: v.targetPts, tradesPerDay: v.tradesPerDay }); setOpen(false); } finally { setBusy(false); } }}>{busy ? "Saving…" : "Save and recalculate"}</button></div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── recommended accounts ───────────────────────── */

function Recommended({ plan, onAdd, top }: { plan: GoalPlan; onAdd: (templateId: string) => void; top?: boolean }) {
  const picks = plan.picks;
  return (
    <Panel title="Accounts that fit you" right={<span className="text-[12.5px] text-ink-3">ranked for your goal, budget and comfort</span>}>
      {picks.length === 0 ? (
        <p className="p-4 text-[14px] text-ink-2">With these assumptions no account can reach the goal. Adjust the assumptions or the goal above.</p>
      ) : (
        <div className={cx("grid gap-3 p-4", top ? "lg:grid-cols-3" : "lg:grid-cols-3")}>
          {picks.map((p, i) => <PickCard key={p.templateId} p={p} rank={i + 1} onAdd={() => onAdd(p.templateId)} />)}
        </div>
      )}
      <p className="border-t border-line px-4 py-3 text-[12.5px] leading-relaxed text-ink-3">Rules and prices change. Always check the firm&apos;s own page for the current price and rules before you buy anything. Showing an account here is not a recommendation to buy it.</p>
    </Panel>
  );
}

function PickCard({ p, rank, onAdd }: { p: Recommendation; rank: number; onAdd: () => void }) {
  const [more, setMore] = useState(false);
  return (
    <div className={cx("flex flex-col rounded-xl border p-4", rank === 1 ? "border-ink-3" : "border-line")}>
      <div className="flex items-center justify-between"><span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">{rank === 1 ? "Best fit" : `Option ${rank}`}</span>{p.dataStatus !== "OFFICIAL" && <span className="chip !h-5 !text-[11px] text-lag">Rules to verify</span>}</div>
      <h3 className="mt-1 text-[16px] font-semibold leading-snug">{p.label}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
        <div><dt className="text-ink-3">Accounts needed</dt><dd className="font-medium">{p.accountsNeeded}</dd></div>
        <div><dt className="text-ink-3">Safe risk per trade</dt><dd className="font-medium">{usd(p.riskPerTrade)}</dd></div>
        <div><dt className="text-ink-3">Max loss</dt><dd className="font-medium">{usd(p.rules.maxLoss)}</dd></div>
        <div><dt className="text-ink-3">Daily loss limit</dt><dd className="font-medium">{p.rules.dailyLossLimit ? usd(p.rules.dailyLossLimit) : "None"}</dd></div>
      </dl>
      <ul className="mt-3 grid gap-1.5 text-[13px] text-ink-2">{p.reasons.slice(0, more ? p.reasons.length : 2).map((r, i) => <li key={i} className="flex gap-2"><span className="text-ink-3">•</span>{r}</li>)}</ul>
      {p.reasons.length > 2 && <button className="mt-1.5 self-start text-[12.5px] font-medium text-ice" onClick={() => setMore(!more)}>{more ? "Show less" : `Show ${p.reasons.length - 2} more reasons`}</button>}
      <button className="btn mt-auto self-start !mt-4" onClick={onAdd}>Add to my accounts</button>
    </div>
  );
}

/* ───────────────────────── the question series ───────────────────────── */

const STEPS = ["Your goal", "You and your risk", "Money", "Time", "Your plan"] as const;

function Chips<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; t: string; sub?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
          className={cx("rounded-lg border px-3.5 py-2 text-left text-[14px] transition-colors", value === o.v ? "border-ink bg-ink text-void" : "border-line-2 text-ink-2 hover:border-ink-3")}>
          <div className="font-medium">{o.t}</div>{o.sub && <div className={cx("text-[12px]", value === o.v ? "opacity-75" : "text-ink-3")}>{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}
function Money({ value, onChange, presets, label }: { value: number; onChange: (n: number) => void; presets: number[]; label: string }) {
  return (
    <div className="grid gap-2">
      <label className="relative max-w-[240px]"><span className="sr-only">{label}</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">$</span><input className="field !pl-7 !text-[17px]" inputMode="numeric" value={value ? String(value) : ""} onChange={(e) => onChange(num(e.target.value))} /></label>
      <div className="flex flex-wrap gap-2">{presets.map((n) => <button key={n} type="button" onClick={() => onChange(n)} className={cx("h-8 rounded-full border px-3 text-[13px]", value === n ? "border-ink bg-ink text-void" : "border-line-2 text-ink-2 hover:border-ink-3")}>{money0(n)}</button>)}</div>
    </div>
  );
}
const Q = ({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) => (
  <div className="grid gap-2.5"><div><h3 className="text-[15.5px] font-semibold">{title}</h3>{help && <p className="mt-0.5 text-[13px] text-ink-3">{help}</p>}</div>{children}</div>
);

function Wizard({ data, catalog, answers, setAnswers, onSaved, canCancel, onCancel }: { data: DashboardData; catalog: CatalogFirm[]; answers: GoalAnswers; setAnswers: (a: GoalAnswers) => void; onSaved: () => Promise<void>; canCancel: boolean; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const a = answers, set = (p: Partial<GoalAnswers>) => setAnswers({ ...a, ...p });
  const plan = useMemo(() => (step === 4 ? buildGoalPlan(a, catalog, { runs: 300 }) : null), [step, a, catalog]);
  const pickStyle = (s: Style) => set({ style: s, winRate: STYLE_PRESETS[s].winRate, stopPts: STYLE_PRESETS[s].stopPts, targetPts: STYLE_PRESETS[s].targetPts });
  const valid = [a.monthlyGoal > 0, true, a.budget >= 0 && a.evalFee > 0, a.sessions.length > 0, true][step];

  async function save() {
    if (!plan) return;
    setBusy(true); setError(null);
    try {
      const input = planFromAnswers(a, plan, data.tradingPlan ? ((({ done: _d, updatedAt: _u, ...p }) => p)(data.tradingPlan) as TradingPlanInput) : null);
      await api.savePlan(input);
      await api.saveRoadmap({ monthlyIncomeGoal: a.monthlyGoal, tradingDaysPerWeek: a.daysPerWeek, strategyMode: "DAILY_LEVELS", multiSession: false, strategies: ["DAILY_LEVELS"], avgRR: Math.round((a.targetPts / a.stopPts) * 100) / 100, tradesPerDay: a.tradesPerDay, primaryInstrument: a.instrument, avgStopPoints: a.stopPts });
      await onSaved();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid w-full max-w-[860px] grid-cols-[minmax(0,1fr)] gap-5">
      <div>
        <div className="text-[13px] font-medium text-ink-3">Build your plan · step {step + 1} of {STEPS.length}</div>
        <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">{step === 4 ? "Here is your plan" : "Tell us what you want, and we will build the plan"}</h1>
        <div className="mt-3 grid grid-cols-5 gap-1.5" aria-hidden>{STEPS.map((s, i) => <div key={s} className="h-1.5 rounded-full" style={{ background: i <= step ? "var(--color-ink)" : "var(--color-line-2)" }} />)}</div>
        <div className="mt-1.5 flex justify-between text-[12px] text-ink-3">{STEPS.map((s, i) => <span key={s} className={i === step ? "font-medium text-ink" : ""}>{s}</span>)}</div>
      </div>

      <section className="hud grid gap-6 p-5">
        {step === 0 && <>
          <Q title="How much do you want to make each month?" help="Take-home, after the firm's profit split. Be honest about the number you actually want, and we will show you what it takes."><Money label="Monthly goal" value={a.monthlyGoal} onChange={(n) => set({ monthlyGoal: n })} presets={[1000, 2500, 5000, 10000]} /></Q>
          <Q title="How many days a week will you trade?"><Chips value={a.daysPerWeek} onChange={(v) => set({ daysPerWeek: v })} options={[{ v: 2, t: "2 days" }, { v: 3, t: "3 days" }, { v: 4, t: "4 days" }, { v: 5, t: "5 days" }]} /></Q>
        </>}
        {step === 1 && <>
          <Q title="How experienced are you?"><Chips<Experience> value={a.experience} onChange={(v) => set({ experience: v })} options={[{ v: "new", t: "New", sub: "Still learning" }, { v: "some", t: "Some experience", sub: "I trade, not yet steadily" }, { v: "experienced", t: "Experienced", sub: "Steady for a while" }]} /></Q>
          <Q title="What style sounds like you?" help="This only sets starting assumptions. You can change them on the next page."><Chips<Style> value={a.style} onChange={pickStyle} options={(Object.keys(STYLE_PRESETS) as Style[]).map((s) => ({ v: s, t: STYLE_PRESETS[s].label, sub: STYLE_PRESETS[s].blurb }))} /></Q>
          <Q title="What is the biggest losing day you could take without it shaking you?" help="We keep your risk inside this number. A smaller number means a safer plan, and usually more accounts or more time."><Money label="Biggest losing day" value={a.maxLossDay} onChange={(n) => set({ maxLossDay: n })} presets={[150, 300, 500, 1000]} /></Q>
        </>}
        {step === 2 && <>
          <Q title="How much can you spend on evaluations in total?" help="Evaluations are the paid tests prop firms use. Money you cannot afford to lose should never go here."><Money label="Evaluation budget" value={a.budget} onChange={(n) => set({ budget: n })} presets={[200, 500, 1000, 2500]} /></Q>
          <Q title="What does one evaluation usually cost?" help="Check a firm's page for today's price. This is only used to estimate your spend."><Money label="Fee per evaluation" value={a.evalFee} onChange={(n) => set({ evalFee: n })} presets={[75, 150, 250, 400]} /></Q>
        </>}
        {step === 3 && <>
          <Q title="When can you trade?" help="Pick every session you will actually be at the screen for."><div className="flex flex-wrap gap-2">{(Object.keys(PLAN_SESSIONS) as PlanSessionKey[]).map((s) => { const on = a.sessions.includes(s); return <button key={s} type="button" aria-pressed={on} onClick={() => set({ sessions: on ? a.sessions.filter((x) => x !== s) : [...a.sessions, s] })} className={cx("rounded-lg border px-3.5 py-2 text-[14px]", on ? "border-ink bg-ink text-void" : "border-line-2 text-ink-2 hover:border-ink-3")}>{PLAN_SESSIONS[s]}</button>; })}</div></Q>
          <Q title="How many trades a day?" help="Fewer, better trades is the standard in this school."><Chips value={a.tradesPerDay} onChange={(v) => set({ tradesPerDay: v })} options={[{ v: 1, t: "1 trade" }, { v: 2, t: "2 trades" }, { v: 3, t: "3 trades" }]} /></Q>
        </>}
        {step === 4 && plan && <Review plan={plan} />}
      </section>

      <ErrorLine error={error} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">{step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}{canCancel && <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>}</div>
        {step < 4 ? <button className="btn btn-primary" disabled={!valid} onClick={() => setStep(step + 1)}>Next</button> : <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save my plan"}</button>}
      </div>
    </div>
  );
}

function Review({ plan }: { plan: GoalPlan }) {
  const a = plan.answers, b = plan.breakdown, r = plan.req;
  return (
    <div className="grid gap-5">
      <div>
        <div className="text-[13px] text-ink-3">To make {money0(a.monthlyGoal)} a month</div>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Step label="Each month" value={money0(b.monthly)} sub={`${b.tradingDaysPerMonth} days`} /><Step label="Each week" value={money0(b.weekly)} sub={`${a.daysPerWeek} days`} />
          <Step label="Each day" value={money0(b.daily)} sub={`${a.tradesPerDay} trade${a.tradesPerDay === 1 ? "" : "s"}`} /><Step label="Each trade" value={money0(b.perTrade)} sub="average, gross" last />
        </div>
      </div>
      <div className="grid gap-2 text-[14px] text-ink-2">
        <p>With the assumptions for a <b className="text-ink">{STYLE_PRESETS[a.style].label.toLowerCase()}</b> style ({Math.round(a.winRate * 100)}% of trades win, {a.stopPts}-point stop, {a.targetPts}-point target), each trade has to risk about <b className="text-ink">{r.riskPerTrade != null ? money0(r.riskPerTrade) : "an amount that does not work"}</b> on average, and you should expect a losing streak of about <b className="text-ink">{r.losingStreak}</b> in a row.</p>
        {plan.notes.map((n, i) => <p key={i} className="rounded-md border border-line-2 bg-panel-2 px-3 py-2.5">{n}</p>)}
      </div>
      <div>
        <h3 className="text-[15.5px] font-semibold">Accounts that fit you best</h3>
        <div className="mt-2 grid gap-3 md:grid-cols-3">{plan.picks.length ? plan.picks.map((p, i) => (
          <div key={p.templateId} className={cx("rounded-xl border p-3.5", i === 0 ? "border-ink-3" : "border-line")}>
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">{i === 0 ? "Best fit" : `Option ${i + 1}`}</div>
            <div className="mt-1 text-[14.5px] font-semibold leading-snug">{p.label}</div>
            <div className="mt-1 text-[13px] text-ink-2">{p.accountsNeeded} account{p.accountsNeeded > 1 ? "s" : ""} · {usd(p.riskPerTrade)} per trade</div>
            <div className="mt-1 text-[12.5px] text-ink-3">{p.withinBudget ? `About ${usd(p.evalSpend)} in evaluations, inside your budget.` : `About ${usd(p.evalSpend)} in evaluations, above your budget.`}</div>
          </div>
        )) : <p className="text-[13.5px] text-ink-3">No account fits these assumptions. Go back and change the goal or the style.</p>}</div>
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-3">This is arithmetic on assumptions, not a prediction. Saving it creates your plan page, your daily targets and your pre-trade checklist. You can change any answer later.</p>
    </div>
  );
}
