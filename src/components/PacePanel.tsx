"use client";
// Coach portal: each student's chosen Trading School pace, whether they are on it, and the reminder emails sent.
import { useEffect, useState } from "react";
import { api, type PaceRow } from "@/lib/api-client";
import { PACE_PRESETS } from "@/lib/schoolPace";
import { ErrorLine, Panel, cx } from "./ui";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "never");
const ago = (iso: string | null) => {
  if (!iso) return "no activity yet";
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
const STATUS: Record<PaceRow["status"], { label: string; tone: string }> = {
  done: { label: "Finished", tone: "text-win" },
  ahead: { label: "Ahead", tone: "text-win" },
  on: { label: "On pace", tone: "text-ice" },
  behind: { label: "Behind", tone: "text-loss" },
};
const ORDER: Record<PaceRow["status"], number> = { behind: 0, on: 1, ahead: 2, done: 3 };
const presetName = (w: number) => PACE_PRESETS.find((p) => p.perWeek === w)?.name ?? "Custom";

export function PaceTable({ rows, busy, onSet, onReset }: { rows: PaceRow[]; busy?: string | null; onSet?: (r: PaceRow, perWeek: number) => void; onReset?: (r: PaceRow) => void }) {
  return (
    <div className="grid gap-1">
      {rows.map((r) => {
        const s = STATUS[r.status];
        return (
          <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-2 text-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="truncate">{r.name}</span>
                <span className={cx("text-xs font-semibold", s.tone)}>{s.label}</span>
                <span className="text-xs text-ink-3">{presetName(r.perWeek)} · {r.perWeek} a week</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="relative h-1.5 w-40 max-w-full bg-line">
                  <div className={cx("absolute inset-y-0 left-0", r.status === "behind" ? "bg-loss" : "bg-ice")} style={{ width: `${Math.round((r.passed / r.total) * 100)}%` }} />
                  <div className="absolute -top-0.5 h-2.5 w-px bg-ink-2" style={{ left: `${Math.round((r.expected / r.total) * 100)}%` }} title="Where their pace says they should be" />
                </div>
                <span className="num text-xs text-ink-2">{r.passed}/{r.total}</span>
              </div>
              <div className="mt-0.5 text-xs text-ink-3">
                Last in the school {ago(r.lastActive)}{r.finish ? ` · on track to finish ${day(r.finish)}` : ""}
                {" · "}
                {!r.hasEmail ? "no email on file" : !r.emails ? "reminders off" : r.nudges ? `${r.nudges} reminder${r.nudges === 1 ? "" : "s"} sent, last ${day(r.lastNudgeAt)}` : "no reminders sent yet"}
              </div>
            </div>
            {onSet && (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {PACE_PRESETS.map((p) => (
                  <button key={p.id} className={cx("btn !h-7 !px-2 text-xs", p.perWeek === r.perWeek ? "btn-primary" : "btn-ghost")} disabled={busy === r.id} onClick={() => onSet(r, p.perWeek)}>{p.name}</button>
                ))}
                <button className="btn btn-ghost !h-7 !px-2 text-xs" disabled={busy === r.id} title="They see the welcome screen again next visit" onClick={() => onReset?.(r)}>Reset</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PacePanel() {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<{ rows: PaceRow[]; unset: number } | null>(null);
  const [q, setQ] = useState("");
  const [onlyBehind, setOnlyBehind] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.paceList().then(setData, (e) => setError(e.message));
  useEffect(() => { if (show && !data) load(); }, [show, data]);
  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id); setError(null);
    try { await fn(); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const rows = (data?.rows ?? []).filter((r) => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!onlyBehind || r.status === "behind")).sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const behind = (data?.rows ?? []).filter((r) => r.status === "behind").length;

  return (
    <Panel title="Trading School · pace" right={<button className="btn btn-ghost !h-7 !px-2 text-xs" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>}>
      {show && (
        <div className="grid gap-3 p-4">
          <p className="text-xs text-ink-3">Students pick their own pace the first time they open the school. The line on each bar is where that pace says they should be today. Reminder emails go out only to students who are behind or gone quiet, at most one every few days, and stop after three with no reply.</p>
          <ErrorLine error={error} />
          {!data ? <p className="text-sm text-ink-3">Loading…</p> : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
                <span><b className="num text-ink">{data.rows.length}</b> set a pace</span>
                <span><b className={cx("num", behind ? "text-loss" : "text-ink")}>{behind}</b> behind</span>
                {data.unset > 0 && <span><b className="num text-ink">{data.unset}</b> started the school without a pace</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input className="field !h-8 min-w-[180px] flex-1 text-sm sm:max-w-xs" placeholder="Find a student" value={q} onChange={(e) => setQ(e.target.value)} />
                <label className="flex items-center gap-1 text-xs text-ink-3"><input type="checkbox" checked={onlyBehind} onChange={(e) => setOnlyBehind(e.target.checked)} />Only behind</label>
              </div>
              <PaceTable rows={rows} busy={busy} onSet={(r, w) => act(r.id, () => api.paceSet(r.id, { perWeek: w }))} onReset={(r) => act(r.id, () => api.paceSet(r.id, { reset: true }))} />
              {!rows.length && <p className="text-sm text-ink-3">{data.rows.length ? "No students match." : "Nobody has set a pace yet. They are asked the first time they open the school."}</p>}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
