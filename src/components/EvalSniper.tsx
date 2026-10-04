"use client";
// EVAL SNIPER: how the indicator works + a calculator for the contracts needed to pass an eval.
import { useMemo, useState } from "react";
import type { CatalogFirm, DashboardData } from "@/lib/types";
import { SNIPER_DEFAULTS, minWinningDays, recommended, sniperOptions } from "@/lib/evalSniper";
import { usd } from "@/lib/format";
import { Field, Panel, Stat, cx } from "./ui";
import { IconTarget } from "./icons";

function Diagram({ pad, tp, sl }: { pad: number; tp: number; sl: number }) {
  // vertical price ladder: current price in the middle, pads above/below, TP/SL off each pad
  const span = pad + tp + 6, Y = (p: number) => 150 - (p / span) * 130;
  const row = (p: number, label: string, col: string, dash = "4 4") => (
    <g key={label}><line x1="40" x2="560" y1={Y(p)} y2={Y(p)} stroke={col} strokeWidth="1.6" strokeDasharray={dash} /><text x="566" y={Y(p) + 4} fill={col} fontSize="11" fontFamily="JetBrains Mono, monospace">{label}</text></g>
  );
  return (
    <svg viewBox="0 0 660 300" className="w-full max-w-[720px]" role="img" aria-label="EVAL SNIPER levels">
      {row(pad + tp, `BUY TP  +${tp}`, "var(--color-win)")}
      {row(pad, `BUY PAD  +${pad}`, "var(--color-win)", "2 3")}
      {row(pad - sl, `BUY SL  −${sl}`, "var(--color-loss)")}
      {row(0, "CURRENT PRICE", "var(--color-ice)", "")}
      {row(-(pad - sl), `SELL SL  +${sl}`, "var(--color-loss)")}
      {row(-pad, `SELL PAD  −${pad}`, "var(--color-signal)", "2 3")}
      {row(-(pad + tp), `SELL TP  −${tp}`, "var(--color-signal)")}
      <path d={`M80 ${Y(0)} C 140 ${Y(4)}, 170 ${Y(-6)}, 220 ${Y(pad * 0.6)} S 300 ${Y(pad + 4)}, 340 ${Y(pad + tp * 0.5)} S 420 ${Y(pad + tp + 1)}, 470 ${Y(pad + tp)}`} fill="none" stroke="var(--color-ink-2)" strokeWidth="2" className="sniper-path" />
      <circle cx="275" cy={Y(pad)} r="5" fill="none" stroke="var(--color-win)" strokeWidth="2" />
      <text x="282" y={Y(pad) + 18} fill="var(--color-win)" fontSize="10" fontFamily="JetBrains Mono, monospace">filled</text>
    </svg>
  );
}

// Firm rules store consistency as a percent (50 = 50%); the sizing math wants a fraction.
const pctOf = (v: number | null) => (v == null ? null : v > 1 ? v / 100 : v);

export function EvalSniperPage({ data, catalog }: { data: DashboardData; catalog: CatalogFirm[] }) {
  const evals = data.accounts.filter((a) => a.rules.profitTarget);
  const [acctId, setAcctId] = useState<string>(evals[0]?.id ?? (catalog.length ? "catalog" : "manual"));
  const acct = evals.find((a) => a.id === acctId);
  const [firm, setFirm] = useState(catalog[0]?.firm ?? "");
  const plans = catalog.find((f) => f.firm === firm)?.plans ?? [];
  const [plan, setPlan] = useState(plans[0]?.plan ?? "");
  const sizes = (plans.find((p) => p.plan === plan) ?? plans[0])?.sizes.filter((z) => z.profitTarget) ?? [];
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? "");
  const size = sizes.find((z) => z.id === sizeId) ?? sizes[0];
  const [m, setM] = useState({ remaining: 3000, room: 2000, dll: "", maxMinis: 5, maxMicros: 50, consistency: "50" });
  const [s, setS] = useState({ ...SNIPER_DEFAULTS });
  const input = acctId === "catalog" && size
    ? { remaining: size.profitTarget ?? 0, drawdownRoom: size.maxLoss, dailyLossLimit: size.dailyLossLimit, maxMinis: size.maxMinis, maxMicros: size.maxMicros, consistencyPct: pctOf(size.consistencyPct) }
    : acct
    ? { remaining: Math.max(0, (acct.rules.profitTarget ?? 0) - acct.pace.profit), drawdownRoom: acct.pace.drawdownRoom, dailyLossLimit: acct.dailyLossLimitOverride ?? acct.rules.dailyLossLimit, maxMinis: acct.rules.maxMinis, maxMicros: acct.rules.maxMicros, consistencyPct: pctOf(acct.rules.consistencyPct) }
    : { remaining: +m.remaining, drawdownRoom: +m.room, dailyLossLimit: m.dll === "" ? null : +m.dll, maxMinis: +m.maxMinis, maxMicros: +m.maxMicros, consistencyPct: m.consistency === "" ? null : +m.consistency / 100 };
  const opts = useMemo(() => sniperOptions({ ...input, tp: s.tp, sl: s.sl }), [JSON.stringify(input), s.tp, s.sl]); // eslint-disable-line react-hooks/exhaustive-deps
  const rec = recommended(opts);
  const days = minWinningDays(input.consistencyPct);
  const numIn = (id: string, label: string, v: number | string, on: (v: string) => void, hint?: string) => (
    <Field label={label} htmlFor={id} hint={hint}><input id={id} type="number" min={0} className="field num" value={v} onChange={(e) => on(e.target.value)} /></Field>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <header className="hud animate-rise px-4 py-4">
        <div className="label flex items-center gap-2 !text-ice"><IconTarget size={13} /> Eval pass indicator</div>
        <h1 className="mt-1 font-display text-[clamp(22px,3vw,30px)] font-black uppercase leading-none">EVAL SNIPER</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">Built to pass evaluations fast during <b className="text-ink">red-folder news events</b>. It doesn’t predict direction: it sets a trap on both sides of price and lets the news spike pick the side. Run it on the <b className="text-ink">1-minute chart</b>, and size it so one or two clean wins hit your profit target without one loss ending the account.</p>
      </header>

      <Panel title="How it works">
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
          <Diagram pad={s.pad} tp={s.tp} sl={s.sl} />
          <ol className="grid content-start gap-2 text-sm text-ink-2">
            <li><b className="text-ink">1 · 1-minute chart, red-folder news.</b> Only use it on the <b className="text-ink">1m</b> chart, and only into a red-folder release (CPI, NFP, FOMC…). The blue line follows current price.</li>
            <li><b className="text-ink">2 · Two pads.</b> A <span className="text-win">Buy Pad</span> {s.pad} pts above and a <span className="text-signal">Sell Pad</span> {s.pad} pts below. Place a <b className="text-ink">buy stop</b> on the Buy Pad and a <b className="text-ink">sell stop</b> on the Sell Pad <b className="text-signal">seconds before the news drops</b>, not earlier: the pads move with price, so set them off the last 1m price.</li>
            <li><b className="text-ink">3 · The release picks a side.</b> The news spike runs into one pad and fills it. Cancel the other order straight away.</li>
            <li><b className="text-ink">4 · Bracket off the pad.</b> Take profit {s.tp} pts past the pad, stop loss {s.sl} pts back through it. The pad distance keeps you out of the chop around current price.</li>
            <li><b className="text-ink">5 · Size to pass.</b> Use the calculator below so a win (or two) reaches the target and a loss doesn’t touch the drawdown.</li>
          </ol>
        </div>
      </Panel>

      <Panel title="Contracts to pass">
        <div className="grid gap-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Account" htmlFor="sn-acct" className="sm:col-span-2">
              <select id="sn-acct" className="field" value={acctId} onChange={(e) => setAcctId(e.target.value)}>
                {evals.length > 0 && <optgroup label="My accounts">{evals.map((a) => <option key={a.id} value={a.id}>{a.label} · {usd(Math.max(0, (a.rules.profitTarget ?? 0) - a.pace.profit))} to go</option>)}</optgroup>}
                <option value="catalog">Any firm account (new eval)…</option>
                <option value="manual">Enter numbers myself</option>
              </select>
            </Field>
            {numIn("sn-tp", "Take profit (pts)", s.tp, (v) => setS({ ...s, tp: +v }))}
            {numIn("sn-sl", "Stop loss (pts)", s.sl, (v) => setS({ ...s, sl: +v }))}
          </div>
          {acctId === "catalog" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Firm" htmlFor="sn-firm"><select id="sn-firm" className="field" value={firm} onChange={(e) => { const f = catalog.find((x) => x.firm === e.target.value); setFirm(e.target.value); setPlan(f?.plans[0]?.plan ?? ""); setSizeId(f?.plans[0]?.sizes.find((z) => z.profitTarget)?.id ?? ""); }}>{catalog.map((f) => <option key={f.firm}>{f.firm}</option>)}</select></Field>
              <Field label="Plan" htmlFor="sn-plan"><select id="sn-plan" className="field" value={plan} onChange={(e) => { setPlan(e.target.value); setSizeId(plans.find((p) => p.plan === e.target.value)?.sizes.find((z) => z.profitTarget)?.id ?? ""); }}>{plans.map((p) => <option key={p.plan}>{p.plan}</option>)}</select></Field>
              <Field label="Size" htmlFor="sn-size"><select id="sn-size" className="field" value={size?.id ?? ""} onChange={(e) => setSizeId(e.target.value)}>{sizes.map((z) => <option key={z.id} value={z.id}>{Math.round(z.accountSize / 1000)}K · target {usd(z.profitTarget ?? 0)}</option>)}</select></Field>
            </div>
          )}
          {acctId === "manual" && (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {numIn("sn-rem", "$ left to target", m.remaining, (v) => setM({ ...m, remaining: +v }))}
              {numIn("sn-room", "$ drawdown left", m.room, (v) => setM({ ...m, room: +v }))}
              {numIn("sn-dll", "Daily loss limit $", m.dll, (v) => setM({ ...m, dll: v }), "Blank = none")}
              {numIn("sn-mm", "Max NQ", m.maxMinis, (v) => setM({ ...m, maxMinis: +v }))}
              {numIn("sn-mu", "Max MNQ", m.maxMicros, (v) => setM({ ...m, maxMicros: +v }))}
              {numIn("sn-con", "Consistency %", m.consistency, (v) => setM({ ...m, consistency: v }), "Blank = none")}
            </div>
          )}
          {acctId !== "manual" && (acct || size) && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Stat label="Left to target" value={usd(input.remaining)} tone="ice" />
              <Stat label="Drawdown left" value={usd(input.drawdownRoom)} tone="loss" />
              <Stat label="Max size" value={`${input.maxMinis} NQ · ${input.maxMicros} MNQ`} />
              <Stat label="Consistency" value={input.consistencyPct ? `${Math.round(input.consistencyPct * 100)}% max day` : "None"} sub={days > 1 ? `needs ${days}+ winning days` : undefined} />
            </div>
          )}
          {rec ? (
            <div className="border border-win/40 bg-win/5 px-4 py-3 text-sm">
              <span className="label !text-win">Recommended</span>
              <p className="mt-1 text-ink"><b className="num text-lg">{rec.contracts} {rec.instrument}</b> · {rec.wins} win{rec.wins > 1 ? "s" : ""} of {s.tp} pts passes ({usd(rec.perWin)} each). Risk per trade {usd(rec.risk)}: you can take {rec.lossesToFail} loss{rec.lossesToFail === 1 ? "" : "es"} before the drawdown.</p>
            </div>
          ) : <p className="text-sm text-loss">No size passes every rule with these numbers. Lower the stop, or plan for more wins.</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="label text-left"><th className="py-2">Wins to pass</th><th>Size</th><th>Per win</th><th>Risk / trade</th><th>Losses until fail</th><th>Check</th></tr></thead>
              <tbody>
                {opts.map((o) => (
                  <tr key={`${o.wins}${o.instrument}`} className={cx("border-t border-line", o === rec && "bg-win/5")}>
                    <td className="py-2 num">{o.wins}</td><td className="num">{o.contracts} {o.instrument}</td><td className="num">{usd(o.perWin)}</td><td className="num text-loss">{usd(o.risk)}</td><td className="num">{o.lossesToFail}</td>
                    <td className={o.ok ? "text-win" : "text-ink-3"}>{o.ok ? "✓ passes every rule" : o.problems.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-3">One win per day assumed. Always check your firm’s current rules: some cap size until you’re in profit, and some count open losses toward the daily limit.</p>
        </div>
      </Panel>
    </div>
  );
}
