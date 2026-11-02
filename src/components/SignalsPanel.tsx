"use client";
// Coach portal → Signals (admin only): enter the result of each trade the indicators sent, and see the stats they add up to.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import {
  RANGE_LABEL, SESSION_LABEL, SESSION_ORDER, WEEKDAY, byDay, currentStreak, equityCurve, etDay, groupBy, inRange, outcomeOf, ptsText, rangeStart,
  sessionOf, strategyOf, tally, weekdayIdx, addDays, mondayOf, type Group, type Range, type SigRow,
} from "@/lib/signalStats";
import { cx } from "./ui";

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const pctText = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);
const dayShort = (ymd: string) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dayLong = (ymd: string) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const timeET = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const todayET = () => etDay(new Date().toISOString());

/** Counts up to `target` (instantly when the person prefers reduced motion). */
function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(reduced() ? target : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { setV(target); return; }
    const a = from.current, t0 = performance.now(); let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); setV(a + (target - a) * e); if (k < 1) raf = requestAnimationFrame(step); else from.current = target; };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
/** False on the first paint, true right after: lets CSS transitions play when a chart appears or its data changes. */
function useGrow(key: unknown) {
  const [on, setOn] = useState(reduced());
  useEffect(() => { if (reduced()) { setOn(true); return; } setOn(false); const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true))); return () => cancelAnimationFrame(id); }, [key]);
  return on;
}

/** Coach portal → trade results (admin only): enter the result of each trade the indicators sent. The stats everyone sees live on the Stats page. */
export function SignalsPanel() {
  const [rows, setRows] = useState<SigRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(120);
  const load = useCallback((d: number) => api.signalsRows(d).then((r) => { setRows(r.rows); setError(null); }, (e) => setError(e instanceof Error ? e.message : "Couldn't load")), []);
  useEffect(() => { load(days); }, [days, load]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="hud animate-rise flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="label !text-ice">Trade results</div>
          <div className="mt-0.5 text-sm text-ink-3">Every trade the indicators send lands here. You enter the result; the member Stats page works itself out.</div>
        </div>
        <a className="btn" href="#stats">View the Stats page →</a>
      </section>
      {error && <p className="text-sm text-loss">{error}</p>}
      {!rows && !error && <p className="hud p-8 text-center text-ink-3">Loading the trades…</p>}
      {rows && <Results rows={rows} days={days} onMore={() => setDays((d) => Math.min(400, d + 60))} onSaved={(id, patch) => setRows((rs) => rs && rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))} />}
    </div>
  );
}

/** The Stats page every member sees: the same animated numbers, read-only. */
export function StatsPage() {
  const [rows, setRows] = useState<SigRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.signalsStats().then((r) => setRows(r.rows), (e) => setError(e instanceof Error ? e.message : "Couldn't load")); }, []);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="hud animate-rise px-4 py-3">
        <div className="label !text-ice">Stats</div>
        <div className="mt-0.5 text-sm text-ink-3">These are the trades taken from the signals.</div>
      </section>
      {error && <p className="text-sm text-loss">{error}</p>}
      {!rows && !error && <p className="hud p-8 text-center text-ink-3">Loading the stats…</p>}
      {rows && <Stats rows={rows} />}
    </div>
  );
}

/* ───────────────────────────── Stats ───────────────────────────── */
function Stats({ rows }: { rows: SigRow[] }) {
  const [range, setRange] = useState<Range>("week");
  const today = todayET();
  const inR = useMemo(() => inRange(rows, range, today), [rows, range, today]);
  const t = useMemo(() => tally(inR), [inR]);
  const start = rangeStart(range, today) === "0000-00-00" ? (rows.length ? etDay(rows[rows.length - 1].received_at) : today) : rangeStart(range, today);
  const dayRows = useMemo(() => byDay(inR, range === "week" ? mondayOf(today) : start, range === "week" ? addDays(mondayOf(today), 6) : today), [inR, range, start, today]);
  const lastBusy = [...dayRows].reverse().find((d) => d.entries > 0)?.date ?? today;
  const [pick, setPick] = useState<string | null>(null);
  const sel = pick && dayRows.some((d) => d.date === pick) ? pick : lastBusy;
  const key = `${range}:${inR.length}`;
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Date range">
        {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
          <button key={r} role="radio" aria-checked={range === r} onClick={() => { setRange(r); setPick(null); }} className={cx("chip !h-8 cursor-pointer px-3", range === r ? "!border-ice !text-ink bg-ice/10" : "text-ink-3 hover:text-ink-2")}>{RANGE_LABEL[r]}</button>
        ))}
      </div>
      <Hero t={t} range={range} k={key} inR={inR} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PointsPerDay days={dayRows} selected={sel} onPick={setPick} k={key} />
        <DayDetail rows={inR.filter((r) => etDay(r.received_at) === sel)} date={sel} />
      </div>
      <Equity rows={inR} k={key} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Breakdown title="By session" groups={groupBy(inR, sessionOf, (k) => SESSION_LABEL[k] ?? k, SESSION_ORDER).filter((g) => g.entries > 0)} k={key} />
        <Breakdown title="By strategy" groups={groupBy(inR, strategyOf, (k) => k)} k={key} />
        <Breakdown title="Longs and shorts" groups={groupBy(inR, (r) => (r.direction ?? "—").toUpperCase(), (k) => (k === "LONG" ? "Longs" : k === "SHORT" ? "Shorts" : k))} k={key} />
        <Breakdown title="By weekday" groups={groupBy(inR, (r) => String(weekdayIdx(etDay(r.received_at))), (k) => WEEKDAY[+k], ["0", "1", "2", "3", "4", "5", "6"]).filter((g) => g.entries > 0)} k={key} />
      </div>
    </>
  );
}

function Hero({ t, range, k, inR }: { t: ReturnType<typeof tally>; range: Range; k: string; inR: SigRow[] }) {
  const on = useGrow(k);
  const rate = useCountUp(t.rate == null ? 0 : t.rate * 100), pts = useCountUp(t.pts);
  const R = 54, C = 2 * Math.PI * R, streak = currentStreak(inR);
  const best = useMemo(() => { const d = groupBy(inR, (r) => etDay(r.received_at), (k) => k).filter((x) => x.wins + x.losses > 0); return { best: d.reduce((a, b) => (b.pts > (a?.pts ?? -Infinity) ? b : a), null as Group | null), worst: d.reduce((a, b) => (b.pts < (a?.pts ?? Infinity) ? b : a), null as Group | null) }; }, [inR]);
  return (
    <section className="hud animate-rise grid items-center gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-[auto_1fr]" aria-label={`Summary, ${RANGE_LABEL[range]}`}>
      <div className="relative mx-auto h-[140px] w-[140px]">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-line)" strokeWidth="10" />
          <circle cx="70" cy="70" r={R} fill="none" stroke={t.rate == null ? "var(--color-line-2)" : t.rate >= 0.5 ? "var(--color-win)" : "var(--color-loss)"} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={on ? C * (1 - (t.rate ?? 0)) : C} style={{ transition: reduced() ? "none" : "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)" }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div><div className="num text-[30px] font-semibold leading-none">{t.rate == null ? "—" : `${Math.round(rate)}%`}</div><div className="label mt-1 !text-[10px]">win rate</div></div>
        </div>
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Big label="Net points" value={`${pts > 0 ? "+" : pts < 0 ? "−" : ""}${Math.abs(Math.round(pts)).toLocaleString("en-US")}`} tone={t.pts > 0 ? "text-win" : t.pts < 0 ? "text-loss" : "text-ink-2"} />
          <Big label="Wins · losses" value={`${t.wins} · ${t.losses}`} />
          <Big label="Avg win / loss" value={t.avgWin == null && t.avgLoss == null ? "—" : `${t.avgWin == null ? "—" : "+" + Math.round(t.avgWin)} / ${t.avgLoss == null ? "—" : "−" + Math.abs(Math.round(t.avgLoss))}`} />
          <Big label="Waiting on a result" value={String(t.open)} tone={t.open ? "text-lag" : "text-ink-2"} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-3">
          <span>{RANGE_LABEL[range]} · {t.entries} entr{t.entries === 1 ? "y" : "ies"}</span>
          {streak.kind && <span>Running streak: <b className={streak.kind === "win" ? "text-win" : "text-loss"}>{streak.n} {streak.kind === "win" ? "win" : "loss"}{streak.n > 1 ? (streak.kind === "win" ? "s" : "es") : ""}</b></span>}
          {best.best && best.best.pts > 0 && <span>Best day: <b className="text-win">{dayShort(best.best.key)} {ptsText(best.best.pts)}</b></span>}
          {best.worst && best.worst.pts < 0 && <span>Toughest day: <b className="text-loss">{dayShort(best.worst.key)} {ptsText(best.worst.pts)}</b></span>}
        </div>
      </div>
    </section>
  );
}
const Big = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div><div className="label !text-[10px]">{label}</div><div className={cx("num mt-1 text-[22px] font-semibold leading-none", tone)}>{value}</div></div>
);

function PointsPerDay({ days, selected, onPick, k }: { days: ReturnType<typeof byDay>; selected: string; onPick: (d: string) => void; k: string }) {
  const on = useGrow(k);
  const W = Math.max(340, days.length * 46 + 40), H = 220, padB = 34, padT = 14, mid = padT + (H - padT - padB) / 2;
  const max = Math.max(20, ...days.map((d) => Math.abs(d.pts))), half = (H - padT - padB) / 2 - 4, bw = Math.min(46, (W - 40) / Math.max(days.length, 1) - 10);
  const x = (i: number) => 20 + ((W - 40) / Math.max(days.length, 1)) * (i + 0.5);
  return (
    <section className="hud animate-rise px-4 py-4">
      <div className="label">Points per day</div>
      {days.length === 0 ? <p className="mt-6 text-center text-sm text-ink-3">No trades in this range yet.</p> : (
        <div className="mt-2 overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: W }} role="img" aria-label="Net points for each day">
          <line x1="10" x2={W - 10} y1={mid} y2={mid} stroke="var(--color-line-2)" strokeDasharray="3 4" />
          {days.map((d, i) => {
            const h = Math.max(d.entries && d.pts === 0 ? 2 : 0, (Math.abs(d.pts) / max) * half), up = d.pts >= 0, sel = d.date === selected;
            return (
              <g key={d.date} onClick={() => onPick(d.date)} className="cursor-pointer" tabIndex={0} role="button" aria-label={`${dayLong(d.date)}: ${d.entries ? ptsText(d.pts) : "no trades"}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPick(d.date); }}>
                <rect x={x(i) - bw / 2 - 5} y={padT - 6} width={bw + 10} height={H - padT - padB + 12} fill={sel ? "var(--color-ice)" : "transparent"} opacity={sel ? 0.07 : 0} />
                <rect x={x(i) - bw / 2} y={up ? mid - h : mid} width={bw} height={h} rx="2" fill={d.entries === 0 ? "var(--color-line)" : up ? "var(--color-win)" : "var(--color-loss)"}
                  style={{ transformOrigin: `${x(i)}px ${mid}px`, transform: on ? "scaleY(1)" : "scaleY(0)", transition: reduced() ? "none" : `transform .7s cubic-bezier(.2,.8,.2,1) ${i * 55}ms` }} />
                {d.entries > 0 && <text x={x(i)} y={up ? mid - h - 6 : mid + h + 14} textAnchor="middle" fontSize="11" fontFamily="var(--font-jetbrains), monospace" fill={up ? "var(--color-win)" : "var(--color-loss)"} style={{ opacity: on ? 1 : 0, transition: reduced() ? "none" : `opacity .4s ${300 + i * 55}ms` }}>{d.pts > 0 ? "+" : d.pts < 0 ? "−" : ""}{Math.abs(Math.round(d.pts))}</text>}
                <text x={x(i)} y={H - 16} textAnchor="middle" fontSize="11" fill={sel ? "var(--color-ink)" : "var(--color-ink-3)"}>{WEEKDAY[weekdayIdx(d.date)]}</text>
                <text x={x(i)} y={H - 3} textAnchor="middle" fontSize="9.5" fill="var(--color-ink-3)">{dayShort(d.date)}</text>
              </g>
            );
          })}
        </svg></div>
      )}
    </section>
  );
}

function DayDetail({ rows, date }: { rows: SigRow[]; date: string }) {
  const t = tally(rows);
  return (
    <section className="hud animate-rise px-4 py-4">
      <div className="flex items-baseline justify-between gap-3"><div className="label">{dayLong(date)}</div><div className="text-xs text-ink-3">{t.entries ? `${t.wins}W · ${t.losses}L${t.open ? ` · ${t.open} open` : ""} · ` : ""}<b className={t.pts > 0 ? "text-win" : t.pts < 0 ? "text-loss" : ""}>{t.entries ? ptsText(t.pts) : "no trades"}</b></div></div>
      <ul className="mt-3 grid max-h-[220px] gap-1.5 overflow-auto pr-1">
        {rows.length === 0 && <li className="text-sm text-ink-3">Nothing came in that day.</li>}
        {[...rows].sort((a, b) => a.received_at.localeCompare(b.received_at)).map((r) => {
          const o = outcomeOf(r);
          return (
            <li key={r.id} className="flex items-center gap-2 text-[13px]">
              <span className="num w-[62px] shrink-0 text-ink-3">{timeET(r.received_at)}</span>
              <span className="min-w-0 flex-1 truncate">{strategyOf(r)} <span className="text-ink-3">{(r.direction ?? "").toLowerCase()} · {SESSION_LABEL[sessionOf(r)]}</span></span>
              <span className={cx("num w-[64px] shrink-0 text-right", o.kind === "win" ? "text-win" : o.kind === "loss" ? "text-loss" : "text-ink-3")}>{o.kind === "open" ? "open" : ptsText(o.pts)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Equity({ rows, k }: { rows: SigRow[]; k: string }) {
  const on = useGrow(k);
  const pts = equityCurve(rows), W = 640, H = 150, pad = 10;
  if (pts.length < 2) return null;
  const vals = [0, ...pts.map((p) => p.pts)], lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo);
  const X = (i: number) => pad + ((W - 2 * pad) * i) / (vals.length - 1), Y = (v: number) => H - pad - ((v - lo) / span) * (H - 2 * pad);
  const d = vals.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" "), up = vals[vals.length - 1] >= 0;
  const col = up ? "var(--color-win)" : "var(--color-loss)";
  return (
    <section className="hud animate-rise px-4 py-4">
      <div className="flex items-baseline justify-between"><div className="label">Running total</div><div className={cx("num text-sm", up ? "text-win" : "text-loss")}>{ptsText(vals[vals.length - 1])}</div></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Cumulative points over the range">
        <line x1={pad} x2={W - pad} y1={Y(0)} y2={Y(0)} stroke="var(--color-line-2)" strokeDasharray="3 4" />
        <path d={`${d} L${X(vals.length - 1)} ${Y(0)} L${X(0)} ${Y(0)} Z`} fill={col} opacity={on ? 0.1 : 0} style={{ transition: reduced() ? "none" : "opacity .9s .5s" }} />
        <path d={d} fill="none" stroke={col} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={on ? 0 : 1} style={{ transition: reduced() ? "none" : "stroke-dashoffset 1.4s cubic-bezier(.4,.1,.2,1)" }} />
        <circle cx={X(vals.length - 1)} cy={Y(vals[vals.length - 1])} r="4" fill={col} opacity={on ? 1 : 0} style={{ transition: reduced() ? "none" : "opacity .3s 1.3s" }} />
      </svg>
    </section>
  );
}

function Breakdown({ title, groups, k }: { title: string; groups: Group[]; k: string }) {
  const on = useGrow(k);
  const maxAbs = Math.max(1, ...groups.map((g) => Math.abs(g.pts)));
  return (
    <section className="hud animate-rise px-4 py-4">
      <div className="label">{title}</div>
      <div className="mt-3 grid gap-3">
        {groups.length === 0 && <p className="text-sm text-ink-3">Nothing to show yet.</p>}
        {groups.map((g, i) => (
          <div key={g.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 gap-y-1.5">
            <div className="flex min-w-0 items-baseline gap-2"><span className="truncate text-[13.5px]">{g.label}</span><span className="shrink-0 text-xs text-ink-3">{g.wins}W · {g.losses}L{g.open ? ` · ${g.open} open` : ""}</span></div>
            <div className="text-right"><span className="num text-[13px] text-ink-2">{pctText(g.rate)}</span> <span className={cx("num ml-2 text-[13px] font-semibold", g.pts > 0 ? "text-win" : g.pts < 0 ? "text-loss" : "text-ink-3")}>{g.pts ? ptsText(g.pts) : "0 pts"}</span></div>
            <div className="col-span-2 h-[6px] overflow-hidden bg-line" role="img" aria-label={`${g.label}: ${pctText(g.rate)} win rate, ${ptsText(g.pts)}`}>
              <div className={cx("h-full", g.pts < 0 ? "bg-loss" : "bg-win")} style={{ width: on ? `${Math.max(g.pts ? 4 : 0, (Math.abs(g.pts) / maxAbs) * 100)}%` : "0%", transition: reduced() ? "none" : `width .8s cubic-bezier(.2,.8,.2,1) ${i * 90}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── Enter results ───────────────────────────── */
const RESULTS: [string, string][] = [["target", "Target"], ["stopped", "Stopped"], ["be", "Break-even"], ["manual", "Closed manually"]];

function Results({ rows, days, onMore, onSaved }: { rows: SigRow[]; days: number; onMore: () => void; onSaved: (id: number, patch: Partial<SigRow>) => void }) {
  const [onlyOpen, setOnlyOpen] = useState(false);
  const list = onlyOpen ? rows.filter((r) => outcomeOf(r).kind === "open") : rows;
  const groups = useMemo(() => { const m = new Map<string, SigRow[]>(); for (const r of list) { const d = etDay(r.received_at); (m.get(d) ?? m.set(d, []).get(d)!).push(r); } return [...m.entries()]; }, [list]);
  return (
    <section className="hud animate-rise px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="label">Enter results</div>
        <label className="flex items-center gap-2 text-xs text-ink-3"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />Only entries without a result</label>
      </div>
      <p className="mt-1 text-xs text-ink-3">Pick the result and the points. A stop counts against your total whether you type 25 or −25.</p>
      <div className="mt-3 grid gap-4">
        {groups.length === 0 && <p className="text-sm text-ink-3">{onlyOpen ? "Every entry in this range has a result. Nice." : "No entries yet."}</p>}
        {groups.map(([day, rs]) => (
          <div key={day}>
            <div className="mb-1.5 flex items-baseline justify-between border-b border-line pb-1"><b className="text-sm">{dayLong(day)}</b><span className="text-xs text-ink-3">{rs.filter((r) => outcomeOf(r).kind === "open").length} without a result</span></div>
            <div className="grid gap-1">{rs.map((r) => <ResultRow key={r.id} r={r} onSaved={onSaved} />)}</div>
          </div>
        ))}
      </div>
      {days < 400 && <div className="mt-4"><button className="btn" onClick={onMore}>Show earlier days</button></div>}
    </section>
  );
}

function ResultRow({ r, onSaved }: { r: SigRow; onSaved: (id: number, patch: Partial<SigRow>) => void }) {
  const [res, setRes] = useState(r.result ?? "");
  const [pts, setPts] = useState(r.result_pts == null ? "" : String(r.result_pts));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const dirty = res !== (r.result ?? "") || pts !== (r.result_pts == null ? "" : String(r.result_pts));
  const save = async () => {
    setBusy(true); setMsg(null);
    try { await api.signalsSave(r.id, res || null, res ? pts : null); onSaved(r.id, { result: res || null, result_pts: res && pts !== "" ? Number(pts) : null }); setMsg({ ok: true, t: "Saved" }); setTimeout(() => setMsg(null), 1600); }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : "Couldn't save" }); }
    setBusy(false);
  };
  return (
    <div className="grid grid-cols-1 items-center gap-2 border border-line px-3 py-2 sm:grid-cols-[minmax(0,1.3fr)_auto_auto_auto]">
      <div className="min-w-0"><div className="truncate text-[14px]"><b>{strategyOf(r)}</b> {(r.direction ?? "").toLowerCase()} <span className="num text-ink-2">{r.entry_px ?? ""}</span></div><div className="text-xs text-ink-3">{timeET(r.received_at)} · {SESSION_LABEL[sessionOf(r)]}</div></div>
      <select className="field !h-9" value={res} onChange={(e) => setRes(e.target.value)} aria-label="Result"><option value="">No result yet</option>{RESULTS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
      <input className="field num !h-9 w-[92px]" type="number" step="0.25" placeholder="points" value={pts} disabled={!res} onChange={(e) => setPts(e.target.value)} aria-label="Points" />
      <div className="flex items-center gap-2"><button className={cx("btn !h-9 !px-3 text-xs", dirty && "btn-primary")} disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save"}</button>{msg && <span className={cx("text-xs", msg.ok ? "text-win" : "text-loss")} role="status">{msg.t}</span>}</div>
    </div>
  );
}
