"use client";
import { useEffect, useRef } from "react";
import type { PaceStatus } from "@/lib/pace";
import { IconX } from "./icons";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Panel({ title, right, children, className, delay = 0 }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <section className={cx("hud animate-rise", className)} style={{ animationDelay: `${delay}ms` }}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="label !text-ink-2">{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

const STATUS: Record<PaceStatus, { text: string; color: string }> = {
  PASSED: { text: "Passed", color: "text-win" },
  AHEAD: { text: "Ahead", color: "text-win" },
  ON_PACE: { text: "On pace", color: "text-ice" },
  BEHIND: { text: "Behind", color: "text-lag" },
  AT_RISK: { text: "At risk", color: "text-loss" },
  FAILED: { text: "Failed", color: "text-loss" },
  NO_TRADES: { text: "No trades", color: "text-ink-3" },
};
export function StatusChip({ status }: { status: PaceStatus }) {
  const s = STATUS[status];
  return <span className={cx("chip", s.color)}>{s.text}</span>;
}
export const statusColor = (s: PaceStatus) => STATUS[s].color;
const BG: Record<PaceStatus, string> = { PASSED: "bg-win", AHEAD: "bg-win", ON_PACE: "bg-ice", BEHIND: "bg-lag", AT_RISK: "bg-loss", FAILED: "bg-loss", NO_TRADES: "bg-ink-3" };
export const statusBg = (s: PaceStatus) => BG[s];

/** Segmented HUD bar. value 0..1. marker = expected position. */
export function Meter({ value, marker, tone = "ice", segments = 24, label }: { value: number; marker?: number; tone?: "ice" | "win" | "loss" | "lag"; segments?: number; label?: string }) {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * segments);
  const toneBg = { ice: "bg-ice", win: "bg-win", loss: "bg-loss", lag: "bg-lag" }[tone];
  return (
    <div className="relative" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <div className="flex gap-[3px]">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className={cx("h-2.5 flex-1 skew-x-[-20deg] transition-colors duration-500", i < filled ? toneBg : "bg-line")}
            style={{ transitionDelay: `${i * 18}ms`, opacity: i < filled ? 0.35 + (0.65 * (i + 1)) / Math.max(filled, 1) : 1 }}
          />
        ))}
      </div>
      {marker != null && marker > 0 && marker < 1 && (
        <div className="absolute -top-1 bottom-[-4px] w-px bg-ink-2" style={{ left: `${marker * 100}%` }} title="Where your plan says you should be today">
          <div className="absolute -top-1 -left-[3px] h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent border-t-ink-2" />
        </div>
      )}
    </div>
  );
}

export function XPBar({ level, xp, xpToNext }: { level: number; xp: number; xpToNext: number }) {
  const start = (level - 1) * (level - 1) * 100;
  const end = level * level * 100;
  const v = (xp - start) / (end - start);
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center border border-ice-dim bg-panel-2 font-hud text-sm text-ice [clip-path:polygon(25%_0,100%_0,100%_75%,75%_100%,0_100%,0_25%)]">
        {level}
      </div>
      <div className="min-w-[120px] flex-1">
        <div className="flex justify-between">
          <span className="label">Level {level}</span>
          <span className="num text-[11px] text-ink-3">{xpToNext} XP to next</span>
        </div>
        <div className="relative mt-1 h-1.5 overflow-hidden bg-line">
          <div className="h-full bg-gradient-to-r from-ice-dim to-ice transition-[width] duration-700" style={{ width: `${v * 100}%` }} />
          <div className="absolute top-0 h-full w-[3px] bg-signal shadow-[0_0_8px_var(--color-signal)]" style={{ left: `calc(${v * 100}% - 3px)` }} />
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value, tone, sub }: { label: string; value: React.ReactNode; tone?: "win" | "loss" | "ice"; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className={cx("num mt-1 text-xl leading-none", tone === "win" && "text-win", tone === "loss" && "text-loss", tone === "ice" && "text-ice")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

/** Radial gauge for pass probability */
export function Ring({ value, label }: { value: number; label: string }) {
  const r = 30, c = 2 * Math.PI * r;
  const tone = value >= 0.7 ? "var(--color-win)" : value >= 0.45 ? "var(--color-ice)" : "var(--color-loss)";
  return (
    <div className="grid shrink-0 justify-items-center gap-1">
    <div className="relative grid h-[76px] w-[76px] place-items-center">
      <svg viewBox="0 0 76 76" className="absolute inset-0 -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-line)" strokeWidth="5" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={tone} strokeWidth="5" strokeDasharray={`${c * value} ${c}`} strokeLinecap="butt" className="transition-[stroke-dasharray] duration-1000" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="38" y1="3" x2="38" y2="7" stroke="var(--color-void)" strokeWidth="2" transform={`rotate(${i * 30} 38 38)`} />
        ))}
      </svg>
      <div className="num text-base leading-none">{Math.round(value * 100)}%</div>
    </div>
    <div className="label !text-[8.5px]">{label}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-void/80 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx("hud animate-rise w-full", wide ? "max-w-3xl" : "max-w-xl")}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-hud text-[12px] tracking-[0.16em] uppercase">{title}</h2>
          <button className="btn btn-ghost !h-8 !px-2" onClick={onClose} aria-label="Close"><IconX /></button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("grid content-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className="label !text-ink-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function ErrorLine({ error }: { error: string | null }) {
  return error ? <p role="alert" className="border-l-2 border-loss bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p> : null;
}

export function Avatar({ src, name, size = 32 }: { src: string; name: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} width={size} height={size} className="shrink-0 border border-line-2 bg-panel-2 [clip-path:polygon(20%_0,100%_0,100%_80%,80%_100%,0_100%,0_20%)]" style={{ width: size, height: size }} />;
}
