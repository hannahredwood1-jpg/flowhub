"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Logo } from "./AppShell";
import { IconDiscord } from "./icons";
import { cx } from "./ui";

function ConnectButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary !h-12 w-full !text-[15px]" disabled={pending}>
      <IconDiscord size={20} />
      {pending ? "Connecting…" : "Continue with Discord"}
    </button>
  );
}

function LocalLogin({ onLocal }: { onLocal: (u: string, p: string) => Promise<string | undefined> }) {
  const [open, setOpen] = useState(false);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="max-w-md text-left text-sm text-ink-3 underline underline-offset-4 hover:text-ink-2">Sign in without Discord</button>;
  return (
    <form className="grid max-w-md gap-3 border-l border-line-2 pl-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(await onLocal(u, p)); setBusy(false); }}>
      <div className="label">Sign in without Discord</div>
      <input className="border border-line-2 bg-panel px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ice-dim" placeholder="Email or username" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} />
      <input className="border border-line-2 bg-panel px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ice-dim" placeholder="Password" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
      {err && <p role="alert" className="border-l-2 border-loss bg-loss/10 px-3 py-2 text-sm text-loss">{err}</p>}
      <button type="submit" disabled={busy || !u || !p} className="btn-primary px-4 py-2.5 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      <button type="button" className="text-left text-sm text-ink-3 underline underline-offset-4 hover:text-ink-2" onClick={async () => { if (!u.includes("@")) { setErr("Type your email address above, then press this again."); return; } await fetch("/auth/local/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u }) }); setErr("If that email has an account, a link to choose a new password is on its way."); }}>Forgot password?</button>
      <p className="text-xs text-ink-3">Your coach sets up this login for you and emails you a link. Ask them if you do not have one.</p>
    </form>
  );
}

export function LoginScreen({ action, notice, onLocal }: { action: (fd: FormData) => void | Promise<void>; notice?: string; onLocal?: (u: string, p: string) => Promise<string | undefined> }) {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr]">
      <header className="bg-[#0b0d10] text-white"><div className="mx-auto flex h-14 max-w-[1200px] items-center px-4 sm:px-6"><Logo onDark /></div></header>
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="grid max-w-xl gap-5">
          <div className="label !uppercase tracking-[0.06em]">Trading School</div>
          <h1 className="text-[clamp(32px,5vw,46px)] font-semibold leading-[1.1] tracking-[-0.02em]">Learn to read the market, one lesson at a time.</h1>
          <p className="text-[17px] leading-relaxed text-ink-2">A step-by-step school for new traders: the basics, then orderflow, then three strategies. Practice, quizzes and a coach who can see how you are doing.</p>
          <ul className="grid gap-2 text-[15px] text-ink-2">
            <li>• Start from zero. Every term is explained in plain words.</li>
            <li>• Interactive charts you can play, pause and explore.</li>
            <li>• Your plan, journal and prop firm tracker in the same place.</li>
          </ul>
        </section>
        <section className="card-lite grid gap-4 rounded-xl border border-line bg-panel p-7 shadow-sm">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="text-[14.5px] text-ink-2">Use your FLOWMTD Discord account. We only read your name, avatar and your roles in the server. No email, no messages.</p>
          <form action={action} className="grid gap-3">
            <ConnectButton />
            {notice && <p role="alert" className="rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{notice}</p>}
          </form>
          {onLocal && <LocalLogin onLocal={onLocal} />}
        </section>
      </div>
    </main>
  );
}
