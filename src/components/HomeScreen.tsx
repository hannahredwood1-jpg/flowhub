"use client";
import { useEffect, useRef } from "react";
import type { PersonDTO } from "@/lib/types";
import { Logo } from "./AppShell";

const SIGNAL = "255,106,0", ICE = "140,196,255";
const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** The landing animation: a network shaped like a brain with signals travelling through it, candles drifting past and a P&L line drawing itself. */
function useBrain(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const cx = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, W = 0, H = 0, R = 0, ox = 0, oy = 0;
    type Node = { x: number; y: number; ph: number };
    let nodes: Node[] = [], edges: [number, number][] = [], adj: number[][] = [];
    let pulses: { e: number; from: number; t: number; v: number }[] = [];
    let candles: { x: number; y: number; w: number; b: number; wick: number; up: boolean; v: number }[] = [];
    let pnl: number[] = [];
    const build = () => {
      const r = mulberry(7);
      R = Math.min(W * 0.34, H * 0.32); ox = W / 2; oy = H * 0.37;
      nodes = [];
      for (const s of [-1, 1]) {
        let n = 0;
        while (n < 120) {
          const a = r() * Math.PI * 2, d = Math.sqrt(r()), ex = Math.cos(a) * d * R * 0.62, ey = Math.sin(a) * d * R * 0.8;
          const x = ox + s * R * 0.5 + ex, y = oy + ey - (ey > 0 ? Math.abs(ex) * 0.18 : 0);
          if (Math.abs(x - ox) < R * 0.045) continue;
          nodes.push({ x, y, ph: r() * 6.28 }); n++;
        }
      }
      for (let i = 0; i < 9; i++) nodes.push({ x: ox + (r() - 0.5) * R * 0.22, y: oy + R * (0.62 + i * 0.05), ph: r() * 6.28 });
      edges = []; adj = nodes.map(() => []);
      const seen = new Set<string>();
      nodes.forEach((a, i) => {
        nodes.map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) })).filter((o) => o.j !== i).sort((p, q) => p.d - q.d).slice(0, 4).forEach((o) => {
          const k = i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`;
          if (o.d < R * 0.3 && !seen.has(k)) { seen.add(k); edges.push([i, o.j]); adj[i].push(edges.length - 1); adj[o.j].push(edges.length - 1); }
        });
      });
      pulses = Array.from({ length: 22 }, () => ({ e: Math.floor(r() * edges.length), from: r() < 0.5 ? 0 : 1, t: r(), v: 0.006 + r() * 0.012 }));
      candles = Array.from({ length: 11 }, () => ({ x: r() * W, y: r() * H, w: 7 + r() * 5, b: 10 + r() * 22, wick: 6 + r() * 10, up: r() < 0.5, v: 0.12 + r() * 0.3 }));
      let v = 0; pnl = Array.from({ length: 140 }, () => (v += (r() - 0.4) * 1.1));
    };
    const resize = () => {
      const d = Math.min(2, devicePixelRatio || 1), b = cv.getBoundingClientRect();
      W = b.width; H = b.height; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); build();
    };
    const frame = (ms: number) => {
      const t = ms / 1000;
      cx.clearRect(0, 0, W, H);
      const g = cx.createRadialGradient(ox, oy, 0, ox, oy, R * 1.5);
      g.addColorStop(0, `rgba(${ICE},0.07)`); g.addColorStop(0.6, `rgba(${SIGNAL},0.025)`); g.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      // drifting candles
      for (const c of candles) {
        if (!reduce) { c.y -= c.v; if (c.y < -50) { c.y = H + 40; c.x = Math.random() * W; } }
        cx.globalAlpha = 0.22; cx.fillStyle = c.up ? "#e6ebf2" : "#3d7bff"; cx.strokeStyle = cx.fillStyle; cx.lineWidth = 1.2;
        cx.beginPath(); cx.moveTo(c.x, c.y - c.wick); cx.lineTo(c.x, c.y + c.b + c.wick); cx.stroke(); cx.fillRect(c.x - c.w / 2, c.y, c.w, c.b);
      }
      cx.globalAlpha = 1;
      // brain network (breathes slowly)
      const k = 1 + Math.sin(t * 0.8) * 0.006;
      cx.save(); cx.translate(ox, oy); cx.scale(k, k); cx.translate(-ox, -oy);
      cx.lineWidth = 1.4; cx.strokeStyle = `rgba(${ICE},0.16)`;
      for (const sg of [-1, 1]) { cx.beginPath(); cx.ellipse(ox + sg * R * 0.5, oy, R * 0.66, R * 0.84, sg * 0.12, 0, 6.283); cx.stroke(); }
      cx.lineWidth = 1; cx.strokeStyle = `rgba(${ICE},0.14)`;
      cx.beginPath(); for (const [a, b] of edges) { cx.moveTo(nodes[a].x, nodes[a].y); cx.lineTo(nodes[b].x, nodes[b].y); } cx.stroke();
      for (const n of nodes) { const a = 0.35 + 0.35 * Math.sin(t * 1.4 + n.ph); cx.fillStyle = `rgba(${ICE},${a})`; cx.beginPath(); cx.arc(n.x, n.y, 1.8, 0, 6.283); cx.fill(); }
      for (const p of pulses) {
        if (!reduce) p.t += p.v;
        if (p.t >= 1) { const end = edges[p.e][p.from === 0 ? 1 : 0], opts = adj[end].filter((e) => e !== p.e), e = opts.length ? opts[Math.floor(Math.random() * opts.length)] : p.e; p.from = edges[e][0] === end ? 0 : 1; p.e = e; p.t = 0; }
        const [a, b] = p.from === 0 ? edges[p.e] : [edges[p.e][1], edges[p.e][0]], x = nodes[a].x + (nodes[b].x - nodes[a].x) * p.t, y = nodes[a].y + (nodes[b].y - nodes[a].y) * p.t;
        const gl = cx.createRadialGradient(x, y, 0, x, y, 10); gl.addColorStop(0, `rgba(${SIGNAL},0.95)`); gl.addColorStop(1, `rgba(${SIGNAL},0)`);
        cx.fillStyle = gl; cx.beginPath(); cx.arc(x, y, 10, 0, 6.283); cx.fill();
      }
      cx.restore();
      // P&L line drawing itself along the bottom
      const top = H * 0.52, h = H * 0.14, n = pnl.length, lo = Math.min(...pnl), hi = Math.max(...pnl), prog = reduce ? 1 : ((t * 0.07) % 1.4);
      const m = Math.min(n - 1, Math.floor(prog * n)), X = (i: number) => (i / (n - 1)) * W, Y = (v: number) => top + h - ((v - lo) / (hi - lo || 1)) * h;
      if (m > 1) {
        cx.beginPath(); cx.moveTo(X(0), Y(pnl[0])); for (let i = 1; i <= m; i++) cx.lineTo(X(i), Y(pnl[i]));
        const lg = cx.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, `rgba(${ICE},0.05)`); lg.addColorStop(1, `rgba(${SIGNAL},0.75)`);
        cx.strokeStyle = lg; cx.lineWidth = 1.6; cx.stroke();
        cx.lineTo(X(m), top + h); cx.lineTo(X(0), top + h); cx.closePath(); cx.fillStyle = `rgba(${SIGNAL},0.035)`; cx.fill();
        cx.fillStyle = `rgba(${SIGNAL},0.95)`; cx.beginPath(); cx.arc(X(m), Y(pnl[m]), 3, 0, 6.283); cx.fill();
        cx.font = "500 11px JetBrains Mono, monospace"; cx.fillStyle = `rgba(${ICE},0.55)`; cx.fillText(`P&L ${pnl[m] >= 0 ? "+" : "−"}$${Math.abs(Math.round(pnl[m] * 96)).toLocaleString()}`, Math.min(W - 110, X(m) + 10), Y(pnl[m]) - 10);
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [ref]);
}

const ITEMS: { href: string; n: string; t: string; d: string }[] = [
  { href: "#dashboard", n: "01", t: "My Dashboard", d: "Accounts, drawdown, targets and your journal." },
  { href: "#plan", n: "02", t: "My Trading Plan", d: "Your plan, your numbers, your daily checklist." },
  { href: "/school", n: "03", t: "Trading School", d: "Learn it, apply it on a chart, prove it." },
  { href: "/practice", n: "04", t: "Practice", d: "Endless generated charts with instant feedback." },
];

export function HomeScreen({ viewer, signOutHref = "/auth/logout" }: { viewer: PersonDTO; signOutHref?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useBrain(ref);
  const first = (viewer.name || "").split(/\s+/)[0] || "trader";
  return (
    <main className="relative min-h-dvh overflow-hidden bg-void">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[1100px] flex-col px-4 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <Logo />
          <a href={signOutHref} className="text-sm text-ink-3 underline underline-offset-4 hover:text-ink-2">Sign out</a>
        </header>
        <div className="mt-auto pb-6 pt-[46vh] text-center">
          <div className="label !text-ice">Welcome back</div>
          <h1 className="mt-2 font-display text-[clamp(28px,5vw,46px)] font-extrabold leading-tight">{first}. Where to?</h1>
        </div>
        <nav className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="FLOWHUB">
          {ITEMS.map((i) => (
            <a key={i.href} href={i.href} className="group relative border border-line-2 bg-panel/80 p-4 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-signal hover:bg-panel-2">
              <span className="font-mono text-[11px] text-ink-3 transition-colors group-hover:text-signal">{i.n}</span>
              <span className="mt-1 flex items-center justify-between text-[17px] font-semibold text-ink">{i.t}<span aria-hidden="true" className="text-ink-3 transition-all group-hover:translate-x-1 group-hover:text-signal">→</span></span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-2">{i.d}</span>
            </a>
          ))}
        </nav>
      </div>
    </main>
  );
}
