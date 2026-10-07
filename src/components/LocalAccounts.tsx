"use client";
import { useEffect, useState } from "react";
import { api, type LocalAccountRow } from "@/lib/api-client";
import { Panel } from "./ui";

const LIMITS: [string, number | null][] = [["No limit", null], ["7 days", 7], ["14 days", 14], ["30 days", 30], ["45 days", 45], ["60 days", 60], ["90 days", 90], ["180 days", 180], ["1 year", 365]];
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "never");
const status = (r: LocalAccountRow) => (r.disabled ? "Disabled" : !r.active ? "Invited" : r.expiresAt && Date.parse(r.expiresAt) < Date.now() ? "Expired" : "Active");

export function LocalAccounts() {
  const [rows, setRows] = useState<LocalAccountRow[] | null>(null);
  const [f, setF] = useState({ name: "", email: "", days: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const load = () => api.localAccounts().then(setRows, (e) => setMsg(e.message));
  useEffect(() => { load(); }, []);
  const done = (r: { emailed?: boolean; link?: string }, ok: string) => { if (r.emailed === false) { setLink(r.link ?? null); setMsg("Email could not be sent (is the email service set up?). Copy this setup link and send it to them yourself:"); } else { setLink(null); setMsg(ok); } };
  const run = async (fn: () => Promise<{ emailed?: boolean; link?: string } | unknown>, ok: string) => { try { setLink(null); const r = (await fn()) as { emailed?: boolean; link?: string }; done(r ?? {}, ok); await load(); } catch (e) { setMsg((e as Error).message); } };
  const lim = (v: string) => (v === "" ? null : Number(v));
  const inp = "border border-line-2 bg-panel px-2.5 py-2 text-sm text-ink outline-none focus:border-ice-dim";
  return (
    <Panel title="Non-Discord members">
      <div className="grid gap-4 p-4">
        <p className="text-sm text-ink-3">People who sign in with an email and password instead of Discord. Add their name and email: they get a link to set their own password. The access limit starts counting when they finish setting up. Disabling keeps their data.</p>
        <form className="grid gap-2 md:grid-cols-[1fr_1.3fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await api.createLocal({ name: f.name, email: f.email, days: lim(f.days) }); setF({ name: "", email: "", days: "" }); return r; }, "Invite sent."); }}>
          <input className={inp} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inp} placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <select className={inp} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}>{LIMITS.map(([t, d]) => <option key={t} value={d ?? ""}>{t}</option>)}</select>
          <button className="btn-primary px-4 py-2" type="submit">Send invite</button>
        </form>
        {msg && <p className="text-sm text-ice">{msg}</p>}
        {link && <input className={inp + " w-full font-mono text-xs"} readOnly value={link} onFocus={(e) => e.currentTarget.select()} />}
        <div className="grid gap-2">
          {rows === null ? <p className="text-sm text-ink-3">Loading…</p> : rows.length === 0 ? <p className="text-sm text-ink-3">No non-Discord members yet.</p> : rows.map((r) => (
            <div key={r.id} className="grid gap-2 border border-line p-3 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
              <div><b>{r.name}</b> <span className="text-ink-3">{r.email ?? "@" + r.username}</span><div className="text-xs text-ink-3">{status(r)} · {r.active ? `access until ${r.expiresAt ? when(r.expiresAt) : "no limit"} · last sign-in ${when(r.lastLoginAt)}` : `limit ${r.days ? r.days + " days after setup" : "none"}`}</div></div>
              <select className={inp} defaultValue="keep" onChange={(e) => { const v = e.target.value; e.target.value = "keep"; if (v === "keep") return; run(() => api.patchLocal(r.id, { days: lim(v === "none" ? "" : v) }), "Access limit updated (counted from today)."); }}>
                <option value="keep">Change limit…</option>{LIMITS.map(([t, d]) => <option key={t} value={d ?? "none"}>{t}</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                {r.email && <button className="btn px-3 py-1.5 text-sm" type="button" onClick={() => run(() => api.patchLocal(r.id, { resend: true }), r.active ? "Password reset link sent." : "Invite sent again.")}>{r.active ? "Send reset link" : "Resend invite"}</button>}
                <button className="btn px-3 py-1.5 text-sm" type="button" onClick={() => run(() => api.patchLocal(r.id, { disabled: !r.disabled }), r.disabled ? "Enabled." : "Disabled. They are signed out.")}>{r.disabled ? "Enable" : "Disable"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
