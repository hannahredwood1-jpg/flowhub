"use client";
// Trading School progress for coaches: where a member is, checkpoint/exam scores, and manual unlocks.
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { DashboardData } from "@/lib/types";
import { ErrorLine, Panel, cx } from "./ui";

export function SchoolCard({ data, onChanged }: { data: DashboardData; onChanged?: () => void }) {
  const s = data.school;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!data.readOnly) return null;
  const who = data.trader.name.split(" ")[0];
  const unlock = async (level: string, on: boolean) => {
    setBusy(level); setError(null);
    try { await api.schoolUnlock(data.trader.id, level, on); onChanged?.(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const levels = s?.levels ?? [
    { id: "beginner", name: "Beginner" }, { id: "intermediate", name: "Intermediate" }, { id: "advanced", name: "Advanced" }, { id: "exo", name: "ECHO x ORBIT" },
  ].map((l) => ({ ...l, lessons: 0, lessonsDone: 0, checkpoints: 0, checkpointsPassed: 0, exam: null, manualUnlock: false }));
  return (
    <Panel title={`Trading School · ${who}`} right={<span className="label">{s ? `Now in ${s.current}` : "Not started"}</span>}>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-2">
          {levels.map((l) => (
            <div key={l.id} className="grid grid-cols-[minmax(110px,1.2fr)_minmax(60px,2fr)_auto] items-center gap-3 text-sm">
              <span className="truncate">{l.name}</span>
              <span className="relative h-1.5 bg-line"><span className="absolute inset-y-0 left-0 bg-ice" style={{ width: `${l.lessons ? Math.round((l.lessonsDone / l.lessons) * 100) : 0}%` }} /></span>
              <span className="flex items-center gap-2">
                <span className="num text-ink-2">{l.lessons ? `${l.lessonsDone}/${l.lessons} · ✓${l.checkpointsPassed}/${l.checkpoints}` : "–"}{l.exam ? ` · exam ${l.exam.tries ? `${Math.round(l.exam.best * 100)}%` : "–"}` : ""}</span>
                {l.id !== "beginner" && (
                  <button className={cx("btn !h-7 !px-2 text-xs", l.manualUnlock ? "btn-ghost" : "btn-primary")} disabled={busy === l.id} onClick={() => unlock(l.id, !l.manualUnlock)}>
                    {busy === l.id ? "…" : l.manualUnlock ? "Re-lock" : "Unlock"}
                  </button>
                )}
              </span>
            </div>
          ))}
          <ErrorLine error={error} />
          <p className="text-xs text-ink-3">Unlock skips the exam and practice requirements for that section.</p>
        </div>
        <div>
          <div className="label mb-1.5">Recent checkpoints & exams</div>
          {s?.attempts.length ? (
            <ul className="grid gap-1.5 text-sm">
              {s.attempts.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={cx("chip !py-0", a.pass ? "text-win" : "text-loss")}>{Math.round(a.pct * 100)}%</span>
                  <span className="min-w-0 flex-1 truncate">{a.label}</span>
                  <span className="label">{new Date(a.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-3">No attempts yet.</p>}
        </div>
      </div>
    </Panel>
  );
}
