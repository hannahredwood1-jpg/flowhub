"use client";
// Coach portal: is the 8:30 AM daily GEX fetch working? Shows the last saved levels and lets a coach run it once on demand.
import { useEffect, useState } from "react";
import { api, type GexLatest } from "@/lib/api-client";
import { ErrorLine, Panel, cx } from "./ui";

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET" : "never");
const n = (v: number | null | undefined) => (v ? v.toLocaleString("en-US") : "–");

export function GexPanel() {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<GexLatest | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.gexLatest().then(setData, (e) => setError(e.message));
  useEffect(() => { if (show && !data) load(); }, [show, data]);
  const run = async () => {
    setBusy(true); setError(null); setNote(null);
    try { const r = await api.gexRun(); setNote(r.message); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const cur = data?.current, h = data?.health;
  const fresh = !!cur && cur.day === data?.today;
  return (
    <Panel title="Daily GEX levels · feed" right={<button className="btn btn-ghost !h-7 !px-2 text-xs" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>}>
      {show && (
        <div className="grid gap-3 p-4">
          <p className="text-xs text-ink-3">FLOWHUB fetches the Nasdaq-100 options data and works out the levels by itself at 8:30 AM Eastern every weekday, retrying every 10 minutes until it succeeds. You do not need to do anything. Use Run now only to test.</p>
          <ErrorLine error={error} />
          {!data ? <p className="text-sm text-ink-3">Loading…</p> : (
            <div className="grid gap-1 text-sm">
              <div><span className={cx("text-xs font-semibold", fresh ? "text-win" : "text-loss")}>{cur ? (fresh ? "Today's levels are in" : `No levels yet today (latest ${cur.day})`) : "No levels saved yet"}</span></div>
              {cur && <div className="num text-xs text-ink-2">Call wall {n(cur.levels.all.callWall)} · Flip {n(cur.levels.all.flip)} · Put wall {n(cur.levels.all.putWall)} · NDX {n(cur.levels.spot)}</div>}
              {cur && <div className="text-xs text-ink-3">Feed time {cur.feedLabel ?? "unknown"} · saved {when(cur.fetchedAt)}</div>}
              {h && <div className="text-xs text-ink-3">Last try {when(h.lastTry)}{h.lastError ? <span className="text-loss"> · last error: {h.lastError}</span> : ""}</div>}
            </div>
          )}
          <div className="flex items-center gap-3"><button className="btn !h-7 !px-2 text-xs" disabled={busy} onClick={run}>{busy ? "Running…" : "Run now"}</button>{note && <span className="text-xs text-ink-2">{note}</span>}</div>
        </div>
      )}
    </Panel>
  );
}
