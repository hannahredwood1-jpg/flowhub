"use client";
import { useEffect, useRef, useState } from "react";
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


/** Animated order-book style background: glowing liquidity bands, a drifting price line and trade bubbles. Decorative only. */
function MarketBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, alive = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    type Band = { y: number; t: number; k: number; hue: number; ph: number; sp: number };
    const bands: Band[] = Array.from({ length: 16 }, () => ({ y: Math.random(), t: rnd(6, 34), k: rnd(0.3, 0.95), hue: Math.random() < 0.6 ? 24 : 212, ph: rnd(0, 6.28), sp: rnd(0.2, 0.9) }));
    const SPEED = 38; // pixels per second the picture scrolls left
    let py = 0.5, vel = 0, x0 = 0;
    const path: { x: number; y: number }[] = [];
    type Bub = { x: number; y: number; r: number; up: boolean; life: number };
    const bubs: Bub[] = [];
    const tip = () => w * 0.72;
    const step = (dt: number) => {
      vel += rnd(-0.0006, 0.0006) * (dt * 60); vel *= 0.985; py += vel * (dt * 60);
      if (py < 0.18 || py > 0.82) vel *= -0.6; py = Math.min(0.85, Math.max(0.15, py));
      for (const p of path) p.x -= SPEED * dt; for (const b of bubs) { b.x -= SPEED * dt; b.life += dt; }
      path.push({ x: tip(), y: py * h });
      while (path.length && path[0].x < -20) path.shift();
      if (Math.random() < dt * 5) bubs.push({ x: tip(), y: py * h + rnd(-10, 10), r: rnd(3, 16), up: vel > 0 ? Math.random() < 0.7 : Math.random() < 0.3, life: 0 });
      while (bubs.length && (bubs[0].x < -40 || bubs[0].life > 14)) bubs.shift();
      x0 += dt;
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const b of bands) {
        const a = b.k * (0.55 + 0.45 * Math.sin(x0 * b.sp + b.ph)), y = b.y * h;
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, `hsla(${b.hue},95%,55%,0)`); g.addColorStop(0.3, `hsla(${b.hue},95%,55%,${a * 0.5})`); g.addColorStop(0.75, `hsla(${b.hue},95%,60%,${a})`); g.addColorStop(1, `hsla(${b.hue},95%,60%,0)`);
        ctx.fillStyle = g; ctx.fillRect(0, y - b.t / 2, w, b.t);
      }
      for (const b of bubs) {
        const c = b.up ? "62,224,161" : "255,93,115", fade = Math.max(0, 1 - b.life / 14);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fillStyle = `rgba(${c},${0.16 * fade})`; ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(${c},${0.55 * fade})`; ctx.stroke();
      }
      if (path.length > 1) {
        ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.shadowColor = "rgba(255,138,43,.9)"; ctx.shadowBlur = 26; ctx.strokeStyle = "rgba(255,170,90,.95)"; ctx.lineWidth = 2.2; ctx.stroke();
        const e = path[path.length - 1]; ctx.beginPath(); ctx.arc(e.x, e.y, 4, 0, 6.283); ctx.fillStyle = "#fff"; ctx.fill();
        ctx.restore();
      }
    };
    // warm the scene up so it is full from the first frame
    for (let i = 0; i < 1500; i++) step(1 / 60);
    draw();
    if (!reduce) {
      let last = performance.now();
      const loop = (t: number) => { if (!alive) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; step(dt); draw(); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

// The sign-in screen is always dark, whatever theme the app uses.
const DARK_CH: Record<string, string> = { void: "7 9 12", abyss: "10 12 16", panel: "13 16 20", "panel-2": "18 22 28", line: "27 33 41", "line-2": "42 50 61", ink: "234 238 243", "ink-2": "163 173 186", "ink-3": "107 118 132", ice: "140 196 255", "ice-dim": "59 95 134", win: "62 224 161", loss: "255 93 115" };
// both the channel variables (Tailwind classes) and the resolved colours (the .btn and .field styles) are set here
const DARK_VARS = Object.assign({ colorScheme: "dark" }, ...Object.entries(DARK_CH).flatMap(([k, v]) => [{ [`--ch-${k}`]: v }, { [`--color-${k}`]: `rgb(${v})` }])) as React.CSSProperties;

export function LoginScreen({ action, notice, onLocal }: { action: (fd: FormData) => void | Promise<void>; notice?: string; onLocal?: (u: string, p: string) => Promise<string | undefined> }) {
  return (
    <main className="relative grid min-h-dvh grid-rows-[auto_1fr] overflow-hidden bg-[#06080b] text-ink" style={DARK_VARS}>
      <MarketBackdrop />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_40%,transparent,rgba(6,8,11,.65)_75%)]" aria-hidden />
      <header className="relative z-10"><div className="mx-auto flex h-14 max-w-[1200px] items-center px-4 sm:px-6"><Logo onDark /></div></header>
      <div className="relative z-10 mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="grid max-w-xl gap-5">
          <div className="label !uppercase tracking-[0.06em]">Trading School</div>
          <h1 className="text-[clamp(34px,5.5vw,54px)] font-semibold leading-[1.05] tracking-[-0.02em] drop-shadow-[0_2px_24px_rgba(0,0,0,.6)]">Learn to read the market, <span className="bg-gradient-to-r from-[#ff6a00] to-[#ffb36b] bg-clip-text text-transparent">one lesson at a time.</span></h1>
          <p className="text-[17px] leading-relaxed text-ink-2">A step-by-step school for new traders: the basics, then orderflow, then three strategies. Practice, quizzes and a coach who can see how you are doing.</p>
        </section>
        <section className="grid gap-4 rounded-2xl border border-white/10 bg-[rgba(10,12,16,.72)] p-7 shadow-[0_20px_80px_rgba(0,0,0,.55)] backdrop-blur-md">
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
