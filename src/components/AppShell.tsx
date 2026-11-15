"use client";
import { useEffect, useState } from "react";
import type { PersonDTO } from "@/lib/types";
import { Avatar, cx } from "./ui";
import { IconLogout } from "./icons";
import { MobileMenu } from "./MobileMenu";

/** FLOWHUB wordmark: heavy wordmark with the orange F. `onDark` keeps it white on the black top bar. */
export function Logo({ size = "sm", onDark = false }: { size?: "sm" | "lg"; onDark?: boolean }) {
  const big = size === "lg";
  return (
    <div className="inline-grid leading-none" aria-label="FLOWHUB by FLOWMTD Trading">
      <span className={cx("brand", big ? "text-[clamp(40px,7vw,60px)]" : "text-[20px]", onDark && "text-white")} aria-hidden="true">
        <span className="brand-f">F</span>LOWHUB
      </span>
      {big && <span className="brand-sub mt-1.5 text-[13px] text-ink-3" aria-hidden="true">by FLOWMTD Trading</span>}
    </div>
  );
}

/** Light / dark switch. The choice is saved in the browser and shared with the school pages. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  const flip = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("fh-theme", next); } catch { /* private mode */ }
    setDark(!dark);
  };
  return (
    <button type="button" onClick={flip} className={cx("grid h-8 w-8 place-items-center rounded-md text-[#a9b2be] transition-colors hover:bg-white/10 hover:text-white", className)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light theme" : "Dark theme"}>
      {dark
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>}
    </button>
  );
}

export function AppShell({ viewer, active, children, links = { plan: "/plan", school: "/school.html", coach: "/coach" }, signOutHref = "/api/auth/signout" }: {
  viewer: PersonDTO; active: "home" | "dashboard" | "plan" | "school" | "practice" | "stats" | "coach"; children: React.ReactNode; links?: { home?: string; dashboard?: string; plan: string; school?: string; practice?: string; stats?: string; coach: string }; signOutHref?: string;
}) {
  const staff = viewer.role === "COACH" || viewer.role === "ADMIN";
  const tab = (href: string, key: typeof active, text: string) => (
    <a
      href={href}
      className={cx("relative flex h-full items-center px-3.5 text-[14px] font-medium transition-colors", active === key ? "text-white" : "text-[#a9b2be] hover:text-white")}
      aria-current={active === key ? "page" : undefined}
    >
      {text}
      {active === key && <span className="absolute inset-x-3.5 bottom-0 h-[2px] bg-signal" />}
    </a>
  );
  const items = [
    ...(links.school ? [{ href: links.school, label: "Trading School", active: active === "school" }] : []),
    ...(links.practice ? [{ href: links.practice, label: "Practice", active: active === "practice" }] : []),
    { href: links.plan, label: "Trading Plan", active: active === "plan" },
    ...(links.stats ? [{ href: links.stats, label: "Stats", active: active === "stats" }] : []),
    ...(staff ? [{ href: links.coach, label: "Coach Portal", active: active === "coach" }] : []),
  ];
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-[#0b0d10] text-white">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-x-8 px-4 sm:px-6">
          <a href={links.school ?? "/"} aria-label="FLOWHUB, Trading School"><Logo onDark /></a>
          <nav className="hidden h-full items-center md:flex">
            {items.map((i) => <span key={i.label} className="h-full">{tab(i.href, ({ "Trading School": "school", Practice: "practice", "Trading Plan": "plan", Stats: "stats", "Coach Portal": "coach" } as const)[i.label as "Stats"], i.label)}</span>)}
          </nav>
          <MobileMenu className="ml-auto" signOutHref={signOutHref} items={items} />
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-[13.5px]">{viewer.name}</div>
              <div className="text-[11.5px] text-[#8793a3]">{viewer.role === "ADMIN" ? "Admin" : viewer.role === "COACH" ? "Trading Coach" : "Member"}</div>
            </div>
            <Avatar src={viewer.avatarUrl} name={viewer.name} size={30} />
            <a href={signOutHref} className="grid h-8 w-8 place-items-center rounded-md text-[#a9b2be] hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out"><IconLogout /></a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
