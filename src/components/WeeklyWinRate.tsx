"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { pct } from "@/lib/format";
import { ptsText, shareText, type DayStat, type WeeklyWinRate } from "@/lib/weeklyWinRate";
import { cx } from "./ui";

const tone = (r: number | null) => (r == null ? "text-ink-3" : r >= 0.5 ? "text-win" : "text-loss");
const LETTER = ["M", "T", "W", "T", "F", "S", "S"];
const todayYmd = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

export function WeeklyWinRateCard({ weekly, canShare, name, className = "" }: { weekly: WeeklyWinRate; canShare: boolean; name: string; className?: string }) {
  const { current: w, previous: p } = weekly;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(false);
  const [url, setUrl] = useState("");

  const share = async () => {
    setBusy(true); setMsg(null);
    try { const r = await api.shareWeeklyWinRate(); setMsg({ ok: true, text: r.message }); setSetup(false); }
    catch (e) {
      const m = e instanceof Error ? e.message : "Couldn't post";
      if (m === "NOT_CONNECTED") setSetup(true); else setMsg({ ok: false, text: m });
    }
    setBusy(false);
  };
  const connect = async () => {
    setBusy(true); setMsg(null);
    try { await api.saveWinrateWebhook(url.trim()); setUrl(""); await share(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save" }); setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText(w, name)); setMsg({ ok: true, text: "Copied. Paste it in Discord." }); }
    catch { setMsg({ ok: false, text: "Couldn't copy. Select the text and copy it." }); }
  };

  const days = (w.days ?? []).filter((d, i) => i < 5 || d.signals > 0);
  return (
    <section className={cx("hud animate-rise px-4 py-4", className)} aria-label="Weekly win rate">
      <div className="label">Weekly win rate</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={cx("text-4xl font-semibold tabular-nums", tone(w.rate))}>{pct(w.rate)}</span>
        <span className="text-sm text-ink-2">{w.wins + w.losses ? `${w.wins}W · ${w.losses}L${w.breakeven ? ` (${w.breakeven} BE)` : ""}` : "no results entered yet this week"}</span>
      </div>
      <div className="mt-2 text-lg font-semibold tabular-nums text-ink">{w.pts ? <span className={w.pts > 0 ? "text-win" : "text-loss"}>{ptsText(w.pts)}</span> : <span className="text-ink-3">0 pts</span>} <span className="text-sm font-normal text-ink-3">this week</span></div>
      <div className="mt-1 text-xs text-ink-3">{w.label} · last week {pct(p.rate)}{p.wins + p.losses ? ` (${p.wins}W · ${p.losses}L)` : ""}</div>

      {days.length > 0 && (
        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} role="img" aria-label="Win rate by day this week">
          {days.map((d) => <DayBar key={d.date} d={d} />)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canShare && <button className="btn btn-primary" disabled={busy || !(w.wins + w.losses)} onClick={share}>{busy && !setup ? "Posting…" : "Share to Discord"}</button>}
        <button className="btn" disabled={!(w.wins + w.losses)} onClick={copy}>Copy text</button>
        {msg && <span className={cx("text-xs", msg.ok ? "text-win" : "text-loss")} role="status">{msg.text}</span>}
      </div>
      {setup && (
        <div className="mt-3 grid gap-2 border border-line p-3">
          <div className="text-sm text-ink">Connect a Discord channel (one time)</div>
          <div className="text-xs text-ink-3">In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy Webhook URL. Paste it here.</div>
          <input className="field" inputMode="url" placeholder="https://discord.com/api/webhooks/…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Discord webhook URL" />
          <div><button className="btn btn-primary" disabled={busy || !url.trim()} onClick={connect}>{busy ? "Connecting…" : "Connect and post"}</button></div>
        </div>
      )}
    </section>
  );
}

function DayBar({ d }: { d: DayStat }) {
  const decided = d.wins + d.losses, rate = decided ? d.wins / decided : null, idx = (new Date(d.date + "T12:00:00Z").getUTCDay() + 6) % 7;
  const future = d.date > todayYmd(), h = rate == null ? 4 : Math.max(6, Math.round(rate * 44));
  return (
    <div className="flex min-w-0 flex-col items-center gap-1" title={`${d.date}: ${decided ? pct(rate) : "no results"} (${d.wins}W · ${d.losses}L)`}>
      <div className="flex h-[44px] items-end"><div className={cx("w-5 rounded-sm sm:w-6", rate == null ? "bg-line" : rate >= 0.5 ? "bg-win" : "bg-loss")} style={{ height: h }} /></div>
      <div className={cx("text-[11px]", future ? "text-ink-3/50" : "text-ink-2")}>{LETTER[idx]}</div>
      <div className={cx("text-[10px] tabular-nums", d.pts > 0 ? "text-win" : d.pts < 0 ? "text-loss" : "text-ink-3")}>{decided || d.pts ? (d.pts > 0 ? "+" : d.pts < 0 ? "−" : "") + Math.abs(Math.round(d.pts)) : "–"}</div>
    </div>
  );
}
