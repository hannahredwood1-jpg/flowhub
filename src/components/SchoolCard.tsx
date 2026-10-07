"use client";
// Trading School progress for coaches: where a member is, exam scores, and manual unlocks.
import { useState } from "react";
import { api } from "@/lib/api-client";
import { SCHOOL_MODULES } from "@/lib/school";
import type { DashboardData } from "@/lib/types";
import { ErrorLine, Panel, cx } from "./ui";

export function SchoolCard({ data, onChanged }: { data: DashboardData; onChanged?: () => void }) {
  const s = data.school;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!data.readOnly) return null;
  const who = data.trader.name.split(" ")[0];
  const unlock = async (id: string, on: boolean) => {
    setBusy(id); setError(null);
    try { await api.schoolUnlock(data.trader.id, id, on); onChanged?.(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const modules = s?.modules ?? SCHOOL_MODULES.map((m) => ({ ...m, stepsDone: 0, passed: false, best: 0, tries: 0, attempt: 1, manualUnlock: false }));
  return (
    <Panel title={`Trading School · ${who}`} right={<span className="label">{s ? `${s.passed} of ${s.total} modules passed · ${s.current}` : "Not started"}</span>}>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-1.5">
          {modules.map((m, i) => {
            const locked = i > 0 && !modules[i - 1].passed && !m.manualUnlock && !m.passed;
            return (
              <div key={m.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                <span className="num text-ink-3">{String(m.n).padStart(2, "0")}</span>
                <span className={cx("truncate", locked && "text-ink-3")}>{m.title}</span>
                <span className="flex items-center gap-2">
                  <span className={cx("chip !py-0", m.passed ? "text-win" : m.stepsDone ? "text-signal" : "text-ink-3")}>
                    {m.passed ? `Passed · ${m.best}%` : locked ? "Locked" : `${m.stepsDone}/4 steps${m.attempt > 1 ? ` · attempt ${m.attempt}` : ""}`}
                  </span>
                  {!m.passed && (locked || m.manualUnlock) && (
                    <button className={cx("btn !h-7 !px-2 text-xs", m.manualUnlock ? "btn-ghost" : "btn-primary")} disabled={busy === m.id} onClick={() => unlock(m.id, !m.manualUnlock)}>
                      {busy === m.id ? "…" : m.manualUnlock ? "Re-lock" : "Unlock"}
                    </button>
                  )}
                </span>
              </div>
            );
          })}
          <ErrorLine error={error} />
          <p className="text-xs text-ink-3">Unlock opens a module without requiring the previous exam.</p>
        </div>
        <div>
          <div className="label mb-1.5">Recent exams</div>
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
          ) : <p className="text-sm text-ink-3">No exam attempts yet.</p>}
        </div>
      </div>
    </Panel>
  );
}
