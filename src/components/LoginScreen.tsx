"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Logo } from "./AppShell";
import { IconDiscord } from "./icons";
import { cx } from "./ui";

// ─────────────────────────────────────────────────────────────
// Session clock (ET). Futures week: Sun 18:00 → Fri 17:00 ET.
// ─────────────────────────────────────────────────────────────
const SESSIONS = [
  { name: "Asia", open: 18 * 60, close: 2 * 60 },     // 18:00 – 02:00
  { name: "London", open: 2 * 60, close: 8 * 60 },    // 02:00 – 08:00
  { name: "New York", open: 9 * 60 + 30, close: 16 * 60 }, // 09:30 – 16:00
];

function etParts(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { wd: p.weekday as string, h: +p.hour, m: +p.minute, s: +p.second };
}
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Minutes since Sunday 00:00 ET */
const weekMin = (wd: string, h: number, m: number) => DAYS.indexOf(wd) * 1440 + h * 60 + m;
const marketOpen = (wm: number) => wm >= 18 * 60 && wm < 5 * 1440 + 17 * 60 && !(wm % 1440 >= 17 * 60 && wm % 1440 < 18 * 60);

function sessionState(now: Date) {
  const { wd, h, m, s } = etParts(now);
  const wm = weekMin(wd, h, m);
  const tod = h * 60 + m;
  const open = marketOpen(wm);
  const rows = SESSIONS.map((ss) => {
    const inWindow = ss.open < ss.close ? tod >= ss.open && tod < ss.close : tod >= ss.open || tod < ss.close;
    return { name: ss.name, live: open && inWindow };
  });
  // next session open, scanning forward minute by minute (max 3 days)
  let next: { name: string; mins: number } | null = null;
  for (let i = 1; i < 3 * 1440 && !next; i++) {
    const w = (wm + i) % (7 * 1440);
    const t = w % 1440;
    const hit = SESSIONS.find((ss) => ss.open === t);
    if (hit && marketOpen(w)) next = { name: hit.name, mins: i };
  }
  const clock = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return { clock, wd, rows, next, open };
}

function SessionStrip() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const st = now ? sessionState(now) : null;
  return (
    <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
      <div>
        <div className="label">New York time</div>
        <div className="num mt-1 text-2xl leading-none tracking-tight">{st?.clock ?? "--:--:--"}<span className="ml-2 text-xs text-ink-3">{st?.wd ?? ""} ET</span></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(st?.rows ?? SESSIONS.map((s) => ({ name: s.name, live: false }))).map((r) => (
          <div key={r.name} className={cx("min-w-0 border px-3 py-2", r.live ? "border-ice-dim bg-ice/[0.06]" : "border-line")}>
            <div className="label">{r.name}</div>
            <div className={cx("mt-1 flex items-center gap-1.5 text-sm", r.live ? "text-ice" : "text-ink-3")}>
              <span className={cx("h-1.5 w-1.5", r.live ? "live-dot !bg-ice" : "bg-ink-3")} />
              {r.live ? "Live" : "Closed"}
            </div>
          </div>
        ))}
      </div>
      {st?.next && (
        <p className="text-xs text-ink-3 sm:col-span-2">
          Next session: <span className="text-ink-2">{st.next.name}</span> opens in <span className="num text-ink-2">{Math.floor(st.next.mins / 60)}h {st.next.mins % 60}m</span>
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Uplink reticle
// ─────────────────────────────────────────────────────────────
function Reticle({ linking }: { linking: boolean }) {
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  return (
    <div className={cx("relative mx-auto aspect-square w-full max-w-[440px]", linking && "fast")}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" role="img" aria-label="Uplink scanner">
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9ccbff" stopOpacity="0.16" />
            <stop offset="70%" stopColor="#9ccbff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#9ccbff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9ccbff" stopOpacity="0" />
            <stop offset="100%" stopColor="#9ccbff" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="196" fill="url(#core)" />

        {/* outer tick ring */}
        <g className="spin-slow">
          <circle cx="200" cy="200" r="188" fill="none" stroke="#28313e" strokeWidth="1" />
          {ticks.map((i) => (
            <line key={i} x1="200" y1="12" x2="200" y2={i % 6 === 0 ? 24 : 17} stroke={i % 18 === 0 ? "#9ccbff" : "#3b5f86"} strokeWidth={i % 6 === 0 ? 1.5 : 1} transform={`rotate(${i * 5} 200 200)`} />
          ))}
          <text x="200" y="40" textAnchor="middle" fontSize="8" fill="#58626f" fontFamily="monospace" letterSpacing="3">000°</text>
        </g>

        {/* segmented mid ring */}
        <g className="spin-mid">
          {[0, 90, 180, 270].map((a) => (
            <path key={a} d="M 200 45 A 155 155 0 0 1 309.6 90.4" fill="none" stroke="#3b5f86" strokeWidth="3" transform={`rotate(${a} 200 200)`} />
          ))}
          {[45, 135, 225, 315].map((a) => (
            <rect key={a} x="197" y="41" width="6" height="6" fill="#0a0d12" stroke="#9ccbff" strokeWidth="1" transform={`rotate(${a} 200 200)`} />
          ))}
        </g>

        {/* radar sweep */}
        <g className="sweep-arm">
          <path d="M 200 200 L 200 70 A 130 130 0 0 1 292 108 Z" fill="url(#sweep)" />
          <line x1="200" y1="200" x2="292" y2="108" stroke="#9ccbff" strokeOpacity="0.6" strokeWidth="1" />
        </g>
        <circle cx="200" cy="200" r="130" fill="none" stroke="#1a2029" strokeWidth="1" />
        <circle cx="200" cy="200" r="100" fill="none" stroke="#1a2029" strokeDasharray="2 6" />

        {/* orbiting nodes */}
        <g className="spin-fast">
          <circle cx="200" cy="85" r="3" fill="#9ccbff" />
          <circle cx="315" cy="200" r="2" fill="#929fb2" />
        </g>

        {/* crosshair */}
        <g stroke="#28313e" strokeWidth="1">
          <line x1="200" y1="150" x2="200" y2="120" /><line x1="200" y1="250" x2="200" y2="280" />
          <line x1="150" y1="200" x2="120" y2="200" /><line x1="250" y1="200" x2="280" y2="200" />
        </g>

        {/* core hex with the F */}
        <polygon points="200,152 241.6,176 241.6,224 200,248 158.4,224 158.4,176" fill="#07090c" stroke="#3b5f86" strokeWidth="1.5" />
        <polygon points="200,160 234.6,180 234.6,220 200,240 165.4,220 165.4,180" fill="none" stroke="#9ccbff" strokeOpacity="0.25" className="breathe" />
        <text x="200" y="219" textAnchor="middle" fontSize="52" fontWeight="900" fill="#ff6a00" style={{ fontFamily: "var(--font-display)" }}>F</text>
      </svg>

      {/* corner readouts */}
      <div className="label absolute left-0 top-2 !text-[8.5px]">Node · FLOWMTD</div>
      <div className="label absolute right-0 top-2 !text-[8.5px]">OAuth2 · v10</div>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className={cx("label !text-[9px]", linking ? "!text-ice" : "")}>
          Handshake · <span className={linking ? "caret" : "breathe"}>{linking ? "Establishing" : "Awaiting signal"}</span>
        </span>
      </div>
    </div>
  );
}

const BOOT = [
  ["flow engine", "online"],
  ["prop firm catalog", "90 accounts"],
  ["ASIAFLOW · NYFLOW models", "loaded"],
  ["discord uplink", "standing by"],
] as const;

function ConnectButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="connect-btn" disabled={pending}>
      <IconDiscord size={20} />
      <span className="glitch-hard">{pending ? "Connecting…" : "Connect your Discord"}</span>
    </button>
  );
}

function Linking({ onChange }: { onChange: (v: boolean) => void }) {
  const { pending } = useFormStatus();
  useEffect(() => onChange(pending), [pending, onChange]);
  return null;
}

export function LoginScreen({ action, notice }: { action: (fd: FormData) => void | Promise<void>; notice?: string }) {
  const [linking, setLinking] = useState(false);
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="grid-bg" />
      <div className="vignette" />
      <div className="horizon" />
      <div className="scanline" />

      <div className="relative mx-auto grid min-h-dvh max-w-[1240px] grid-cols-[minmax(0,1fr)] content-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16">
        {/* Left: brand + connect */}
        <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 animate-rise">
          <div className="flex items-center gap-3 text-ink-3">
            <span className="live-dot" />
            <span className="label">System ready · Members only</span>
          </div>

          <Logo size="lg" />

          <div className="grid gap-3">
            <h1 className="font-display text-[clamp(28px,4.2vw,44px)] font-black uppercase leading-[0.95] tracking-[-0.01em]">
              Connect your<br /><span className="text-ice">Discord.</span>
            </h1>
            <p className="max-w-md text-[17px] leading-relaxed text-ink-2">
              Link your FLOWMTD server account to load your prop firm plan, your daily targets and your journal. Coaches see your progress the moment you log a trade.
            </p>
          </div>

          {/* Handshake line: Discord → FLOWHUB */}
          <div className="flex max-w-md items-center gap-3" aria-hidden="true">
            <div className="grid h-10 w-10 shrink-0 place-items-center border border-line-2 bg-panel text-ink-2"><IconDiscord size={18} /></div>
            <div className={cx("relative h-px flex-1 bg-gradient-to-r from-line-2 via-ice-dim to-line-2", linking && "fast")}>
              <span className="packet" /><span className="packet" style={{ animationDelay: "0.8s" }} /><span className="packet" style={{ animationDelay: "1.6s" }} />
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center border border-ice-dim bg-panel brand text-lg"><span className="brand-f">F</span></div>
          </div>

          {/* Boot log */}
          <div className="max-w-md border-l border-line-2 pl-4 font-mono text-[12.5px] leading-7 text-ink-3">
            {BOOT.map(([k, v], i) => (
              <div key={k} className="type-line flex gap-2" style={{ animationDelay: `${250 + i * 380}ms` }}>
                <span className="text-ink-3">&gt;</span>
                <span className="text-ink-2">{k}</span>
                <span className="flex-1 overflow-hidden whitespace-nowrap text-line-2">........................................</span>
                <span className={i === BOOT.length - 1 ? "caret text-ice" : "text-win"}>{v}</span>
              </div>
            ))}
          </div>

          <form action={action} className="grid max-w-md gap-3">
            <Linking onChange={setLinking} />
            <ConnectButton />
            {notice && <p role="alert" className="border-l-2 border-loss bg-loss/10 px-3 py-2 text-sm text-loss">{notice}</p>}
            <p className="text-xs text-ink-3">
              We only read your Discord name, avatar and your roles in the FLOWMTD server. No email, no messages.
            </p>
          </form>
        </section>

        {/* Right: uplink scanner + market sessions */}
        <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 animate-rise" style={{ animationDelay: "120ms" }}>
          <Reticle linking={linking} />
          <SessionStrip />
        </section>
      </div>
    </main>
  );
}
