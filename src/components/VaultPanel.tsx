"use client";
// Coach portal: who can open the ECHO X ORBIT vault. Hannah issues a one-time code to a mentorship member; the code is shown once.
import { useEffect, useState } from "react";
import { api, type VaultRow } from "@/lib/api-client";
import { ErrorLine, Panel, cx } from "./ui";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "");

export function VaultPanel({ isAdmin }: { isAdmin: boolean }) {
  const [show, setShow] = useState(false);
  const [rows, setRows] = useState<VaultRow[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ name: string; code: string } | null>(null);
  const [mark, setMark] = useState<Record<string, boolean>>({});

  const load = () => api.vaultList().then(setRows, (e) => setError(e.message));
  useEffect(() => { if (show && !rows) load(); }, [show, rows]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id); setError(null);
    try { await fn(); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const issue = (r: VaultRow) => act(r.id, async () => { const { code } = await api.vaultCode(r.id, !!mark[r.id]); setFresh({ name: r.name, code }); });
  const list = (rows ?? []).filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
  const label: Record<VaultRow["code"], string> = { none: "No code", issued: "Code issued", opened: "Opened", revoked: "Revoked" };

  return (
    <Panel title="ECHO X ORBIT vault · access" right={<button className="btn btn-ghost !h-7 !px-2 text-xs" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>}>
      {show && (
        <div className="grid gap-3 p-4">
          <p className="text-xs text-ink-3">The vault is its own page, served only to members you approve: a mentorship role (or the flag below) plus a one-time code you generate here. A code works once, only for that member, and only its hash is kept.</p>
          {fresh && (
            <div className="border border-signal/60 bg-signal/[0.06] p-3">
              <div className="label !text-signal">Code for {fresh.name}: shown once</div>
              <div className="num mt-1 text-2xl tracking-widest">{fresh.code}</div>
              <p className="mt-1 text-xs text-ink-3">Send it to them privately on Discord. It is not stored anywhere you can read it again.</p>
              <div className="mt-2 flex gap-2"><button className="btn !h-7 !px-2 text-xs" onClick={() => navigator.clipboard?.writeText(fresh.code)}>Copy</button><button className="btn btn-ghost !h-7 !px-2 text-xs" onClick={() => setFresh(null)}>Done</button></div>
            </div>
          )}
          <ErrorLine error={error} />
          <input className="field !h-8 text-sm" placeholder="Find a member" value={q} onChange={(e) => setQ(e.target.value)} />
          {!rows ? <p className="text-sm text-ink-3">Loading…</p> : (
            <div className="grid gap-1">
              {list.map((r) => (
                <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-1.5 text-sm">
                  <div className="min-w-0">
                    <span className="truncate">{r.name}</span>
                    <span className="ml-2 text-xs text-ink-3">{r.mentorship ? "mentorship role" : r.override ? "marked mentorship" : ""}</span>
                    <div className="text-xs text-ink-3">
                      <span className={cx(r.code === "opened" && "text-win", r.code === "revoked" && "text-loss")}>{label[r.code]}{r.hint ? ` · …${r.hint}` : ""}{r.code === "opened" ? ` · ${when(r.redeemedAt)}` : r.issuedAt ? ` · ${when(r.issuedAt)}` : ""}</span>
                      {r.code === "opened" && <span> · {r.passed} of 9 modules passed</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {!r.mentorship && !r.override && (
                      <label className="flex items-center gap-1 text-xs text-ink-3"><input type="checkbox" checked={!!mark[r.id]} onChange={(e) => setMark({ ...mark, [r.id]: e.target.checked })} />Mark as mentorship</label>
                    )}
                    <button className="btn btn-primary !h-7 !px-2 text-xs" disabled={busy === r.id || (!r.mentorship && !r.override && !mark[r.id])} onClick={() => issue(r)}>{r.code === "none" ? "Generate code" : "New code"}</button>
                    {(r.code === "issued" || r.code === "opened") && <button className="btn btn-ghost !h-7 !px-2 text-xs" disabled={busy === r.id} onClick={() => act(r.id, () => api.vaultRevoke(r.id))}>Revoke</button>}
                    {isAdmin && r.code === "opened" && (
                      <button className={cx("btn !h-7 !px-2 text-xs", r.orderflow ? "btn-ghost" : "")} disabled={busy === r.id} onClick={() => act(r.id, () => api.vaultOrderflow(r.id, !r.orderflow))}>{r.orderflow ? "Close Orderflow" : "Open Orderflow"}</button>
                    )}
                  </div>
                </div>
              ))}
              {!list.length && <p className="text-sm text-ink-3">No members match.</p>}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
