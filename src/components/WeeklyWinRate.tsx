"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { pct } from "@/lib/format";
import { shareText, type WeekWinRate, type WeeklyWinRate } from "@/lib/weeklyWinRate";
import { cx } from "./ui";

const tone = (r: number | null) => (r == null ? "text-ink-3" : r >= 0.5 ? "text-win" : "text-loss");

export function WeeklyWinRateCard({ weekly, canShare, name, className = "" }: { weekly: WeeklyWinRate; canShare: boolean; name: string; className?: string }) {
  const { current: w, previous: p, history } = weekly;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true); setMsg(null);
    try { const r = await api.shareWeeklyWinRate(); setMsg({ ok: true, text: r.message }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't post" }); }
    setBusy(false);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText(w, name)); setMsg({ ok: true, text: "Copied. Paste it in Discord." }); }
    catch { setMsg({ ok: false, text: "Couldn't copy. Select the text and copy it." }); }
  };

  const bars = [...history].reverse();
  return (
    <section className={cx("hud animate-rise px-4 py-4", className)} aria-label="Weekly win rate">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label">Weekly win rate</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className={cx("text-4xl font-semibold tabular-nums", tone(w.rate))}>{pct(w.rate)}</span>
            <span className="text-sm text-ink-2">{w.wins + w.losses ? `${w.wins}W · ${w.losses}L${w.breakeven ? ` (${w.breakeven} BE)` : ""}` : "no results entered yet this week"}{w.pending ? ` · ${w.pending} still open` : ""}</span>
          </div>
          <div className="mt-1 text-xs text-ink-3">{w.label} · last week {pct(p.rate)}{p.wins + p.losses ? ` (${p.wins}W · ${p.losses}L)` : ""}</div>
        </div>
        <div className="flex items-end gap-1" aria-hidden>
          {bars.map((b) => <Bar key={b.weekStart} b={b} />)}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canShare && <button className="btn btn-primary" disabled={busy || !(w.wins + w.losses)} onClick={share}>{busy ? "Posting…" : "Share to Discord"}</button>}
        <button className="btn" disabled={!(w.wins + w.losses)} onClick={copy}>Copy text</button>
        {msg && <span className={cx("text-xs", msg.ok ? "text-win" : "text-loss")} role="status">{msg.text}</span>}
      </div>
    </section>
  );
}

function Bar({ b }: { b: WeekWinRate }) {
  const h = b.rate == null ? 4 : Math.max(4, Math.round(b.rate * 40));
  return <div title={`${b.label}: ${pct(b.rate)} (${b.wins}W · ${b.losses}L)`} className={cx("w-3 rounded-sm", b.rate == null ? "bg-line" : b.rate >= 0.5 ? "bg-win" : "bg-loss")} style={{ height: h }} />;
}
