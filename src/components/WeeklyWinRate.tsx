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
  const decided = w.wins + w.losses;
  return (
    <section className={cx("hud animate-rise px-3.5 py-3", className)} aria-label="Weekly win rate">
      <div className="flex items-center justify-between gap-3">
        <span className="label">Weekly win rate</span>
        <span className="text-[11px] text-ink-3">{w.label}</span>
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <span className={cx("text-[26px] font-semibold leading-none tabular-nums", tone(w.rate))}>{pct(w.rate)}</span>
            <span className="text-xs text-ink-2">{decided ? `${w.wins}W · ${w.losses}L${w.breakeven ? ` · ${w.breakeven} BE` : ""}` : "no results yet"}</span>
          </div>
          <div className="mt-1.5 text-xs tabular-nums text-ink-3">
            <span className={w.pts > 0 ? "text-win" : w.pts < 0 ? "text-loss" : ""}>{w.pts ? ptsText(w.pts) : "0 pts"}</span> · last week {pct(p.rate)}
          </div>
        </div>
        {days.length > 0 && (
          <div className="flex shrink-0 items-end gap-2" role="img" aria-label="Win rate by day this week">
            {days.map((d) => <DayBar key={d.date} d={d} />)}
          </div>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {canShare && <button className="btn !h-7 !px-2.5 text-[11px]" disabled={busy || !decided} onClick={share}>{busy && !setup ? "Posting…" : "Share to Discord"}</button>}
        <button className="btn btn-ghost !h-7 !px-2.5 text-[11px]" disabled={!decided} onClick={copy}>Copy text</button>
        {msg && <span className={cx("text-[11px]", msg.ok ? "text-win" : "text-loss")} role="status">{msg.text}</span>}
      </div>
      {setup && (
        <div className="mt-2.5 grid gap-2 border border-line p-2.5">
          <div className="text-xs text-ink-2">Connect a Discord channel (one time). In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.</div>
          <input className="field" inputMode="url" placeholder="https://discord.com/api/webhooks/…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Discord webhook URL" />
          <div><button className="btn !h-7 !px-2.5 text-[11px]" disabled={busy || !url.trim()} onClick={connect}>{busy ? "Connecting…" : "Connect and post"}</button></div>
        </div>
      )}
    </section>
  );
}

function DayBar({ d }: { d: DayStat }) {
  const decided = d.wins + d.losses, rate = decided ? d.wins / decided : null, idx = (new Date(d.date + "T12:00:00Z").getUTCDay() + 6) % 7;
  const future = d.date > todayYmd(), h = rate == null ? 3 : Math.max(4, Math.round(rate * 22));
  return (
    <div className="flex flex-col items-center gap-1" title={`${d.date}: ${decided ? pct(rate) : "no results"} (${d.wins}W · ${d.losses}L) ${d.pts > 0 ? "+" : d.pts < 0 ? "−" : ""}${Math.abs(Math.round(d.pts))} pts`}>
      <div className="flex h-[22px] items-end"><div className={cx("w-2 rounded-[1px]", rate == null ? "bg-line" : rate >= 0.5 ? "bg-win" : "bg-loss")} style={{ height: h }} /></div>
      <div className={cx("text-[9px] leading-none", future ? "text-ink-3/50" : "text-ink-3")}>{LETTER[idx]}</div>
    </div>
  );
}
