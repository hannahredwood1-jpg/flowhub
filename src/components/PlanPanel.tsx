"use client";
import { useState } from "react";
import type { AccountDTO, DashboardData } from "@/lib/types";
import { k, pct, usd, titleCase } from "@/lib/format";
import { Meter, Panel, Ring, StatusChip, cx, statusBg } from "./ui";
import { IconAlert, IconExternal, IconPlus, IconSettings, IconShield, IconTarget, IconCoin } from "./icons";

type Props = {
  data: DashboardData;
  readOnly?: boolean;
  onAddAccount?: () => void;
  onEditAccount?: (a: AccountDTO) => void;
  onEditRoadmap?: () => void;
};

export function PlanPanel({ data, readOnly, onAddAccount, onEditAccount, onEditRoadmap }: Props) {
  const active = data.accounts.filter((a) => a.stage !== "ARCHIVED");
  const [selectedId, setSelectedId] = useState(active[0]?.id ?? null);
  const selected = active.find((a) => a.id === selectedId) ?? active[0];

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <Panel
        title={<span className="flex items-center gap-2"><IconTarget size={13} /> Account plans</span>}
        right={!readOnly && <button className="btn !h-8 !text-[10px]" onClick={onAddAccount}><IconPlus size={14} /> Add account</button>}
      >
        {active.length === 0 ? (
          <EmptyAccounts readOnly={readOnly} onAdd={onAddAccount} />
        ) : (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-line px-2 pt-2" role="tablist" aria-label="Accounts">
              {active.map((a) => (
                <button
                  key={a.id}
                  role="tab"
                  aria-selected={a.id === selected?.id}
                  onClick={() => setSelectedId(a.id)}
                  className={cx(
                    "relative flex shrink-0 items-center gap-2 px-3 pb-2.5 pt-1.5 text-sm transition-colors",
                    a.id === selected?.id ? "text-ink" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  <span className={cx("h-1.5 w-1.5 rotate-45", statusBg(a.pace.status))} />
                  {a.label}
                  {a.quantity > 1 && <span className="num text-[11px] text-ink-3">×{a.quantity}</span>}
                  {a.id === selected?.id && <span className="absolute inset-x-2 bottom-0 h-[2px] bg-ice"><span className="absolute right-0 top-0 h-full w-1.5 bg-signal" /></span>}
                </button>
              ))}
            </div>
            {selected && <AccountDetail key={selected.id} a={selected} readOnly={readOnly} onEdit={() => onEditAccount?.(selected)} />}
          </>
        )}
      </Panel>
      <IncomeCard data={data} readOnly={readOnly} onEdit={onEditRoadmap} />
    </div>
  );
}

function EmptyAccounts({ readOnly, onAdd }: { readOnly?: boolean; onAdd?: () => void }) {
  return (
    <div className="grid place-items-center gap-3 px-6 py-12 text-center">
      <IconShield size={28} className="text-ice-dim" />
      <p className="max-w-xs text-ink-2">{readOnly ? "This trader hasn't added an account yet." : "Pick the exact prop firm account you're trading to get your pass plan."}</p>
      {!readOnly && <button className="btn btn-primary" onClick={onAdd}><IconPlus size={14} /> Add your first account</button>}
    </div>
  );
}

function AccountDetail({ a, readOnly, onEdit }: { a: AccountDTO; readOnly?: boolean; onEdit: () => void }) {
  const r = a.rules;
  const p = a.passPlan;
  const pace = a.pace;
  const funded = a.stage === "FUNDED" || a.stage === "LIVE";
  const ddTone = pace.drawdownRoomPct < 0.25 ? "loss" : pace.drawdownRoomPct < 0.5 ? "lag" : "win";

  return (
    <div className="grid gap-5 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label">{r.firm}</div>
          <div className="mt-1 font-display text-xl font-extrabold tracking-[0.01em]">{r.planName} · {k(r.accountSize)}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusChip status={pace.status} />
            <span className="chip text-ink-3">{titleCase(a.stage)}</span>
            {r.dataStatus !== "OFFICIAL" && (
              <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="chip text-lag hover:brightness-125" title="Some rule figures came from a secondary source or need checking">
                {r.dataStatus === "VERIFY" ? "Rules: verify" : "Rules: 2nd source"}
              </a>
            )}
          </div>
        </div>
        {!readOnly && <button className="btn btn-ghost !h-8 !px-2" onClick={onEdit} aria-label="Edit account plan"><IconSettings /></button>}
      </div>

      {/* Progress */}
      <div className="grid gap-4">
        {!funded && r.profitTarget != null ? (
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="label">Profit target</span>
              <span className="num text-sm">
                <span className={pace.profit >= 0 ? "text-win" : "text-loss"}>{usd(pace.profit, { sign: true })}</span>
                <span className="text-ink-3"> / {usd(r.profitTarget)}</span>
              </span>
            </div>
            <Meter value={pace.progressPct} marker={r.profitTarget ? pace.expectedProfit / r.profitTarget : undefined} tone={pace.status === "BEHIND" ? "lag" : "ice"} label="Progress to profit target" />
            <div className="mt-1.5 flex justify-between text-xs text-ink-3">
              <span>Day {pace.daysTraded} traded · {pace.tradingDaysElapsed} elapsed</span>
              <span>Plan: {usd(pace.expectedProfit)} by today</span>
            </div>
          </div>
        ) : (
          a.incomeTargets && (
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="label">This month vs goal</span>
                <span className="num text-sm"><span className="text-win">{usd(pace.progressPct * a.incomeTargets.monthlyGross)}</span><span className="text-ink-3"> / {usd(a.incomeTargets.monthlyGross)}</span></span>
              </div>
              <Meter value={pace.progressPct} marker={pace.expectedProfit / a.incomeTargets.monthlyGross} tone={pace.status === "BEHIND" ? "lag" : "win"} label="Monthly income progress" />
            </div>
          )
        )}
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="label">Drawdown left</span>
            <span className="num text-sm"><span className={{ win: "text-win", lag: "text-lag", loss: "text-loss" }[ddTone]}>{usd(pace.drawdownRoom)}</span><span className="text-ink-3"> · fails at {usd(pace.floor)}{pace.drawdownRoom > r.maxLoss ? " (floor locked)" : ""} · firm max DD {usd(r.maxLoss)}</span></span>
          </div>
          <Meter value={pace.drawdownRoomPct} tone={ddTone} label="Drawdown remaining" />
        </div>
        {r.consistencyPct && !funded && pace.profit > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="label">Consistency · best day</span>
            <span className={cx("num", pace.consistencyOk ? "text-ink-2" : "text-loss")}>{pct(pace.bestDayShare)} of profit <span className="text-ink-3">(max {r.consistencyPct}%)</span></span>
          </div>
        )}
        {pace.flags.length > 0 && (
          <ul className="grid gap-1">
            {pace.flags.map((f) => <li key={f} className="flex items-center gap-2 text-sm text-loss"><IconAlert size={14} />{f}</li>)}
          </ul>
        )}
      </div>

      {/* Pass plan */}
      {p && (
        <div className="border border-line bg-abyss/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="label !text-ice">Pass plan</div>
              <div className="mt-1 text-sm text-ink-2">Pass in <span className="num text-ink">{p.days}</span> trading days{p.realisticDays && p.realisticDays !== p.days ? <> · safe pace is <span className="num text-ink">{p.realisticDays}</span></> : null}</div>
            </div>
            {a.sim && <Ring value={a.sim.passRate} label="Pass odds" />}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <PlanStat label="Daily goal" value={usd(p.dailyGoal)} />
            <PlanStat label="Weekly goal" value={usd(p.weeklyGoal)} />
            <PlanStat label="Risk / trade" value={usd(p.riskPerTrade)} sub={`cap ${usd(p.riskCap)}`} />
            <PlanStat label="Size" value={p.contracts.minis > 0 ? `${p.contracts.minis} ${p.contracts.mini}` : `${p.contracts.micros} ${p.contracts.micro}`} sub={p.contracts.minis > 0 ? `or ${p.contracts.micros} ${p.contracts.micro}` : `${usd(p.contracts.riskPerMicro)} each`} />
            <PlanStat label="Stop for the day" value={usd(-p.dailyStop)} tone="loss" />
            <PlanStat label="Best-day cap" value={p.bestDayCap ? usd(p.bestDayCap) : "None"} sub={p.bestDayCap ? "consistency" : undefined} />
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-3">
            {p.lossesToFail} full losses in a row to fail · expect a {p.expectedLosingStreak}-trade losing streak at some point
            {a.sim && <> · simulated {a.sim.runs.toLocaleString()} runs{a.sim.medianDaysToPass ? `, median pass in ${a.sim.medianDaysToPass} days` : ""}</>}
          </p>
          {p.warnings.length > 0 && (
            <ul className="mt-3 grid gap-1.5">
              {p.warnings.map((w) => <li key={w} className="flex gap-2 border-l-2 border-lag bg-lag/5 px-2.5 py-1.5 text-sm text-ink-2"><IconAlert size={14} className="mt-0.5 shrink-0 text-lag" />{w}</li>)}
            </ul>
          )}
        </div>
      )}

      {funded && a.incomeTargets && (
        <div className="border border-line bg-abyss/60 p-4">
          <div className="label mb-3 !text-win">Income targets for this account</div>
          <dl className="grid grid-cols-3 gap-4">
            <PlanStat label="Month" value={usd(a.incomeTargets.monthlyGross)} />
            <PlanStat label="Week" value={usd(a.incomeTargets.weeklyGross)} />
            <PlanStat label="Day" value={usd(a.incomeTargets.dailyGross)} sub={`can do ~${usd(a.incomeTargets.dailyCapacity)}`} />
          </dl>
        </div>
      )}

      {/* Rules */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Rule label="Max loss" value={`${usd(r.maxLoss)} · ${r.drawdownModel === "INTRADAY_TRAILING" ? "intraday" : r.drawdownModel === "STATIC" ? "static" : "EOD"}`} />
        <Rule label="Daily loss" value={a.dailyLossLimitOverride ? usd(a.dailyLossLimitOverride) : r.dailyLossLimit ? usd(r.dailyLossLimit) : "None"} />
        <Rule label="Consistency" value={r.consistencyPct ? `${r.consistencyPct}%` : "None"} />
        <Rule label="Min days" value={String(r.minDays || "—")} />
        <Rule label="Max size" value={`${r.maxMinis} mini / ${r.maxMicros} micro`} />
        <Rule label="Split" value={r.profitSplit || "—"} />
      </div>
      <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-xs text-ink-3 hover:text-ice">
        Firm rules source <IconExternal size={12} />
      </a>
    </div>
  );
}

function PlanStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "loss" }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={cx("num mt-1 text-[17px] leading-none", tone === "loss" && "text-loss")}>{value}</dd>
      {sub && <dd className="mt-1 text-[11px] text-ink-3">{sub}</dd>}
    </div>
  );
}
function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className="mt-0.5 truncate text-ink-2" title={value}>{value}</div>
    </div>
  );
}

function IncomeCard({ data, readOnly, onEdit }: { data: DashboardData; readOnly?: boolean; onEdit?: () => void }) {
  const inc = data.income;
  const rm = data.roadmap;
  return (
    <Panel
      delay={80}
      title={<span className="flex items-center gap-2"><IconCoin size={13} /> Income roadmap</span>}
      right={!readOnly && <button className="btn btn-ghost !h-8 !px-2" onClick={onEdit} aria-label="Edit goals and strategy"><IconSettings /></button>}
    >
      {!rm ? (
        <div className="grid place-items-center gap-3 px-6 py-10 text-center">
          <p className="max-w-xs text-ink-2">{readOnly ? "No income goal set yet." : "Set a monthly income goal and your strategy stats to unlock weekly and daily targets."}</p>
          {!readOnly && <button className="btn btn-primary" onClick={onEdit}>Set my goals</button>}
        </div>
      ) : (
        <div className="grid gap-4 p-4">
          {/* Goal cascade: month → week → day */}
          <div className="grid grid-cols-3 items-end gap-2">
            {[
              { l: "Month", v: rm.monthlyIncomeGoal, h: "h-16" },
              { l: "Week", v: inc?.weeklyGoal ?? (rm.monthlyIncomeGoal * 12) / 52, h: "h-10" },
              { l: "Day", v: inc?.dailyGoal ?? rm.monthlyIncomeGoal / ((rm.tradingDaysPerWeek * 52) / 12), h: "h-6" },
            ].map((s, i) => (
              <div key={s.l} className="grid gap-1.5">
                <div className="label">{s.l}</div>
                <div className="num text-lg leading-none">{usd(s.v)}</div>
                <div className={cx("relative bg-gradient-to-t from-ice-dim/40 to-ice/10 border-t border-ice/60", s.h)} style={{ animation: `rise .6s ${i * 120}ms both` }} />
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-3">Take-home after profit split · {inc?.tradingDaysPerMonth ?? "—"} trading days a month · gross needed {usd(inc?.grossMonthlyNeeded)}</p>

          <div className="grid grid-cols-3 gap-3 border-y border-line py-3">
            <MiniStat label="Funded accounts" value={String(inc?.fundedAccountCount ?? 0)} />
            <MiniStat label="Needed at safe risk" value={inc?.accountsNeeded != null ? String(inc.accountsNeeded) : "—"} tone={inc && inc.accountsNeeded != null && inc.accountsNeeded > inc.fundedAccountCount ? "lag" : undefined} />
            <MiniStat label="Edge per trade" value={`${(rm.winRate * rm.avgRR - (1 - rm.winRate)).toFixed(2)}R`} />
          </div>

          <StrategyCheck data={data} />

          {inc && inc.perAccount.length > 0 && (
            <div className="overflow-x-auto">
              <table className="tbl text-sm">
                <thead><tr><th>Account</th><th className="!text-right">Month</th><th className="!text-right">Week</th><th className="!text-right">Day</th><th className="!text-right">Can do / day</th></tr></thead>
                <tbody>
                  {inc.perAccount.map((p) => (
                    <tr key={p.id}>
                      <td>{p.label}{p.quantity > 1 && <span className="num text-ink-3"> ×{p.quantity}</span>}</td>
                      <td className="num text-right">{usd(p.monthlyGross)}</td>
                      <td className="num text-right">{usd(p.weeklyGross)}</td>
                      <td className="num text-right">{usd(p.dailyGross)}</td>
                      <td className={cx("num text-right", p.feasible ? "text-win" : "text-loss")}>{usd(p.dailyCapacity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-ink-3">Amounts are gross profit per account (before split). ×N = copy-traded accounts, each with the same target.</p>
            </div>
          )}
          {inc?.warnings.map((w) => <p key={w} className="flex gap-2 text-sm text-ink-2"><IconAlert size={14} className="mt-0.5 shrink-0 text-lag" />{w}</p>)}
        </div>
      )}
    </Panel>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "lag" }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={cx("num mt-1 text-base", tone === "lag" && "text-lag")}>{value}</div>
    </div>
  );
}

function StrategyCheck({ data }: { data: DashboardData }) {
  const rm = data.roadmap!;
  const sessions = rm.strategyMode === "DAILY_LEVELS" ? "ECHO X ORBIT only" : rm.multiSession ? "Asia + New York" : rm.strategies.some((k) => k.startsWith("ASIA")) ? "Asia session" : "New York session";
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="label">Strategy check · your logged trades</span>
        <span className="text-xs text-ink-3">{sessions} · plan win rate <span className="num text-ink-2">{pct(rm.winRate, 1)}</span></span>
      </div>
      <div className="grid gap-1.5">
        {data.strategyStats.map((s) => {
          const inPlan = rm.strategies.includes(s.key);
          const off = s.actual != null && s.trades >= 10 && s.actual < s.expected - 0.1;
          return (
            <div key={s.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span className={cx("truncate", inPlan ? "text-ink" : "text-ink-3")}>{s.label}{!inPlan && <span className="text-xs"> · not in plan</span>}</span>
              <span className="num text-xs">
                <span className={off ? "text-loss" : s.actual != null && s.actual >= s.expected ? "text-win" : "text-ink-2"}>{s.actual != null ? pct(s.actual) : "—"}</span>
                <span className="text-ink-3"> / {pct(s.expected, s.expected * 100 % 1 ? 1 : 0)} · {s.trades}</span>
              </span>
              <div className="relative col-span-2 h-1 bg-line">
                {s.actual != null && <div className={cx("h-full", off ? "bg-loss" : "bg-ice-dim")} style={{ width: `${s.actual * 100}%` }} />}
                <div className="absolute -top-0.5 h-2 w-px bg-ink-2" style={{ left: `${s.expected * 100}%` }} title="Expected win rate" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-3">Actual win rate / expected · trades. Log each trade under its strategy so this stays accurate.</p>
    </div>
  );
}
