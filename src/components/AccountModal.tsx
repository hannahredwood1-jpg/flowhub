"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import type { AccountDTO, CatalogFirm, Stage } from "@/lib/types";
import { k, usd } from "@/lib/format";
import { ErrorLine, Field, Modal } from "./ui";

const STAGES: { v: Stage; t: string }[] = [
  { v: "EVALUATION", t: "Evaluation" }, { v: "PASSED", t: "Passed – awaiting funded" }, { v: "FUNDED", t: "Funded (sim)" },
  { v: "LIVE", t: "Live" }, { v: "FAILED", t: "Failed" }, { v: "ARCHIVED", t: "Archived" },
];

export function AccountModal({ open, onClose, catalog, editing, today, onSaved }: {
  open: boolean; onClose: () => void; catalog: CatalogFirm[]; editing: AccountDTO | null; today: string; onSaved: () => Promise<void>;
}) {
  const [firm, setFirm] = useState(editing?.rules.firm ?? catalog[0]?.firm ?? "");
  const plans = useMemo(() => catalog.find((f) => f.firm === firm)?.plans ?? [], [catalog, firm]);
  const [plan, setPlan] = useState(editing?.rules.planName ?? plans[0]?.plan ?? "");
  const sizes = plans.find((p) => p.plan === plan)?.sizes ?? [];
  const [templateId, setTemplateId] = useState(editing?.templateId ?? sizes[0]?.id ?? "");
  const tpl = sizes.find((s) => s.id === templateId);

  const [form, setForm] = useState({
    nickname: editing?.nickname ?? "",
    stage: editing?.stage ?? ("EVALUATION" as Stage),
    startDate: editing?.startDate ?? today,
    quantity: editing?.quantity ?? 1,
    targetPassDays: editing?.targetPassDays ?? "",
    riskPerTradeOverride: editing?.riskPerTradeOverride ?? "",
    dailyLossLimitOverride: editing?.dailyLossLimitOverride ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  const pickFirm = (f: string) => {
    setFirm(f);
    const p = catalog.find((x) => x.firm === f)?.plans[0];
    setPlan(p?.plan ?? "");
    setTemplateId(p?.sizes[0]?.id ?? "");
  };
  const pickPlan = (p: string) => {
    setPlan(p);
    const s = plans.find((x) => x.plan === p)?.sizes;
    setTemplateId(s?.find((x) => x.accountSize === tpl?.accountSize)?.id ?? s?.[0]?.id ?? "");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const opt = (v: string | number) => (v === "" ? null : Number(v));
    const body = {
      nickname: form.nickname || null, stage: form.stage, startDate: form.startDate, quantity: Number(form.quantity),
      targetPassDays: opt(form.targetPassDays), riskPerTradeOverride: opt(form.riskPerTradeOverride), dailyLossLimitOverride: opt(form.dailyLossLimitOverride),
    };
    try {
      if (editing) await api.updateAccount(editing.id, body);
      else await api.addAccount({ ...body, templateId });
      await onSaved();
      onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    try { await api.deleteAccount(editing.id); await onSaved(); onClose(); } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${editing.label}` : "Add prop firm account"} wide>
      <form onSubmit={submit} className="grid gap-5">
        {!editing && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prop firm" htmlFor="acct-firm">
              <select id="acct-firm" className="field" value={firm} onChange={(e) => pickFirm(e.target.value)}>
                {catalog.map((f) => <option key={f.firm}>{f.firm}</option>)}
              </select>
            </Field>
            <Field label="Plan" htmlFor="acct-plan">
              <select id="acct-plan" className="field" value={plan} onChange={(e) => pickPlan(e.target.value)}>
                {plans.map((p) => <option key={p.plan}>{p.plan}</option>)}
              </select>
            </Field>
            <Field label="Account size" htmlFor="acct-size">
              <select id="acct-size" className="field" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {sizes.map((s) => <option key={s.id} value={s.id}>{k(s.accountSize)}</option>)}
              </select>
            </Field>
          </div>
        )}

        {tpl && !editing && (
          <div className="grid grid-cols-2 gap-3 border border-line bg-abyss/60 p-3 text-sm sm:grid-cols-5">
            <Rule l="Profit target" v={tpl.profitTarget ? usd(tpl.profitTarget) : "Instant funded"} />
            <Rule l="Max loss" v={usd(tpl.maxLoss)} />
            <Rule l="Daily loss" v={tpl.dailyLossLimit ? usd(tpl.dailyLossLimit) : "None"} />
            <Rule l="Consistency" v={tpl.consistencyPct ? `${tpl.consistencyPct}%` : "None"} />
            <Rule l="Min days" v={String(tpl.minDays || "—")} />
            <p className="col-span-full text-xs text-ink-3">{tpl.drawdownNote}{tpl.dataStatus !== "OFFICIAL" && " · some figures need checking against the firm's site"}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nickname (optional)" htmlFor="acct-nick"><input id="acct-nick" className="field" maxLength={40} placeholder="e.g. MFFU #2" value={form.nickname} onChange={set("nickname")} /></Field>
          <Field label="Stage" htmlFor="acct-stage">
            <select id="acct-stage" className="field" value={form.stage} onChange={set("stage")}>{STAGES.map((s) => <option key={s.v} value={s.v}>{s.t}</option>)}</select>
          </Field>
          <Field label="Start date" htmlFor="acct-start"><input id="acct-start" type="date" className="field" value={form.startDate} onChange={set("startDate")} required /></Field>
          <Field label="How many of this account" htmlFor="acct-qty" hint="Copy-trading 3 identical accounts? Enter 3."><input id="acct-qty" type="number" min={1} max={20} className="field num" value={form.quantity} onChange={set("quantity")} /></Field>
          <Field label="Pass it in (trading days)" htmlFor="acct-days" hint="Leave blank to use the safe pace for your strategy."><input id="acct-days" type="number" min={1} max={120} className="field num" value={form.targetPassDays} onChange={set("targetPassDays")} /></Field>
          <Field label="Daily loss add-on ($)" htmlFor="acct-dll" hint="Only if you bought an optional DLL at checkout."><input id="acct-dll" type="number" min={1} className="field num" value={form.dailyLossLimitOverride} onChange={set("dailyLossLimitOverride")} /></Field>
          <Field label="Fixed risk per trade ($)" htmlFor="acct-risk" hint="Optional. Overrides the planner's suggested risk."><input id="acct-risk" type="number" min={1} className="field num" value={form.riskPerTradeOverride} onChange={set("riskPerTradeOverride")} /></Field>
        </div>

        <ErrorLine error={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {editing ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-sm text-loss">Delete this account and unlink its trades?
                <button type="button" className="btn !h-8 !text-loss" onClick={remove} disabled={busy}>Delete</button>
                <button type="button" className="btn btn-ghost !h-8" onClick={() => setConfirmDelete(false)}>Keep</button>
              </div>
            ) : <button type="button" className="btn btn-ghost !h-8 !text-ink-3" onClick={() => setConfirmDelete(true)}>Delete account</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy || (!editing && !templateId)}>{editing ? "Save changes" : "Add account"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

const Rule = ({ l, v }: { l: string; v: string }) => (
  <div><div className="label">{l}</div><div className="num mt-0.5">{v}</div></div>
);
