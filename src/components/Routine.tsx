"use client";
// Daily routine: tilt guard, pre-session checklist, weekly self-review (private to the member),
// and the "what if" planner for a member's real accounts. Standard FLOWMTD risk: 15-pt stop, 40-pt target.
import { useEffect, useMemo, useState } from "react";
import { api, type LogEntry } from "@/lib/api-client";
import type { AccountDTO, DashboardData } from "@/lib/types";
import { pct, usd } from "@/lib/format";
import { Panel, Stat, cx } from "./ui";
import { planChecklist } from "@/lib/tradingPlan";

export const STD_STOP = 15, STD_TARGET = 40;
export const TILT_LIMIT = 2;

// ── Dates (all ET calendar days as YYYY-MM-DD) ─────────────
const dayNum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;
const fromNum = (n: number) => new Date(n * 864e5).toISOString().slice(0, 10);
const weekday = (d: string) => new Date(dayNum(d) * 864e5).getUTCDay(); // 0 Sun … 6 Sat
const addDays = (d: string, n: number) => fromNum(dayNum(d) + n);
const prevWeekday = (d: string) => { let x = addDays(d, -1); while (weekday(x) === 0 || weekday(x) === 6) x = addDays(x, -1); return x; };
/** The Friday that closes the trading week containing d (Sat/Sun belong to the week just ended). */
const fridayOf = (d: string) => { const w = weekday(d); return addDays(d, w === 6 ? -1 : w === 0 ? -2 : 5 - w); };
const nice = (d: string) => new Date(dayNum(d) * 864e5).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

// ── Tilt guard ─────────────────────────────────────────────
export function lossesOn(data: DashboardData, day: string, accountId?: string) {
  return data.journal.filter((j) => j.tradeDate === day && j.outcome === "LOSS" && (!accountId || j.memberAccountId === accountId)).length;
}
export function TiltGuard({ data }: { data: DashboardData }) {
  const n = lossesOn(data, data.today);
  if (n === 0) return null;
  const done = n >= TILT_LIMIT;
  return (
    <div role="status" className={cx("hud flex flex-wrap items-center gap-3 px-4 py-3", done ? "border-loss/60" : "border-lag/50")}>
      <span className={cx("chip", done ? "text-loss" : "text-lag")}>{done ? "Tilt guard · done for today" : "Tilt guard"}</span>
      <p className="min-w-0 flex-1 text-sm text-ink-2">
        {done
          ? <><b className="text-ink">{n} losses today. You're done.</b> Close the charts. The plan starts fresh next session, and no trade today can fix this one.</>
          : <><b className="text-ink">1 loss today.</b> One more and you're done for the day. Only take an A+ setup with the standard {STD_STOP}-pt stop.</>}
      </p>
    </div>
  );
}

// ── Pre-session checklist ──────────────────────────────────
const CHECKLIST = [
  "Checked the news calendar. No trading into red-folder news.",
  "Marked my opening prices and today's levels.",
  "Know which model I'm trading today, and its session.",
  `Bracket ready: ${STD_STOP}-pt stop, ${STD_TARGET}-pt target, size from my plan.`,
  `Know my daily stop. ${TILT_LIMIT} losses = done for the day.`,
  "Calm and rested. Not trying to win back yesterday.",
];
type Logs = { list: LogEntry[]; set: (e: LogEntry) => void; failed: boolean };
function useLogs(): Logs | null {
  const [list, setList] = useState<LogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { api.logs().then(setList, () => { setList([]); setFailed(true); }); }, []);
  if (!list) return null;
  const set = (e: LogEntry) => {
    setList((l) => [e, ...(l ?? []).filter((x) => !(x.kind === e.kind && x.day === e.day))]);
    api.saveLog(e).catch(() => setFailed(true));
  };
  return { list, set, failed };
}
const complete = (e: LogEntry | undefined, n: number) => !!e && Array.isArray(e.data.done) && (e.data.done as number[]).length >= n;

function Checklist({ logs, today, items = CHECKLIST, fromPlan }: { logs: Logs; today: string; items?: string[]; fromPlan?: boolean }) {
  const CHECKLIST = items;
  const entry = logs.list.find((e) => e.kind === "checklist" && e.day === today);
  const done = new Set<number>((entry?.data.done as number[]) ?? []);
  const byDay = new Map(logs.list.filter((e) => e.kind === "checklist").map((e) => [e.day, e]));
  const weekend = weekday(today) === 0 || weekday(today) === 6;
  const toggle = (i: number) => {
    const next = new Set(done); next.has(i) ? next.delete(i) : next.add(i);
    logs.set({ kind: "checklist", day: today, data: { done: [...next].sort() } });
  };
  const all = done.size >= CHECKLIST.length;
  return (
    <Panel title="Before you trade">
      <div className="grid gap-2 p-4">
        <p className="text-sm text-ink-3">{weekend ? "Weekend. Use it to prep Monday's levels." : fromPlan ? "From your trading plan. Tick every line before your first trade." : "Tick every line before your first trade. Only you see this."}</p>
        <ul className="grid gap-1.5">
          {CHECKLIST.map((t, i) => (
            <li key={i}>
              <label className={cx("flex cursor-pointer items-start gap-3 border px-3 py-2 text-sm", done.has(i) ? "border-win/40 text-ink" : "border-line text-ink-2")}>
                <input type="checkbox" className="mt-0.5 h-4 w-4 flex-none" style={{ accentColor: "var(--color-win)" }} checked={done.has(i)} onChange={() => toggle(i)} />
                <span>{t}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className={cx("text-sm", all ? "text-win" : "text-ink-3")}>{all ? "Cleared to trade. Stick to the plan." : `${CHECKLIST.length - done.size} left before you're cleared.`}</p>
        {logs.failed && <p className="text-xs text-loss">Couldn't save just now. Your ticks will save on the next change.</p>}
      </div>
    </Panel>
  );
}

// ── Weekly self-review ─────────────────────────────────────
const QUESTIONS = [
  "What did I do well this week?",
  "Which rule did I break, or almost break? What triggered it?",
  "One thing I'll focus on next week:",
];
function WeeklyReview({ logs, data }: { logs: Logs; data: DashboardData }) {
  const fri = fridayOf(data.today), mon = addDays(fri, -4);
  const saved = logs.list.find((e) => e.kind === "review" && e.day === fri);
  const [answers, setAnswers] = useState<string[]>(() => QUESTIONS.map((_, i) => String((saved?.data.answers as string[] | undefined)?.[i] ?? "")));
  const [savedNote, setSavedNote] = useState(false);
  const week = data.journal.filter((j) => j.tradeDate >= mon && j.tradeDate <= addDays(fri, 2));
  const pnl = week.reduce((s, j) => s + j.pnl, 0), followed = week.length ? week.filter((j) => j.followedPlan).length / week.length : null;
  const due = weekday(data.today) >= 5 || weekday(data.today) === 0;
  const past = logs.list.filter((e) => e.kind === "review" && e.day !== fri).slice(0, 4);
  const save = () => { logs.set({ kind: "review", day: fri, data: { answers, pnl, trades: week.length, followed } }); setSavedNote(true); };
  return (
    <Panel title="Weekly self-review" right={<span className={cx("chip", due ? "text-signal" : "text-ink-3")}>{due ? "Due now" : `Due ${nice(fri)}`}</span>}>
      <div className="grid gap-3 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Week P&L" value={usd(pnl, { sign: true })} tone={pnl > 0 ? "win" : pnl < 0 ? "loss" : undefined} />
          <Stat label="Trades" value={week.length} />
          <Stat label="Plan followed" value={pct(followed)} />
        </div>
        {QUESTIONS.map((q, i) => (
          <label key={i} className="grid gap-1">
            <span className="label">{q}</span>
            <textarea className="field min-h-16 py-2" maxLength={600} value={answers[i]} onChange={(e) => { setSavedNote(false); setAnswers((a) => a.map((x, k) => (k === i ? e.target.value : x))); }} />
          </label>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={save} disabled={answers.every((a) => !a.trim())}>{saved ? "Update review" : "Save review"}</button>
          <span className="text-xs text-ink-3">{savedNote ? "Saved. Only you can see it." : "Private. Coaches don't see your reviews."}</span>
        </div>
        {past.length > 0 && (
          <details className="border-t border-line pt-3">
            <summary className="cursor-pointer text-sm text-ink-2">Past reviews ({past.length})</summary>
            <div className="mt-2 grid gap-2">
              {past.map((e) => (
                <div key={e.day} className="border border-line p-3 text-sm">
                  <div className="label mb-1">Week ending {nice(e.day)} · {usd(Number(e.data.pnl ?? 0), { sign: true })}</div>
                  {QUESTIONS.map((q, i) => ((e.data.answers as string[])?.[i] ? <p key={i} className="text-ink-2"><span className="text-ink-3">{q} </span>{(e.data.answers as string[])[i]}</p> : null))}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </Panel>
  );
}

export function RoutineRow({ data }: { data: DashboardData }) {
  const logs = useLogs();
  if (data.readOnly) return null;
  if (!logs) return <div className="hud px-4 py-3 text-sm text-ink-3">Loading your routine…</div>;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2">
      <Checklist logs={logs} today={data.today} items={data.tradingPlan ? planChecklist(data.tradingPlan) : undefined} fromPlan={!!data.tradingPlan} />
      <WeeklyReview logs={logs} data={data} />
    </div>
  );
}

// ── What-if planner (real accounts) ────────────────────────
const PT_VALUE: Record<string, number> = { MNQ: 2, NQ: 20, MES: 5, ES: 50 };
type Pick = "W" | "L";
export function WhatIfPlanner({ data }: { data: DashboardData }) {
  const accounts = data.accounts.filter((a) => a.stage !== "FAILED" && a.stage !== "ARCHIVED");
  const [id, setId] = useState(accounts[0]?.id ?? "");
  const a = accounts.find((x) => x.id === id) ?? accounts[0];
  if (!a) return (
    <Panel title="What if… · your accounts"><p className="p-4 text-sm text-ink-3">Add an account on your dashboard to see what a win or a loss does to it.</p></Panel>
  );
  return <WhatIfBody key={a.id} a={a} accounts={accounts} setId={setId} data={data} />;
}
function WhatIfBody({ a, accounts, setId, data }: { a: AccountDTO; accounts: AccountDTO[]; setId: (id: string) => void; data: DashboardData }) {
  const c = a.passPlan?.contracts;
  const [unit, setUnit] = useState<string>(c?.micro ?? "MNQ");
  const [qty, setQty] = useState<number>(Math.max(1, c?.micros || 1));
  const [stop, setStop] = useState(STD_STOP), [target, setTarget] = useState(STD_TARGET);
  const [seq, setSeq] = useState<Pick[]>([]);
  const r = a.rules, p = a.pace;
  const L = stop * (PT_VALUE[unit] ?? 2) * qty, W = target * (PT_VALUE[unit] ?? 2) * qty;
  const todayPnl0 = data.journal.filter((j) => j.tradeDate === data.today && j.memberAccountId === a.id).reduce((s, j) => s + j.pnl, 0);
  const losses0 = lossesOn(data, data.today, a.id);
  const dll = a.dailyLossLimitOverride ?? r.dailyLossLimit ?? null;
  const myStop = a.passPlan?.dailyStop ?? null;

  const s = useMemo(() => {
    let bal = p.balance, floor = p.floor, day = todayPnl0, peak = p.balance, losses = losses0;
    for (const x of seq) {
      bal += x === "W" ? W : -L; day += x === "W" ? W : -L; if (x === "L") losses++;
      peak = Math.max(peak, bal);
      // Intraday trailing floors follow the peak, but never past the starting balance (where most firms lock it).
      if (r.drawdownModel === "INTRADAY_TRAILING") floor = Math.max(floor, Math.min(peak - r.maxLoss, r.accountSize));
    }
    const room = bal - floor;
    const left = (budget: number | null) => (budget == null ? null : Math.max(0, Math.floor(budget / L)));
    return {
      bal, floor, day, room, losses,
      toFail: left(room - 0.01),
      toDll: dll == null ? null : left(dll + day - 0.01),
      toStop: myStop == null ? null : left(myStop + day - 0.01),
      winsToPass: r.profitTarget && a.stage === "EVALUATION" ? Math.max(0, Math.ceil((r.accountSize + r.profitTarget - bal) / W)) : null,
    };
  }, [seq, p.balance, p.floor, todayPnl0, losses0, L, W, r, dll, myStop, a.stage]);

  const failed = s.room <= 0, dllHit = dll != null && s.day <= -dll, tilt = s.losses >= TILT_LIMIT, stopHit = myStop != null && s.day <= -myStop;
  const safeQty = Math.floor(s.room / (5 * stop * (PT_VALUE[unit] ?? 2)));
  const msgs: { tone: "loss" | "lag" | "win" | "ink"; t: string }[] = [];
  if (failed) msgs.push({ tone: "loss", t: `The account fails here: balance ${usd(s.bal)} is at or below the floor ${usd(s.floor)}.` });
  else {
    if (dllHit) msgs.push({ tone: "loss", t: `Daily loss limit hit (${usd(-dll!)}). The firm locks you out for the day.` });
    else if (stopHit) msgs.push({ tone: "loss", t: `Your daily stop (${usd(-myStop!)}) is hit. Done for today.` });
    if (tilt) msgs.push({ tone: "loss", t: `${s.losses} losses today. Tilt guard: you're done for the day.` });
    if (s.toFail != null && s.toFail < 3) msgs.push({ tone: "lag", t: safeQty >= 1 ? `Only ${s.toFail} more full loss${s.toFail === 1 ? "" : "es"} until the account fails. Cut to ${safeQty} ${unit} to keep 5 losses of room.` : `Only ${s.toFail} more full losses of room, even at 1 ${unit}. Tighten up or stop for the week.` });
    if (!msgs.length) msgs.push({ tone: "win", t: `Healthy. ${s.toFail} losses of room before the floor${s.winsToPass != null ? `, ${s.winsToPass} win${s.winsToPass === 1 ? "" : "s"} from passing` : ""}.` });
  }
  const tone = { loss: "border-loss/50 text-ink", lag: "border-lag/50 text-ink", win: "border-win/40 text-ink", ink: "border-line text-ink-2" };
  const locked = failed || dllHit;

  return (
    <Panel title="What if… · your accounts" right={<span className="chip text-ice">{STD_STOP} stop · {STD_TARGET} target</span>}>
      <div className="grid gap-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1"><span className="label">Account</span>
            <select className="field" value={a.id} onChange={(e) => setId(e.target.value)}>{accounts.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
          <label className="grid gap-1"><span className="label">Contracts</span>
            <span className="flex gap-1"><input className="field num w-16" type="number" min={1} value={qty} onChange={(e) => { setQty(Math.max(1, Math.round(+e.target.value || 1))); setSeq([]); }} />
              <select className="field" value={unit} onChange={(e) => { setUnit(e.target.value); setSeq([]); }}>{[c?.micro ?? "MNQ", c?.mini ?? "NQ"].map((u) => <option key={u}>{u}</option>)}</select></span></label>
          <label className="grid gap-1"><span className="label">Stop · pts</span><input className="field num w-20" type="number" min={1} value={stop} onChange={(e) => { setStop(Math.max(1, +e.target.value || STD_STOP)); setSeq([]); }} /></label>
          <label className="grid gap-1"><span className="label">Target · pts</span><input className="field num w-20" type="number" min={1} value={target} onChange={(e) => { setTarget(Math.max(1, +e.target.value || STD_TARGET)); setSeq([]); }} /></label>
          <span className="text-sm text-ink-3">Each loss <b className="text-loss">−{usd(L)}</b> · each win <b className="text-win">+{usd(W)}</b></span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={() => setSeq((q) => [...q, "L"])} disabled={locked}>Lose 1</button>
          <button className="btn" onClick={() => setSeq((q) => [...q, "W"])} disabled={locked}>Win 1</button>
          <button className="btn btn-ghost" onClick={() => setSeq((q) => q.slice(0, -1))} disabled={!seq.length}>Undo</button>
          <button className="btn btn-ghost" onClick={() => setSeq([])} disabled={!seq.length}>Reset</button>
          <span className="flex flex-wrap gap-1" aria-label="Trades so far">
            {seq.map((x, i) => <span key={i} className={cx("num grid h-7 w-7 place-items-center border text-xs", x === "W" ? "border-win/60 text-win" : "border-loss/60 text-loss")}>{x}</span>)}
            {!seq.length && <span className="text-sm text-ink-3">Starts from today's real balance{losses0 ? ` (${losses0} loss${losses0 > 1 ? "es" : ""} already logged today)` : ""}.</span>}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Balance" value={usd(s.bal)} />
          <Stat label="Room to floor" value={usd(Math.max(0, s.room))} tone={s.room <= L * 2 ? "loss" : undefined} sub={`fails at ${usd(s.floor)}`} />
          <Stat label="Today" value={usd(s.day, { sign: true })} tone={s.day > 0 ? "win" : s.day < 0 ? "loss" : undefined} />
          <Stat label="Losses to fail" value={s.toFail ?? "—"} tone={s.toFail != null && s.toFail < 3 ? "loss" : "ice"} />
          <Stat label="Losses to daily limit" value={s.toDll ?? "No limit"} sub={dll ? `firm limit ${usd(dll)}` : undefined} />
          <Stat label={s.winsToPass != null ? "Wins to pass" : "Losses to your stop"} value={s.winsToPass ?? s.toStop ?? "—"} sub={s.winsToPass == null && myStop ? `your stop ${usd(myStop)}` : undefined} />
        </div>

        <div className="grid gap-2">{msgs.map((m, i) => <p key={i} className={cx("border px-3 py-2 text-sm", tone[m.tone])}>{m.t}</p>)}</div>
        <p className="text-xs text-ink-3">Practice math only, nothing is saved or sent to your firm. {r.drawdownModel === "EOD_TRAILING" ? "This firm trails the floor at end of day, so wins today can raise tomorrow's floor." : r.drawdownModel === "INTRADAY_TRAILING" ? "This firm trails the floor intraday: wins raise it as you go." : "Static drawdown: the floor doesn't move."}</p>
      </div>
    </Panel>
  );
}
