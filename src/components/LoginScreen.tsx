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
  if (!open) return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <button type="button" onClick={() => setOpen(true)} className="btn !h-12 w-full !text-[15px] !text-ink">No Discord? Sign in with email</button>
    </div>
  );
  return (
    <form className="grid gap-3 rounded-lg border border-line bg-panel p-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(await onLocal(u, p)); setBusy(false); }}>
      <div className="flex items-center justify-between"><div className="label">Sign in with email</div><button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-3 underline underline-offset-4 hover:text-ink-2">Back</button></div>
      <input className="border border-line-2 bg-panel px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ice-dim" placeholder="Email or username" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} />
      <input className="border border-line-2 bg-panel px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ice-dim" placeholder="Password" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
      {err && <p role="alert" className="border-l-2 border-loss bg-loss/10 px-3 py-2 text-sm text-loss">{err}</p>}
      <button type="submit" disabled={busy || !u || !p} className="btn-primary px-4 py-2.5 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      <button type="button" className="text-left text-sm text-ink-3 underline underline-offset-4 hover:text-ink-2" onClick={async () => { if (!u.includes("@")) { setErr("Type your email address above, then press this again."); return; } await fetch("/auth/local/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u }) }); setErr("If that email has an account, a link to choose a new password is on its way."); }}>Forgot password?</button>
      <p className="text-xs text-ink-3">Your coach sets up this login for you and emails you a link to choose a password. Ask them if you do not have one.</p>
    </form>
  );
}


const CANDLES: [number, number, number, number][] = [
  // [open, close, high, low] on a 0..100 scale (higher = higher price)
  [62, 55, 66, 50], [55, 47, 58, 42], [47, 40, 50, 34], [40, 33, 43, 27], [33, 28, 36, 20], [28, 36, 38, 18], [36, 44, 47, 33],
  [44, 41, 48, 38], [41, 52, 55, 39], [52, 61, 64, 50], [61, 58, 65, 54], [58, 70, 73, 56], [70, 78, 81, 68],
];
function HeroChart() {
  const W = 520, H = 210, left = 14, step = (W - left * 2) / CANDLES.length, y = (v: number) => H - 52 - v * 1.7;
  const cvd = CANDLES.map((c, i) => [left + step * i + step / 2, H - 10 - (c[1] - 20) * 0.28] as const);
  return (
    <figure className="fh-hero relative overflow-hidden rounded-xl border border-line bg-panel p-4 shadow-sm" aria-label="An animated example of a price chart">
      <style>{`
        .fh-hero svg .c{transform-box:fill-box;transform-origin:center bottom;animation:fhGrow .55s cubic-bezier(.2,.8,.2,1) both}
        .fh-hero svg .l{stroke-dasharray:640;stroke-dashoffset:640;animation:fhDraw 2.4s .5s ease-out forwards}
        .fh-hero .chip{animation:fhFloat 4.5s ease-in-out infinite}
        .fh-hero .pulse{animation:fhPulse 1.8s ease-out infinite;transform-box:fill-box;transform-origin:center}
        .fh-glow{background:radial-gradient(60% 60% at 20% 10%,rgb(255 106 0/.16),transparent 70%),radial-gradient(50% 60% at 90% 90%,rgb(27 102 194/.16),transparent 70%)}
        @keyframes fhGrow{from{transform:scaleY(0);opacity:0}to{transform:none;opacity:1}}
        @keyframes fhDraw{to{stroke-dashoffset:0}}
        @keyframes fhFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes fhPulse{0%{transform:scale(.8);opacity:.9}100%{transform:scale(2.6);opacity:0}}
        @media (prefers-reduced-motion:reduce){.fh-hero svg .c,.fh-hero svg .l,.fh-hero .chip,.fh-hero .pulse{animation:none!important}.fh-hero svg .l{stroke-dashoffset:0}}
      `}</style>
      <div className="fh-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="mb-2 flex items-center justify-between text-xs text-ink-3"><span className="font-medium text-ink-2">NQ · 1 minute · practice data</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-win" />Buyers take over</span></div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="presentation">
          {[0, 1, 2, 3].map((i) => <line key={i} x1={left} x2={W - left} y1={30 + i * 40} y2={30 + i * 40} stroke="var(--color-line)" strokeDasharray="3 5" />)}
          {CANDLES.map((c, i) => {
            const x = left + step * i + step / 2, up = c[1] >= c[0], col = up ? "var(--color-win)" : "var(--color-loss)", top = y(Math.max(c[0], c[1])), bot = y(Math.min(c[0], c[1]));
            return (
              <g key={i} className="c" style={{ animationDelay: `${i * 0.12}s` }}>
                <line x1={x} x2={x} y1={y(c[2])} y2={y(c[3])} stroke={col} strokeWidth="1.6" />
                <rect x={x - step * 0.28} y={top} width={step * 0.56} height={Math.max(3, bot - top)} rx="2" fill={col} />
              </g>
            );
          })}
          <polyline className="l" points={cvd.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--color-ice)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={cvd[cvd.length - 1][0]} cy={cvd[cvd.length - 1][1]} r="4" fill="var(--color-ice)" />
          <circle className="pulse" cx={cvd[cvd.length - 1][0]} cy={cvd[cvd.length - 1][1]} r="4" fill="var(--color-ice)" />
        </svg>
        <div className="chip absolute left-[8%] top-[17%] rounded-md border border-line bg-panel/95 px-2 py-1 text-[11px] font-medium text-ink shadow-sm">Sellers absorbed</div>
        <div className="chip absolute right-[6%] top-[14%] rounded-md border border-line bg-panel/95 px-2 py-1 text-[11px] font-medium text-win shadow-sm" style={{ animationDelay: "1.2s" }}>Delta +184</div>
      </div>
    </figure>
  );
}

function PathSteps() {
  const steps = [["1", "Foundations", "10 lessons", "var(--color-signal)"], ["2", "Orderflow", "11 lessons", "var(--color-ice)"], ["3", "Strategies", "LUMEN · INVERTIX · ECHO x ORBIT", "var(--color-win)"]] as const;
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map(([n, t, d, c]) => (
        <li key={n} className="rounded-lg border border-line bg-panel p-3 transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full text-xs font-bold text-white" style={{ background: c }}>{n}</span><span className="text-sm font-semibold text-ink">{t}</span></div>
          <div className="mt-1 text-xs text-ink-3">{d}</div>
        </li>
      ))}
    </ol>
  );
}

export function LoginScreen({ action, notice, onLocal }: { action: (fd: FormData) => void | Promise<void>; notice?: string; onLocal?: (u: string, p: string) => Promise<string | undefined> }) {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr]">
      <header className="bg-[#0b0d10] text-white"><div className="mx-auto flex h-14 max-w-[1200px] items-center px-4 sm:px-6"><Logo onDark /></div></header>
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="grid max-w-xl gap-5">
          <div className="label !uppercase tracking-[0.06em]">Trading School</div>
          <h1 className="text-[clamp(32px,5vw,46px)] font-semibold leading-[1.1] tracking-[-0.02em]">Learn to read the market, <span className="bg-gradient-to-r from-[var(--color-signal)] to-[#ffa24d] bg-clip-text text-transparent">one lesson at a time.</span></h1>
          <p className="text-[17px] leading-relaxed text-ink-2">A step-by-step school for new traders: the basics, then orderflow, then three strategies. Practice, quizzes and a coach who can see how you are doing.</p>
          <HeroChart />
          <PathSteps />
          <ul className="grid gap-2 text-[15px] text-ink-2">
            <li>• Start from zero. Every term is explained in plain words.</li>
            <li>• Interactive charts you can play, pause and explore.</li>
            <li>• Your plan, journal and prop firm tracker in the same place.</li>
          </ul>
        </section>
        <section className="card-lite grid gap-4 rounded-xl border border-line bg-panel p-7 shadow-sm">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="text-[14.5px] text-ink-2">Use your FLOWMTD Discord account if you have one. We only read your name, avatar and your roles in the server. No Discord? Use the email button below.</p>
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
