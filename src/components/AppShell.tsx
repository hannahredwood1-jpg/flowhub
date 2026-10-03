import type { PersonDTO } from "@/lib/types";
import { Avatar, cx } from "./ui";
import { IconLogout } from "./icons";

/** FLOWHUB wordmark in the FLOWMTD style: heavy white caps, orange F, italic sub-line. */
export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="inline-grid leading-none" aria-label="FLOWHUB by FLOWMTD Trading">
      <span className={big ? "brand text-[clamp(44px,9vw,76px)]" : "brand text-[21px]"} aria-hidden="true">
        <span className="brand-f">F</span>LOWHUB
      </span>
      <span className={big ? "brand-sub mt-1.5 justify-self-end text-[clamp(11px,2vw,15px)] text-ink-2" : "brand-sub mt-0.5 justify-self-end text-[8.5px] text-ink-3"} aria-hidden="true">
        by FLOWMTD Trading
      </span>
    </div>
  );
}

export function AppShell({ viewer, active, children, links = { dashboard: "/dashboard", plan: "/plan", school: "/school.html", coach: "/coach" }, signOutHref = "/api/auth/signout" }: {
  viewer: PersonDTO; active: "dashboard" | "plan" | "school" | "practice" | "coach"; children: React.ReactNode; links?: { dashboard: string; plan: string; school?: string; practice?: string; coach: string }; signOutHref?: string;
}) {
  const staff = viewer.role === "COACH" || viewer.role === "ADMIN";
  const tab = (href: string, key: typeof active, text: string) => (
    <a
      href={href}
      className={cx(
        "relative px-3 py-2 font-hud text-[10.5px] tracking-[0.16em] uppercase transition-colors",
        active === key ? "text-ink" : "text-ink-3 hover:text-ink-2",
      )}
      aria-current={active === key ? "page" : undefined}
    >
      {text}
      {active === key && <span className="absolute inset-x-3 -bottom-[13px] h-[2px] bg-ice"><span className="absolute left-0 top-0 h-full w-2 bg-signal" /></span>}
    </a>
  );
  return (
    <div className="min-h-dvh">
      <div className="grid-bg" />
      <div className="vignette" />
      <div className="scanline" />
      <header className="sticky top-0 z-30 border-b border-line bg-void/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1">
            {tab(links.dashboard, "dashboard", "My Dashboard")}
            {tab(links.plan, "plan", "Projections")}
            {links.school && tab(links.school, "school", "Trading School")}
            {links.practice && tab(links.practice, "practice", "Practice")}
            {staff && tab(links.coach, "coach", "Coach Portal")}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm">{viewer.name}</div>
              <div className={cx("label !text-[9px]", staff && "!text-ice")}>{viewer.role === "ADMIN" ? "Admin" : viewer.role === "COACH" ? "Trading Coach" : "Member"}</div>
            </div>
            <Avatar src={viewer.avatarUrl} name={viewer.name} size={34} />
            <a href={signOutHref} className="btn btn-ghost !h-8 !px-2" aria-label="Sign out" title="Sign out"><IconLogout /></a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}
