"use client";
import { useEffect, useState } from "react";
import { api, type LocalAccountRow } from "@/lib/api-client";
import { Panel } from "./ui";

const LIMITS: [string, number | null][] = [["No limit", null], ["7 days", 7], ["14 days", 14], ["30 days", 30], ["45 days", 45], ["60 days", 60], ["90 days", 90], ["180 days", 180], ["1 year", 365]];
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "never");
const status = (r: LocalAccountRow) => (r.disabled ? "Disabled" : r.expiresAt && Date.parse(r.expiresAt) < Date.now() ? "Expired" : "Active");

export function LocalAccounts() {
  const [rows, setRows] = useState<LocalAccountRow[] | null>(null);
  const [f, setF] = useState({ name: "", username: "", password: "", days: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => api.localAccounts().then(setRows, (e) => setMsg(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<unknown>, ok?: string) => { try { await fn(); setMsg(ok ?? null); await load(); } catch (e) { setMsg((e as Error).message); } };
  const lim = (v: string) => (v === "" ? null : Number(v));
  const inp = "border border-line-2 bg-panel px-2.5 py-2 text-sm text-ink outline-none focus:border-ice-dim";
  return (
    <Panel title="Non-Discord members">
      <div className="grid gap-4 p-4">
        <p className="text-sm text-ink-3">People who sign in with a username and password instead of Discord. You create the login, set how long it lasts, and can switch it off at any time. Their data and progress are kept.</p>
        <form className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.createLocal({ name: f.name, username: f.username, password: f.password, days: lim(f.days) }); setF({ name: "", username: "", password: "", days: "" }); }, "Account created. Give them the username and password."); }}>
          <input className={inp} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inp} placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
          <input className={inp} placeholder="Password (8+ characters)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <select className={inp} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}>{LIMITS.map(([t, d]) => <option key={t} value={d ?? ""}>{t}</option>)}</select>
          <button className="btn-primary px-4 py-2" type="submit">Add</button>
        </form>
        {msg && <p className="text-sm text-ice">{msg}</p>}
        <div className="grid gap-2">
          {rows === null ? <p className="text-sm text-ink-3">Loading…</p> : rows.length === 0 ? <p className="text-sm text-ink-3">No non-Discord members yet.</p> : rows.map((r) => (
            <div key={r.id} className="grid gap-2 border border-line p-3 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
              <div><b>{r.name}</b> <span className="text-ink-3">@{r.username}</span><div className="text-xs text-ink-3">{status(r)} · access until {r.expiresAt ? when(r.expiresAt) : "no limit"} · last sign-in {when(r.lastLoginAt)}</div></div>
              <select className={inp} defaultValue="keep" onChange={(e) => { if (e.target.value === "keep") return; run(() => api.patchLocal(r.id, { days: lim(e.target.value === "none" ? "" : e.target.value) }), "Access limit updated (counted from today)."); e.target.value = "keep"; }}>
                <option value="keep">Change limit…</option>{LIMITS.map(([t, d]) => <option key={t} value={d ?? "none"}>{t}</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                <button className="btn px-3 py-1.5 text-sm" type="button" onClick={() => { const p = window.prompt(`New password for ${r.name} (8+ characters)`); if (p) run(() => api.patchLocal(r.id, { password: p }), "Password changed."); }}>Reset password</button>
                <button className="btn px-3 py-1.5 text-sm" type="button" onClick={() => run(() => api.patchLocal(r.id, { disabled: !r.disabled }), r.disabled ? "Enabled." : "Disabled. They are signed out.")}>{r.disabled ? "Enable" : "Disable"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
