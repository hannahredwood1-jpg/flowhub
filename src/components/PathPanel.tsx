"use client";
// Coach portal: each student's Trading School learning path (what they chose to express) and a reset for a locked path.
import { useEffect, useState } from "react";
import { api, type PathRow } from "@/lib/api-client";
import { ErrorLine, Panel, cx } from "./ui";

const START: Record<string, string> = { new: "Brand new", traded: "Traded before", experienced: "Experienced", "": "Not answered" };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "none yet");

export function PathTable({ rows, busy, confirm, onReset }: { rows: PathRow[]; busy?: string | null; confirm?: string | null; onReset?: (r: PathRow) => void }) {
  return (
    <div className="grid gap-1">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-2 text-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="truncate">{r.name}</span>
              <span className="text-xs text-ink-3">{START[r.start] ?? r.start}{r.prop === "yes" ? " · used a prop firm" : ""}</span>
              <span className={cx("text-xs font-semibold", r.locked ? "text-signal" : "text-ink-3")}>{r.locked ? "Locked" : "Can still edit"}</span>
            </div>
            <div className="num mt-0.5 text-xs text-ink-2">
              Express {r.prove} · Learn {r.learn} · Earlier proof exams passed {r.proofPassed} · {r.passed}/{r.total} done
            </div>
            <div className="mt-0.5 text-xs text-ink-3">
              Path built {when(r.committedAt)}
              {r.fast > 0 && <span className="text-lag"> · {r.fast} very quick pass{r.fast === 1 ? "" : "es"}, worth a conversation</span>}
            </div>
          </div>
          {onReset && (
            <button className={cx("btn !h-7 !px-2 text-xs", confirm === r.id ? "btn-primary" : "btn-ghost")} disabled={busy === r.id} title="They rebuild their path. Proof attempts already used are never given back." onClick={() => onReset(r)}>
              {confirm === r.id ? "Confirm reset" : "Reset path"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function PathPanel() {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<{ rows: PathRow[]; unbuilt: number } | null>(null);
  const [q, setQ] = useState("");
  const [onlyFlag, setOnlyFlag] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.pathList().then(setData, (e) => setError(e.message));
  useEffect(() => { if (show && !data) load(); }, [show, data]);
  const reset = async (r: PathRow) => {
    if (confirm !== r.id) { setConfirm(r.id); return; }
    setBusy(r.id); setError(null); setConfirm(null);
    try { await api.pathReset(r.id); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const rows = (data?.rows ?? []).filter((r) => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!onlyFlag || r.fast > 0 || r.proofFailed > 0));
  return (
    <Panel title="Trading School · learning paths" right={<button className="btn btn-ghost !h-7 !px-2 text-xs" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>}>
      {show && (
        <div className="grid gap-3 p-4">
          <p className="text-xs text-ink-3">Before they start, each student says where they are. What they already know they do the express way: the three practice tasks, no lesson. Every module (express or not) is complete only when its practice tasks are passed, and there are no exams. INVERTIX and the certificate need every module complete. Paths are always editable; Reset lets a student rebuild from scratch.</p>
          <ErrorLine error={error} />
          {!data ? <p className="text-sm text-ink-3">Loading…</p> : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
                <span><b className="num text-ink">{data.rows.length}</b> built a path</span>
                {data.unbuilt > 0 && <span><b className="num text-ink">{data.unbuilt}</b> started the school before paths existed</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input className="field !h-8 min-w-[180px] flex-1 text-sm sm:max-w-xs" placeholder="Find a student" value={q} onChange={(e) => setQ(e.target.value)} />
                <label className="flex items-center gap-1 text-xs text-ink-3"><input type="checkbox" checked={onlyFlag} onChange={(e) => setOnlyFlag(e.target.checked)} />Only earlier proof exams that were missed or very quick</label>
              </div>
              <PathTable rows={rows} busy={busy} confirm={confirm} onReset={reset} />
              {!rows.length && <p className="text-sm text-ink-3">{data.rows.length ? "No students match." : "Nobody has built a path yet. Students build one the first time they open the school."}</p>}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
