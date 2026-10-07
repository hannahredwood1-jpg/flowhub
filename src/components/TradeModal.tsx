"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Emotions, type AccountDTO, type JournalDTO } from "@/lib/types";
import { titleCase } from "@/lib/format";
import { JOURNAL_SETUPS } from "@/lib/strategies";
import { ErrorLine, Field, Modal, cx } from "./ui";

const SETUPS = JOURNAL_SETUPS;

export function TradeModal({ open, onClose, accounts, editing, today, onSaved }: {
  open: boolean; onClose: () => void; accounts: AccountDTO[]; editing: JournalDTO | null; today: string; onSaved: () => Promise<void>;
}) {
  const live = accounts.filter((a) => a.stage !== "ARCHIVED" && a.stage !== "FAILED");
  const [f, setF] = useState({
    memberAccountId: editing?.memberAccountId ?? live[0]?.id ?? "",
    tradeDate: editing?.tradeDate ?? today,
    ticker: editing?.ticker ?? "MNQ",
    direction: editing?.direction ?? ("LONG" as "LONG" | "SHORT"),
    setupType: editing?.setupType ?? SETUPS[0],
    contracts: editing?.contracts ?? "",
    riskDollars: editing?.riskDollars ?? "",
    riskPct: editing?.riskPct ?? "",
    rrPlanned: editing?.rrPlanned ?? 2,
    rrRealized: editing?.rrRealized ?? "",
    outcome: editing?.outcome ?? ("WIN" as JournalDTO["outcome"]),
    pnl: editing?.pnl ?? "",
    emotion: editing?.emotion ?? "CALM",
    followedPlan: editing?.followedPlan ?? true,
    screenshotUrl: editing?.screenshotUrl ?? "",
    notes: editing?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [key]: e.target.value });

  // Risk % auto-fills from $ risk and the account size
  const acct = live.find((a) => a.id === f.memberAccountId);
  const autoPct = acct && f.riskDollars !== "" ? ((Number(f.riskDollars) / acct.rules.accountSize) * 100).toFixed(2) : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const opt = (v: string | number) => (v === "" ? null : Number(v));
    const pnl = Number(f.pnl);
    const body = {
      ...f,
      memberAccountId: f.memberAccountId || null,
      contracts: opt(f.contracts), riskDollars: opt(f.riskDollars), riskPct: opt(f.riskPct === "" ? autoPct : f.riskPct),
      rrPlanned: opt(f.rrPlanned), rrRealized: opt(f.rrRealized), pnl,
      screenshotUrl: f.screenshotUrl || null, notes: f.notes || null,
    };
    try {
      if (editing) await api.updateTrade(editing.id, body);
      else await api.addTrade(body);
      await onSaved();
      onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    try { await api.deleteTrade(editing.id); await onSaved(); onClose(); } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  const seg = (value: string, current: string, onPick: () => void, tone: string) => (
    <button type="button" onClick={onPick} aria-pressed={value === current}
      className={cx("h-[38px] flex-1 border font-hud text-[12px] transition-colors", value === current ? tone : "border-line-2 text-ink-3 hover:text-ink-2")}>
      {titleCase(value)}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit trade" : "New log"} wide>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Account" htmlFor="t-acct" className="sm:col-span-2">
            <select id="t-acct" className="field" value={f.memberAccountId} onChange={set("memberAccountId")}>
              {live.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              <option value="">No account (practice / other)</option>
            </select>
          </Field>
          <Field label="Date" htmlFor="t-date"><input id="t-date" type="date" className="field" value={f.tradeDate} onChange={set("tradeDate")} required /></Field>
          <Field label="Ticker" htmlFor="t-ticker"><input id="t-ticker" className="field " maxLength={12} value={f.ticker} onChange={set("ticker")} required /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <span className="label !text-ink-2">Direction</span>
            <div className="flex gap-2">
              {seg("LONG", f.direction, () => setF({ ...f, direction: "LONG" }), "border-win text-win bg-win/10")}
              {seg("SHORT", f.direction, () => setF({ ...f, direction: "SHORT" }), "border-loss text-loss bg-loss/10")}
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className="label !text-ink-2">Result</span>
            <div className="flex gap-2">
              {seg("WIN", f.outcome, () => setF({ ...f, outcome: "WIN" }), "border-win text-win bg-win/10")}
              {seg("LOSS", f.outcome, () => setF({ ...f, outcome: "LOSS" }), "border-loss text-loss bg-loss/10")}
              {seg("BREAKEVEN", f.outcome, () => setF({ ...f, outcome: "BREAKEVEN" }), "border-ice text-ice bg-ice/10")}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Strategy" htmlFor="t-setup" className="sm:col-span-2">
            <input id="t-setup" list="setups" className="field" maxLength={60} value={f.setupType} onChange={set("setupType")} required />
            <datalist id="setups">{SETUPS.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Contracts" htmlFor="t-qty"><input id="t-qty" type="number" min={1} className="field num" value={f.contracts} onChange={set("contracts")} /></Field>
          <Field label="Net P/L ($)" htmlFor="t-pnl"><input id="t-pnl" type="number" step="0.01" className="field num" value={f.pnl} onChange={set("pnl")} required placeholder="-250 or 480" /></Field>
          <Field label="Risk ($)" htmlFor="t-risk"><input id="t-risk" type="number" min={0} step="0.01" className="field num" value={f.riskDollars} onChange={set("riskDollars")} /></Field>
          <Field label="Risk (%)" htmlFor="t-riskpct"><input id="t-riskpct" type="number" min={0} step="0.01" className="field num" value={f.riskPct} placeholder={autoPct} onChange={set("riskPct")} /></Field>
          <Field label="Planned R:R" htmlFor="t-rrp"><input id="t-rrp" type="number" min={0} step="0.1" className="field num" value={f.rrPlanned} onChange={set("rrPlanned")} /></Field>
          <Field label="Realized R" htmlFor="t-rrr"><input id="t-rrr" type="number" step="0.1" className="field num" value={f.rrRealized} onChange={set("rrRealized")} placeholder="-1, 2.4" /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Emotional state" htmlFor="t-emo">
            <select id="t-emo" className="field" value={f.emotion} onChange={set("emotion")}>{Emotions.map((e) => <option key={e} value={e}>{titleCase(e)}</option>)}</select>
          </Field>
          <Field label="Screenshot link" htmlFor="t-shot" hint="TradingView snapshot or image link (https)"><input id="t-shot" type="url" className="field" placeholder="https://www.tradingview.com/x/…" value={f.screenshotUrl} onChange={set("screenshotUrl")} /></Field>
        </div>
        <Field label="Notes" htmlFor="t-notes"><textarea id="t-notes" rows={3} className="field" maxLength={4000} value={f.notes} onChange={set("notes")} placeholder="Why you took it, what you'd do differently" /></Field>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input id="t-plan" type="checkbox" className="h-4 w-4 accent-[var(--color-ice)]" checked={f.followedPlan} onChange={(e) => setF({ ...f, followedPlan: e.target.checked })} />
          I followed my plan on this trade
        </label>

        <ErrorLine error={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {editing ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-sm text-loss">Delete this trade?
                <button type="button" className="btn !h-8 !text-loss" onClick={remove} disabled={busy}>Delete</button>
                <button type="button" className="btn btn-ghost !h-8" onClick={() => setConfirmDelete(false)}>Keep</button>
              </div>
            ) : <button type="button" className="btn btn-ghost !h-8 !text-ink-3" onClick={() => setConfirmDelete(true)}>Delete trade</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{editing ? "Save trade" : "Log trade"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
