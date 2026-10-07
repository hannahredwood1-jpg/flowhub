"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { FeedbackDTO } from "@/lib/types";
import { shortDate, titleCase } from "@/lib/format";
import { Avatar, ErrorLine, cx } from "./ui";

const KIND_TONE: Record<FeedbackDTO["kind"], string> = { NOTE: "text-ice", PRAISE: "text-win", WARNING: "text-loss", ACTION_ITEM: "text-lag" };

export function FeedbackItem({ f, onRead }: { f: FeedbackDTO; onRead?: (id: string) => void }) {
  return (
    <div className={cx("flex gap-3 border-l-2 py-2 pl-3", f.readAt ? "border-line-2" : "border-ice")}>
      <Avatar src={f.coach.avatarUrl} name={f.coach.name} size={26} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink">{f.coach.name}</span>
          <span className={cx("chip !h-[18px] !text-[11px]", KIND_TONE[f.kind])}>{titleCase(f.kind)}</span>
          <span className="text-ink-3">{shortDate(f.createdAt.slice(0, 10))}</span>
          {!f.readAt && onRead && <button className="ml-auto text-ink-3 hover:text-ice" onClick={() => onRead(f.id)}>Mark read</button>}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{f.body}</p>
      </div>
    </div>
  );
}

export function FeedbackComposer({ traderId, journalEntryId, memberAccountId, accounts, onSent, compact }: {
  traderId: string; journalEntryId?: string; memberAccountId?: string | null;
  accounts?: { id: string; label: string }[]; onSent: () => Promise<void>; compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<FeedbackDTO["kind"]>("NOTE");
  const [acct, setAcct] = useState(memberAccountId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const id = `fb-${journalEntryId ?? memberAccountId ?? traderId}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true); setError(null);
    try {
      await api.giveFeedback({ traderId, journalEntryId: journalEntryId ?? null, memberAccountId: journalEntryId ? null : acct || null, kind, body });
      setBody(""); setSent(true);
      await onSent();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <label htmlFor={id} className="label !text-ice">{journalEntryId ? "Feedback on this trade" : "Coaching note"}</label>
      <textarea id={id} rows={compact ? 2 : 3} className="field" maxLength={4000} value={body} onChange={(e) => { setBody(e.target.value); setSent(false); }}
        placeholder={journalEntryId ? "What did they do well, what to fix next time?" : "Where they're struggling, what to focus on this week…"} />
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Feedback type" className="field !h-8 !w-auto" value={kind} onChange={(e) => setKind(e.target.value as FeedbackDTO["kind"])}>
          <option value="NOTE">Note</option><option value="PRAISE">Praise</option><option value="WARNING">Warning</option><option value="ACTION_ITEM">Action item</option>
        </select>
        {!journalEntryId && accounts && accounts.length > 0 && (
          <select aria-label="About account" className="field !h-8 !w-auto" value={acct} onChange={(e) => setAcct(e.target.value)}>
            <option value="">General</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        )}
        <button type="submit" className="btn btn-primary !h-8 ml-auto" disabled={busy || !body.trim()}>Send feedback</button>
      </div>
      {sent && <p className="text-xs text-win" role="status">Sent. The trader sees it on their dashboard.</p>}
      <ErrorLine error={error} />
    </form>
  );
}
