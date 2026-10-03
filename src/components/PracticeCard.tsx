"use client";
// Practice tab results on the dashboard. Members get a nudge into Practice; coaches see where each member struggles.
import type { DashboardData } from "@/lib/types";
import type { PracticeTier } from "@/lib/practice";
import { Panel, Stat, cx } from "./ui";

const TIER: Record<PracticeTier, { label: string; cls: string }> = {
  none: { label: "Unranked", cls: "text-ink-3 border-line-2" },
  bronze: { label: "Bronze", cls: "text-[#d39a6a] border-[#6e4a2c]" },
  silver: { label: "Silver", cls: "text-[#cfd8e3] border-[#5b6573]" },
  gold: { label: "Gold", cls: "text-[#f2c14e] border-[#7a6224]" },
  elite: { label: "Elite", cls: "text-lag border-lag/50" },
};
const tone = (a: number | null) => (a == null ? "bg-line-2" : a >= 0.7 ? "bg-win" : a >= 0.55 ? "bg-[#f2c14e]" : "bg-loss");

export function PracticeCard({ data }: { data: DashboardData }) {
  const p = data.practice;
  const who = data.readOnly ? data.trader.name.split(" ")[0] : null;
  if (!p) {
    if (data.readOnly) return null;
    return (
      <div className="hud flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="chip text-signal">New · Practice</span>
        <p className="min-w-0 flex-1 text-sm text-ink-2">Hands-on NQ drills for every model: mark trades, set Daily Levels limits, replay sessions. 10 reps a day builds the streak.</p>
        <a href="/practice" className="btn btn-primary">Start practicing</a>
      </div>
    );
  }
  return (
    <Panel
      title={data.readOnly ? `Practice · where ${who} is struggling` : "Practice"}
      right={data.readOnly ? <span className="label">Last rep {p.lastRepAt ? new Date(p.lastRepAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "–"}</span> : <a href="/practice" className="btn btn-primary !h-8">Do today's reps</a>}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-2">
          {p.models.map((m) => (
            <div key={m.model} className="grid grid-cols-[minmax(110px,1.3fr)_minmax(60px,3fr)_auto_auto] items-center gap-3 text-sm">
              <span className="truncate">{m.label}</span>
              <span className="relative h-1.5 bg-line"><span className={cx("absolute inset-y-0 left-0", tone(m.accuracy))} style={{ width: `${Math.round((m.accuracy ?? 0) * 100)}%` }} /></span>
              <span className="num w-20 text-right text-ink-2">{m.accuracy == null ? "–" : `${Math.round(m.accuracy * 100)}%`} · {m.reps}</span>
              <span className={cx("border px-1.5 py-0.5 font-hud text-[8.5px] uppercase tracking-[0.14em]", TIER[m.tier].cls)}>{TIER[m.tier].label}</span>
            </div>
          ))}
        </div>
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Reps this week" value={p.repsThisWeek} />
            <Stat label="Total reps" value={p.totalReps} />
          </div>
          <div>
            <div className="label mb-1.5">{data.readOnly ? "Most common mistakes" : "Your most common mistakes"}</div>
            {p.mistakes.length ? (
              <ul className="grid gap-1.5 text-sm">
                {p.mistakes.map((m, i) => <li key={m.tag} className="flex items-center gap-2"><span className={cx("chip !py-0", i === 0 ? "text-loss" : "text-ink-3")}>{m.count}×</span>{m.label}</li>)}
              </ul>
            ) : <p className="text-sm text-ink-3">No pattern yet.</p>}
          </div>
        </div>
      </div>
    </Panel>
  );
}
