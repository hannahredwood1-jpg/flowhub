"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

export type MenuItem = { href: string; label: string; active?: boolean };

/** Phone-only dropdown: one button that opens the same links as the desktop nav. Hidden from the `md` breakpoint up. */
export function MobileMenu({ items, signOutHref, className }: { items: MenuItem[]; signOutHref: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", off); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", key); };
  }, [open]);
  const here = items.find((i) => i.active)?.label;
  return (
    <div ref={box} className={cx("relative md:hidden", className)}>
      <button type="button" className="btn !h-9 gap-2 !px-3" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="max-w-[9.5rem] truncate text-[13px]">{here ?? "Menu"}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={cx("transition-transform", open && "rotate-180")}><path d="M2 4.5 6 8.5 10 4.5" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(15rem,calc(100vw-2rem))] border border-line-2 bg-panel p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
          {items.map((i) => (
            <a key={i.href} role="menuitem" href={i.href} onClick={() => setOpen(false)} aria-current={i.active ? "page" : undefined}
              className={cx("flex items-center justify-between px-3 py-3 text-[15px]", i.active ? "bg-panel-2 text-ink" : "text-ink-2 active:bg-panel-2")}>
              {i.label}{i.active && <span className="h-1.5 w-1.5 rounded-full bg-signal" />}
            </a>
          ))}
          <a role="menuitem" href={signOutHref} className="mt-1 flex border-t border-line px-3 py-3 text-[15px] text-ink-3">Sign out</a>
        </div>
      )}
    </div>
  );
}
