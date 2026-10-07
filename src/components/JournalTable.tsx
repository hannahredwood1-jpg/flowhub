"use client";
import { Fragment, useMemo, useState } from "react";
import type { DashboardData, JournalDTO } from "@/lib/types";
import { shortDate, titleCase, usd } from "@/lib/format";
import { Panel, cx } from "./ui";
import { IconBook, IconChat, IconChevron, IconExternal, IconImage, IconPlus } from "./icons";
import { FeedbackComposer, FeedbackItem } from "./Feedback";

const EMO_TONE: Record<string, string> = {
  CALM: "text-ice", CONFIDENT: "text-win", FOCUSED: "text-ice", HESITANT: "text-lag", FEARFUL: "text-lag",
  FOMO: "text-loss", FRUSTRATED: "text-loss", REVENGE: "text-loss", BORED: "text-ink-3", EUPHORIC: "text-lag",
};
const isImage = (u: string) => /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(u);

export function JournalTable({ data, readOnly, onNew, onEdit, onChanged }: {
  data: DashboardData; readOnly?: boolean; onNew?: () => void; onEdit?: (j: JournalDTO) => void; onChanged: () => Promise<void>;
}) {
  const [acct, setAcct] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => data.journal.filter((j) => acct === "all" || j.memberAccountId === acct), [data.journal, acct]);
  const accounts = data.accounts.filter((a) => data.journal.some((j) => j.memberAccountId === a.id));
  const total = rows.reduce((s, j) => s + j.pnl, 0);
  const fbFor = (id: string) => data.feedback.filter((f) => f.journalEntryId === id);

  return (
    <Panel
      delay={40}
      title={<span className="flex items-center gap-2"><IconBook size={13} /> Trading journal</span>}
      right={!readOnly && <button className="btn btn-primary !h-8 !text-[12px]" onClick={onNew}><IconPlus size={14} /> New log</button>}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <FilterChip on={acct === "all"} onClick={() => setAcct("all")}>All accounts</FilterChip>
        {accounts.map((a) => <FilterChip key={a.id} on={acct === a.id} onClick={() => setAcct(a.id)}>{a.label}</FilterChip>)}
        <span className="ml-auto text-sm text-ink-3">{rows.length} trades · <span className={cx("num", total >= 0 ? "text-win" : "text-loss")}>{usd(total, { sign: true })}</span></span>
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center gap-3 px-6 py-14 text-center text-ink-2">
          {readOnly ? "No trades logged yet." : <>No trades yet. Log your first one and it will count toward your plan.<button className="btn btn-primary" onClick={onNew}><IconPlus size={14} /> New log</button></>}
        </div>
      ) : (
        <div className="max-h-[720px] overflow-auto">
          <table className="tbl text-sm">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr>
                <th className="w-6" aria-label="Expand" /><th>Date</th><th>Account</th><th>Ticker</th><th>Strategy</th>
                <th className="!text-right">Risk</th><th className="!text-right">R</th><th>Result</th><th className="!text-right">P/L</th><th>State</th><th aria-label="Extras" />
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => {
                const expanded = open === j.id;
                const fb = fbFor(j.id);
                return (
                  <Fragment key={j.id}>
                    <tr className={cx("cursor-pointer", expanded && "bg-ice/[0.04]")} onClick={() => setOpen(expanded ? null : j.id)} aria-expanded={expanded}>
                      <td><IconChevron size={14} className={cx("text-ink-3 transition-transform", expanded && "rotate-90 text-ice")} /></td>
                      <td className="num text-ink-2">{shortDate(j.tradeDate)}</td>
                      <td className="max-w-[140px] truncate text-ink-2">{j.accountLabel ?? "—"}</td>
                      <td>
                        <span className="num">{j.ticker}</span>{" "}
                        <span className={cx("font-hud text-[12px]", j.direction === "LONG" ? "text-win" : "text-loss")}>{j.direction === "LONG" ? "▲ L" : "▼ S"}</span>
                      </td>
                      <td className="max-w-[170px] truncate">{j.setupType}</td>
                      <td className="num text-right text-ink-2">{j.riskDollars != null ? usd(j.riskDollars) : j.riskPct != null ? `${j.riskPct}%` : "—"}</td>
                      <td className="num text-right">{j.rrRealized != null ? `${j.rrRealized > 0 ? "+" : ""}${j.rrRealized}` : j.rrPlanned != null ? <span className="text-ink-3">1:{j.rrPlanned}</span> : "—"}</td>
                      <td><span className={cx("chip !h-5", j.outcome === "WIN" ? "text-win" : j.outcome === "LOSS" ? "text-loss" : "text-ice")}>{j.outcome === "BREAKEVEN" ? "BE" : titleCase(j.outcome)}</span></td>
                      <td className={cx("num text-right", j.pnl > 0 ? "text-win" : j.pnl < 0 ? "text-loss" : "text-ink-2")}>{usd(j.pnl, { sign: true })}</td>
                      <td className={cx("text-xs", EMO_TONE[j.emotion])}>{titleCase(j.emotion)}{!j.followedPlan && <span className="ml-1.5 text-loss" title="Didn't follow plan">✕ plan</span>}</td>
                      <td className="text-ink-3">
                        <span className="flex items-center gap-2">
                          {j.screenshotUrl && <IconImage size={14} />}
                          {fb.length > 0 && <span className="flex items-center gap-1 text-ice"><IconChat size={14} />{fb.length}</span>}
                        </span>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="!bg-abyss/70 hover:!bg-abyss/70">
                        <td colSpan={11} className="!whitespace-normal !p-0">
                          <div className="grid gap-4 border-l-2 border-ice px-5 py-4 md:grid-cols-[1fr_minmax(0,1fr)]">
                            <div className="grid content-start gap-3">
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <KV k="Direction" v={titleCase(j.direction)} />
                                <KV k="Contracts" v={j.contracts ?? "—"} />
                                <KV k="Risk" v={[j.riskDollars != null && usd(j.riskDollars), j.riskPct != null && `${j.riskPct}%`].filter(Boolean).join(" · ") || "—"} />
                                <KV k="Planned R:R" v={j.rrPlanned != null ? `1:${j.rrPlanned}` : "—"} />
                                <KV k="Followed plan" v={j.followedPlan ? "Yes" : "No"} />
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{j.notes || <span className="text-ink-3">No notes.</span>}</p>
                              {j.screenshotUrl && (
                                <a href={j.screenshotUrl} target="_blank" rel="noreferrer noopener" className="group block w-fit">
                                  {isImage(j.screenshotUrl) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={j.screenshotUrl} alt="Trade screenshot" referrerPolicy="no-referrer" className="max-h-48 border border-line-2 transition group-hover:border-ice" />
                                  ) : (
                                    <span className="inline-flex items-center gap-2 border border-line-2 px-3 py-2 text-sm text-ice group-hover:border-ice"><IconImage size={14} /> Open chart screenshot <IconExternal size={12} /></span>
                                  )}
                                </a>
                              )}
                              {!readOnly && <button className="btn !h-8 w-fit" onClick={() => onEdit?.(j)}>Edit trade</button>}
                            </div>
                            <div className="grid content-start gap-3">
                              <div className="label">Coach feedback</div>
                              {fb.length === 0 && !readOnly && <p className="text-sm text-ink-3">No feedback on this trade yet.</p>}
                              {fb.map((f) => <FeedbackItem key={f.id} f={f} />)}
                              {readOnly && <FeedbackComposer traderId={data.trader.id} journalEntryId={j.id} onSent={onChanged} compact />}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={cx("h-7 border px-2.5 text-xs transition-colors", on ? "border-ice-dim bg-ice/10 text-ink" : "border-line text-ink-3 hover:text-ink-2")}>
      {children}
    </button>
  );
}
const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div><div className="label">{k}</div><div className="num mt-0.5 text-ink-2">{v}</div></div>
);
