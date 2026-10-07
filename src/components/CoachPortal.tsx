"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { CoachDirectoryRow, DashboardData } from "@/lib/types";
import type { DirectorySort } from "@/lib/viewmodel";
import { relDays, usd } from "@/lib/format";
import { PlanPanel } from "./PlanPanel";
import { TradingPlanCard } from "./Projections";
import { PlanCard } from "./TradingPlan";
import { SchoolCard } from "./SchoolCard";
import { LocalAccounts } from "./LocalAccounts";
import { PracticeCard } from "./PracticeCard";
import { JournalTable } from "./JournalTable";
import { StatsStrip } from "./MemberDashboard";
import { FeedbackComposer, FeedbackItem } from "./Feedback";
import { Avatar, Meter, Panel, cx, statusBg } from "./ui";
import { IconAlert, IconChevron, IconSearch, IconUsers } from "./icons";

const SORTS: { v: DirectorySort; t: string }[] = [
  { v: "drawdown", t: "Highest drawdown risk" },
  { v: "recent", t: "Most recent trades" },
  { v: "consistency", t: "Failing consistency" },
];

export function CoachPortal({ initial, today }: { initial: CoachDirectoryRow[]; today: string }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<DirectorySort>("drawdown");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => api.members(q, sort).then(setRows, (e) => setError(e.message)), 250);
    return () => clearTimeout(t);
  }, [q, sort]);

  const atRisk = rows.filter((r) => r.atRisk > 0).length;
  const behind = rows.filter((r) => r.behind > 0).length;
  const incons = rows.filter((r) => r.consistencyFailures > 0).length;
  const quiet = rows.filter((r) => !r.lastTradeDate || Date.parse(today) - Date.parse(r.lastTradeDate) > 5 * 86400000).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <LocalAccounts />
      <section className="hud animate-rise grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="label flex items-center gap-2 !text-ice"><IconUsers size={13} /> Coach portal</div>
          <h1 className="mt-2 font-display text-2xl font-extrabold">Community roster</h1>
          <p className="mt-1 text-sm text-ink-3">Every member&apos;s plan and journal, read-only. Your views are logged.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
          <Count n={rows.length} l="Traders" />
          <Count n={atRisk} l="At risk" tone="text-loss" />
          <Count n={behind} l="Behind plan" tone="text-lag" />
          <Count n={incons} l="Consistency" tone="text-loss" />
          <Count n={quiet} l="Quiet 5d+" tone="text-ink-2" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <span className="sr-only">Search members</span>
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input id="coach-search" className="field !pl-9" placeholder="Search Discord name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="flex flex-wrap border border-line-2" role="radiogroup" aria-label="Sort members">
          {SORTS.map((s) => (
            <button key={s.v} role="radio" aria-checked={sort === s.v} onClick={() => setSort(s.v)}
              className={cx("relative h-[38px] px-3.5 font-hud text-[12px] transition-colors", sort === s.v ? "bg-ice/10 text-ink" : "text-ink-3 hover:text-ink-2")}>
              {s.t}
              {sort === s.v && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-ice"><span className="absolute left-0 h-full w-2 bg-signal" /></span>}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-loss">{error}</p>}

      <div className="grid gap-2">
        {rows.length === 0 && <p className="hud p-8 text-center text-ink-2">No members match “{q}”.</p>}
        {rows.map((r, i) => (
          <MemberRow key={r.trader.id} r={r} today={today} open={openId === r.trader.id} index={i}
            onToggle={() => setOpenId(openId === r.trader.id ? null : r.trader.id)} />
        ))}
      </div>
    </div>
  );
}

function Count({ n, l, tone }: { n: number; l: string; tone?: string }) {
  return <div><div className={cx("num text-2xl leading-none", tone)}>{n}</div><div className="label mt-1">{l}</div></div>;
}

function MemberRow({ r, today, open, onToggle, index }: { r: CoachDirectoryRow; today: string; open: boolean; onToggle: () => void; index: number }) {
  const riskTone = r.drawdownRisk > 0.75 ? "loss" : r.drawdownRisk > 0.5 ? "lag" : "win";
  return (
    <div className={cx("hud animate-rise", open && "!border-ice-dim")} style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
      <button onClick={onToggle} aria-expanded={open} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 text-left md:grid-cols-[auto_minmax(180px,1.3fr)_minmax(150px,1fr)_minmax(120px,0.8fr)_110px_110px_100px_auto]">
        <Avatar src={r.trader.avatarUrl} name={r.trader.name} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate">
            {r.trader.name}
            {r.trader.role !== "MEMBER" && <span className="chip !h-[18px] !text-[11px] text-ice">{r.trader.role === "ADMIN" ? "Admin" : "Coach"}</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {r.statuses.map((s, i) => <span key={i} title={`${s.label}: ${s.status.replace("_", " ").toLowerCase()}`} className={cx("h-2 w-2 rotate-45", statusBg(s.status))} />)}
            <span className="text-xs text-ink-3">{r.accounts} accts · {r.fundedAccounts} funded</span>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="mb-1.5 flex justify-between"><span className="label">Drawdown used</span><span className="num text-xs text-ink-2">{Math.round(r.drawdownRisk * 100)}%</span></div>
          <Meter value={r.drawdownRisk} tone={riskTone} segments={16} label="Drawdown used" />
        </div>
        <div className="hidden md:block">
          <div className="mb-1.5 flex justify-between gap-2"><span className="label truncate">School · {r.school ? r.school.current : "not started"}</span><span className="num text-xs text-ink-2">{Math.round((r.school?.pct ?? 0) * 100)}%</span></div>
          <div className="relative h-1.5 bg-line"><div className={cx("absolute inset-y-0 left-0", r.school?.certified ? "bg-win" : "bg-ice")} style={{ width: `${Math.round((r.school?.pct ?? 0) * 100)}%` }} /></div>
        </div>
        <Cell l="Last trade" v={relDays(r.lastTradeDate, today)} />
        <Cell l="Month P/L" v={<span className={r.monthPnl >= 0 ? "text-win" : "text-loss"}>{usd(r.monthPnl, { sign: true })}</span>} />
        <div className="hidden md:block">
          {r.consistencyFailures > 0 ? <span className="flex items-center gap-1.5 text-xs text-loss"><IconAlert size={13} /> Consistency ×{r.consistencyFailures}</span>
            : r.atRisk > 0 ? <span className="flex items-center gap-1.5 text-xs text-loss"><IconAlert size={13} /> At risk</span>
            : r.behind > 0 ? <span className="text-xs text-lag">Behind plan</span>
            : <span className="text-xs text-ink-3">On track</span>}
        </div>
        <IconChevron className={cx("text-ink-3 transition-transform", open && "rotate-90 text-ice")} />
      </button>
      {open && <TraderDetail traderId={r.trader.id} />}
    </div>
  );
}

function Cell({ l, v }: { l: string; v: React.ReactNode }) {
  return <div className="hidden md:block"><div className="label">{l}</div><div className="num mt-1 text-sm">{v}</div></div>;
}

function TraderDetail({ traderId }: { traderId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { try { setData(await api.member(traderId)); } catch (e) { setError((e as Error).message); } };
  useEffect(() => { load(); }, [traderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="border-t border-line p-4 text-sm text-loss">{error}</p>;
  if (!data) return <div className="border-t border-line p-6"><div className="h-1 w-40 overflow-hidden bg-line"><div className="h-full w-1/3 bg-ice animate-sweep" /></div></div>;

  const general = data.feedback.filter((f) => !f.journalEntryId);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-line bg-abyss/40 p-4">
      <StatsStrip data={data} />
      <PlanCard data={data} />
      {data.projection && <TradingPlanCard data={data} />}
      <SchoolCard data={data} onChanged={load} />
      <PracticeCard data={data} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(360px,5fr)_minmax(0,7fr)]">
        <div className="grid gap-4">
          <PlanPanel data={data} readOnly />
          <Panel title="Coach feedback">
            <div className="grid gap-4 p-4">
              <FeedbackComposer traderId={data.trader.id} accounts={data.accounts.map((a) => ({ id: a.id, label: a.label }))} onSent={load} />
              {general.length > 0 && <div className="grid gap-2 border-t border-line pt-3">{general.map((f) => <FeedbackItem key={f.id} f={f} />)}</div>}
            </div>
          </Panel>
        </div>
        <JournalTable data={data} readOnly onChanged={load} />
      </div>
    </div>
  );
}
