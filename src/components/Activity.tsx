"use client";
// Coach portal: when members log on and how long they spend in each part of FLOWHUB (dashboard, trading school modules, practice and labs).
import { useEffect, useState } from "react";
import { api, type UsageDetail, type UsageRow } from "@/lib/api-client";
import { ErrorLine, Panel, cx } from "./ui";

const AREA: Record<string, string> = { dashboard: "Dashboard", school: "Trading School", practice: "Practice & labs", vault: "The Vault" };
const mins = (m: number) => (m < 1 ? "<1 min" : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`);
const ago = (iso: string | null) => {
  if (!iso) return "Never";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return "Online now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";

export function ActivityPanel() {
  const [rows, setRows] = useState<UsageRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<UsageDetail | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => { if (show && !rows) api.usageOverview().then(setRows, (e) => setError(e.message)); }, [show, rows]);
  useEffect(() => {
    if (!open) return setDetail(null);
    setDetail(null);
    api.usageDetail(open, days).then(setDetail, (e) => setError(e.message));
  }, [open, days]);

  const by = (area: string) => (detail?.sections ?? []).filter((s) => s.area === area);
  return (
    <Panel title="Member activity · log-ins and time spent" right={<button className="btn btn-ghost !h-7 !px-2 text-xs" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>}>
      {show && (
        <div className="grid gap-3 p-4">
          <ErrorLine error={error} />
          {!rows ? <p className="text-sm text-ink-3">Loading…</p> : !rows.length ? <p className="text-sm text-ink-3">No activity yet. Time starts counting the next time someone opens FLOWHUB.</p> : (
            <div className="grid gap-1">
              <div className="label grid grid-cols-[minmax(0,1fr)_110px_90px_90px] gap-3 px-2"><span>Member</span><span>Last on</span><span>Log-ins 7d</span><span>Time 7d</span></div>
              {rows.map((r) => (
                <div key={r.id} className="border-t border-line">
                  <button className="grid w-full grid-cols-[minmax(0,1fr)_110px_90px_90px] items-center gap-3 px-2 py-2 text-left text-sm hover:bg-ice/[0.04]" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <span className="truncate">{r.name}{r.role !== "MEMBER" && <span className="ml-2 text-xs text-ink-3">{r.role.toLowerCase()}</span>}</span>
                    <span className={cx("text-xs", ago(r.lastSeen) === "Online now" ? "text-win" : "text-ink-2")}>{ago(r.lastSeen)}</span>
                    <span className="num text-xs text-ink-2">{r.sessions7}</span>
                    <span className="num text-xs text-ink-2">{mins(r.minutes7)}</span>
                  </button>
                  {open === r.id && (
                    <div className="grid gap-4 border-t border-line bg-abyss/50 p-3 lg:grid-cols-2">
                      {!detail ? <p className="text-sm text-ink-3">Loading…</p> : (
                        <>
                          <div>
                            <div className="label mb-1.5">Recent log-ins (a visit = one open tab; time counts only while the tab is active)</div>
                            {!detail.sessions.length ? <p className="text-sm text-ink-3">No visits recorded yet.</p> : detail.sessions.map((s, i) => (
                              <div key={i} className="flex justify-between gap-3 border-t border-line py-1 text-sm first:border-0"><span>{when(s.startedAt)}</span><span className="num text-xs text-ink-2">{mins(s.minutes)}</span></div>
                            ))}
                          </div>
                          <div className="grid content-start gap-3">
                            <div className="flex items-center justify-between"><span className="label">Time by section</span>
                              <select className="field !h-7 !py-0 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>
                            </div>
                            {Object.keys(AREA).map((a) => (
                              <div key={a}>
                                <div className="text-xs font-semibold text-ice">{AREA[a]} · {mins(by(a).reduce((t, s) => t + s.minutes, 0))}</div>
                                {!by(a).length ? <p className="text-xs text-ink-3">Nothing yet.</p> : by(a).map((s) => (
                                  <div key={s.section} className="flex justify-between gap-3 border-t border-line py-0.5 text-sm first:border-0"><span className="truncate">{s.section}</span><span className="num text-xs text-ink-2">{mins(s.minutes)}</span></div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
