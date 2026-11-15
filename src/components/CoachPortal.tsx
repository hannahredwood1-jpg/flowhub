"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { CoachDirectoryRow, DashboardData } from "@/lib/types";
import type { DirectorySort } from "@/lib/viewmodel";
import { relDays } from "@/lib/format";
import { PlanPanel } from "./PlanPanel";
import { TradingPlanCard } from "./Projections";
import { PlanCard } from "./TradingPlan";
import { SchoolCard } from "./SchoolCard";
import { LocalAccounts } from "./LocalAccounts";
import { SignalsPanel } from "./SignalsPanel";
import { ActivityPanel } from "./Activity";
import { VaultPanel } from "./VaultPanel";
import { PacePanel } from "./PacePanel";
import { GexPanel } from "./GexPanel";
import { PathPanel } from "./PathPanel";
import { PracticeCard } from "./PracticeCard";
import { JournalTable } from "./JournalTable";
import { StatsStrip } from "./MemberDashboard";
import { FeedbackComposer, FeedbackItem } from "./Feedback";
import { Avatar, Panel, cx } from "./ui";
import { IconAlert, IconChevron, IconSearch } from "./icons";

const SORTS: { v: DirectorySort; t: string }[] = [
  { v: "drawdown", t: "Highest drawdown risk" },
  { v: "recent", t: "Most recent trades" },
  { v: "consistency", t: "Failing consistency" },
];
type Tab = "members" | "activity" | "tools" | "signals";
type Filter = "all" | "attention" | "behind" | "finished" | "notstarted" | "quiet";
const DAY = 86400000;
const ago = (iso: string | null | undefined, now: number) => {
  if (!iso) return "never";
  const d = Math.floor((now - Date.parse(iso)) / DAY);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
/** Where a member is on the five-course path: the first course not yet finished. */
const nowOn = (r: CoachDirectoryRow) => {
  const p = r.path ?? [];
  const c = p.find((x) => x.passed < x.total);
  if (!p.length) return { text: "Not started", done: false, started: false };
  const started = p.some((x) => x.passed > 0);
  if (!c) return { text: "All five courses complete", done: true, started: true };
  return { text: `${c.name} · ${started || c.passed > 0 ? `next: ${c.next}` : "not started"}`, done: false, started };
};
const flags = (r: CoachDirectoryRow, now: number) => {
  const n = nowOn(r);
  const quiet = !r.lastActive || now - Date.parse(r.lastActive) > 7 * DAY;
  return {
    quiet, finished: n.done, notStarted: !n.started,
    attention: r.atRisk > 0 || r.consistencyFailures > 0 || r.behind > 0 || (n.started && !n.done && quiet),
  };
};

export function CoachPortal({ initial, today, isAdmin = false }: { initial: CoachDirectoryRow[]; today: string; isAdmin?: boolean }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<DirectorySort>("drawdown");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const [tab, setTab] = useState<Tab>(() => (isAdmin && typeof location !== "undefined" && location.hash === "#coach-signals" ? "signals" : "members"));
  const show = (v: Tab) => { setTab(v); try { history.replaceState(null, "", v === "signals" ? "#coach-signals" : "#coach"); } catch { /* ignore */ } };
  const now = Date.parse(today + "T23:59:59Z") || Date.now();

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => api.members(q, sort).then(setRows, (e) => setError(e.message)), 250);
    return () => clearTimeout(t);
  }, [q, sort]);

  const fl = rows.map((r) => ({ r, f: flags(r, now) }));
  const counts = {
    all: rows.length,
    attention: fl.filter((x) => x.f.attention).length,
    behind: rows.filter((r) => r.behind > 0).length,
    finished: fl.filter((x) => x.f.finished).length,
    notstarted: fl.filter((x) => x.f.notStarted).length,
    quiet: fl.filter((x) => x.f.quiet).length,
  };
  const activeWeek = rows.filter((r) => r.lastActive && now - Date.parse(r.lastActive) <= 7 * DAY).length;
  const shown = fl.filter(({ r, f }) => filter === "all" || (filter === "attention" && f.attention) || (filter === "behind" && r.behind > 0) || (filter === "finished" && f.finished) || (filter === "notstarted" && f.notStarted) || (filter === "quiet" && f.quiet)).map((x) => x.r);
  const TABS: [Tab, string][] = [["members", "Members"], ["activity", "Activity and pace"], ["tools", "Access and tools"], ...(isAdmin ? ([["signals", "Trade results"]] as [Tab, string][]) : [])];
  const FILTERS: [Filter, string][] = [["all", "All"], ["attention", "Needs attention"], ["behind", "Behind plan"], ["quiet", "Quiet 7+ days"], ["notstarted", "Not started"], ["finished", "Finished everything"]];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Coach portal</h1>
        <p className="mt-1 text-[14.5px] text-ink-2">Every member&apos;s progress through the school, their plan and their journal. Read-only, and your views are logged.</p>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Coach portal">
        {TABS.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => show(k)} className={cx("relative -mb-px h-10 px-4 text-[14px] font-medium transition-colors", tab === k ? "text-ink" : "text-ink-3 hover:text-ink-2")}>
            {t}{tab === k && <span className="absolute inset-x-3 bottom-0 h-[2px] bg-signal" />}
          </button>
        ))}
      </div>

      {tab === "signals" && isAdmin && <SignalsPanel />}
      {tab === "activity" && <><ActivityPanel /><PacePanel /><PathPanel /></>}
      {tab === "tools" && <><VaultPanel isAdmin={isAdmin} /><GexPanel /><LocalAccounts /></>}

      {tab === "members" && <>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile n={rows.length} l="Members" />
          <Tile n={activeWeek} l="Active in the last 7 days" />
          <Tile n={counts.attention} l="Need attention" tone={counts.attention ? "text-loss" : undefined} />
          <Tile n={counts.notstarted} l="Not started the school" />
          <Tile n={counts.finished} l="Finished all five courses" tone="text-win" />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <span className="sr-only">Search members</span>
            <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input id="coach-search" className="field !pl-9" placeholder="Search by Discord name" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-3">Sort by
            <select className="field !h-[38px] !w-auto" value={sort} onChange={(e) => setSort(e.target.value as DirectorySort)}>
              {SORTS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter members">
          {FILTERS.map(([k, t]) => (
            <button key={k} role="radio" aria-checked={filter === k} onClick={() => setFilter(k)}
              className={cx("h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors", filter === k ? "border-ink bg-ink text-void" : "border-line-2 text-ink-2 hover:border-ink-3")}>
              {t} <span className={filter === k ? "opacity-70" : "text-ink-3"}>{counts[k]}</span>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-loss">{error}</p>}

        <div className="grid gap-2.5">
          {shown.length === 0 && <p className="hud p-8 text-center text-ink-2">{q ? `No members match “${q}”.` : "No members in this group."}</p>}
          {shown.map((r) => (
            <MemberRow key={r.trader.id} r={r} now={now} today={today} open={openId === r.trader.id}
              onToggle={() => setOpenId(openId === r.trader.id ? null : r.trader.id)} />
          ))}
        </div>
      </>}
    </div>
  );
}

function Tile({ n, l, tone }: { n: number; l: string; tone?: string }) {
  return <div className="hud px-4 py-3"><div className={cx("text-[28px] font-semibold leading-none tracking-[-0.02em]", tone)}>{n}</div><div className="mt-1.5 text-[12.5px] text-ink-3">{l}</div></div>;
}

/** Five segments, one per course, each filled by how many of its lessons are passed. */
function PathBar({ path }: { path: NonNullable<CoachDirectoryRow["path"]> }) {
  return (
    <div className="grid grid-cols-5 gap-1.5" role="img" aria-label={path.map((p) => `${p.name} ${p.passed} of ${p.total}`).join(", ")}>
      {path.map((p) => {
        const pct = p.total ? p.passed / p.total : 0;
        return (
          <div key={p.id} title={`${p.name}: ${p.passed} of ${p.total} lessons`}>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel-2 ring-1 ring-inset ring-line"><div className={cx("h-full rounded-full", pct >= 1 ? "bg-win" : "bg-ink")} style={{ width: `${Math.round(pct * 100)}%` }} /></div>
            <div className="mt-1 truncate text-[10.5px] text-ink-3">{p.name}</div>
          </div>
        );
      })}
    </div>
  );
}

function MemberRow({ r, now, today, open, onToggle }: { r: CoachDirectoryRow; now: number; today: string; open: boolean; onToggle: () => void }) {
  const n = nowOn(r), f = flags(r, now);
  const lessons = (r.path ?? []).reduce((a, p) => a + p.passed, 0), total = (r.path ?? []).reduce((a, p) => a + p.total, 0);
  const tag = r.consistencyFailures > 0 ? { t: `Consistency x${r.consistencyFailures}`, c: "text-loss" } : r.atRisk > 0 ? { t: "Account at risk", c: "text-loss" } : r.behind > 0 ? { t: "Behind plan", c: "text-lag" }
    : f.attention ? { t: "Gone quiet", c: "text-loss" } : n.done ? { t: "Finished", c: "text-win" } : { t: "On track", c: "text-ink-3" };
  return (
    <div className={cx("hud", open && "!border-ink-3")}>
      <button onClick={onToggle} aria-expanded={open} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 text-left md:grid-cols-[auto_minmax(170px,1fr)_minmax(280px,1.6fr)_120px_120px_130px_auto]">
        <Avatar src={r.trader.avatarUrl} name={r.trader.name} size={38} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate font-medium">
            {r.trader.name}
            {r.trader.role !== "MEMBER" && <span className="chip !h-[18px] !text-[11px] text-ice">{r.trader.role === "ADMIN" ? "Admin" : "Coach"}</span>}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-ink-3">{n.text}</div>
        </div>
        <div className="col-span-3 col-start-1 row-start-2 md:col-span-1 md:col-start-auto md:row-start-auto">
          {r.path ? <PathBar path={r.path} /> : <div className="text-[12.5px] text-ink-3">No progress yet</div>}
          {r.path && <div className="mt-1 hidden text-[11.5px] text-ink-3 md:block">{lessons} of {total} lessons passed</div>}
        </div>
        <Cell l="Last active" v={ago(r.lastActive, now)} />
        <Cell l="Last trade" v={relDays(r.lastTradeDate, today)} />
        <div className="hidden md:block"><div className="text-[11.5px] text-ink-3">Status</div><div className={cx("mt-0.5 flex items-center gap-1.5 text-[13px] font-medium", tag.c)}>{(r.atRisk > 0 || r.consistencyFailures > 0) && <IconAlert size={13} />}{tag.t}</div></div>
        <IconChevron className={cx("text-ink-3 transition-transform", open && "rotate-90 text-ink")} />
      </button>
      {open && <TraderDetail traderId={r.trader.id} path={r.path} />}
    </div>
  );
}

function Cell({ l, v }: { l: string; v: React.ReactNode }) {
  return <div className="hidden md:block"><div className="text-[11.5px] text-ink-3">{l}</div><div className="mt-0.5 text-[13px]">{v}</div></div>;
}

function TraderDetail({ traderId, path }: { traderId: string; path?: CoachDirectoryRow["path"] }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { try { setData(await api.member(traderId)); } catch (e) { setError((e as Error).message); } };
  useEffect(() => { load(); }, [traderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="border-t border-line p-4 text-sm text-loss">{error}</p>;
  if (!data) return <div className="border-t border-line p-6 text-sm text-ink-3">Loading…</div>;

  const general = data.feedback.filter((f) => !f.journalEntryId);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-line bg-abyss/40 p-4">
      {path && (
        <Panel title="Course progress">
          <div className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            {path.map((p) => (
              <div key={p.id}>
                <div className="flex items-baseline justify-between gap-2"><span className="text-[13.5px] font-medium">{p.name}</span><span className="text-[12px] text-ink-3">{p.passed} of {p.total}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel-2 ring-1 ring-inset ring-line"><div className={cx("h-full rounded-full", p.passed >= p.total ? "bg-win" : "bg-ink")} style={{ width: `${p.total ? Math.round((p.passed / p.total) * 100) : 0}%` }} /></div>
                <div className="mt-1 truncate text-[12px] text-ink-3">{p.passed >= p.total ? "Complete" : p.passed === 0 ? "Not started" : `Next: ${p.next}`}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
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
