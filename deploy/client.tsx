// FLOWHUB browser app for the Railway deployment. Same components as the Next.js app, talking to deploy/server.ts.
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../src/lib/api-client";
import type { CatalogFirm, CoachDirectoryRow, DashboardData } from "../src/lib/types";
import { todayET } from "../src/lib/types";
import { AppShell } from "../src/components/AppShell";
import { LoginScreen } from "../src/components/LoginScreen";
import { HomeScreen } from "../src/components/HomeScreen";
import { MemberDashboard } from "../src/components/MemberDashboard";
import { CoachPortal } from "../src/components/CoachPortal";
import { TradingPlanPage } from "../src/components/TradingPlan";

const NOTICES: Record<string, string> = {
  "denied-guild": "You're not in the FLOWMTD Discord server. Join it with the invite link from your coach, then connect again.",
  "denied-discord": "Discord didn't answer just now. Wait a minute and connect again.",
  "denied-signin": "Sign-in didn't finish. Try connecting again.",
  setup: "Discord sign-in is still being set up. Check back shortly.",
  "denied-soon": "FLOWHUB isn't open yet. Coaches are getting it ready. Watch the Discord for the launch.",
  "denied-role": "FLOWHUB is for Premium and Mentorship members. Upgrade in the Discord, then connect again.",
};

type State =
  | { kind: "loading" }
  | { kind: "login"; notice?: string }
  | { kind: "error"; message: string }
  | { kind: "app"; data: DashboardData; catalog: CatalogFirm[] };

function App() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const pickView = () => (location.hash === "#coach" ? "coach" : location.hash.startsWith("#plan") ? "plan" : location.hash.startsWith("#dashboard") ? "dashboard" : "home") as "home" | "dashboard" | "plan" | "coach";
  const [view, setView] = useState(pickView);
  const [directory, setDirectory] = useState<CoachDirectoryRow[] | null>(null);

  const load = useCallback(async () => {
    const hash = location.hash.slice(1);
    const res = await fetch("/api/dashboard", { credentials: "same-origin" });
    if (res.status === 401) return setState({ kind: "login", notice: NOTICES[hash] });
    if (!res.ok) return setState({ kind: "error", message: "FLOWHUB couldn't load. Refresh the page in a moment." });
    const [data, catalog] = await Promise.all([res.json() as Promise<DashboardData>, api.catalog()]);
    setState({ kind: "app", data, catalog });
  }, []);

  useEffect(() => { load().catch(() => setState({ kind: "error", message: "FLOWHUB couldn't load. Check your connection and refresh." })); }, [load]);

  useEffect(() => {
    const on = () => {
      setView(pickView()); window.scrollTo(0, 0);
      // keep the shared copy fresh so the planner sees accounts added on the dashboard
      api.dashboard().then((data) => setState((s) => (s.kind === "app" ? { ...s, data } : s)), () => {});
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const staff = state.kind === "app" && (state.data.viewer.role === "COACH" || state.data.viewer.role === "ADMIN");
  useEffect(() => {
    if (staff && view === "coach" && !directory) api.members("", "drawdown").then(setDirectory, () => setDirectory([]));
  }, [staff, view, directory]);

  if (state.kind === "loading") return <div id="boot">FLOWHUB // SYNCING</div>;
  if (state.kind === "error") return <div id="boot">{state.message}</div>;
  if (state.kind === "login")
    return <LoginScreen notice={state.notice} action={async () => { location.href = "/auth/discord"; await new Promise(() => {}); }} onLocal={async (username, password) => { const r = await fetch("/auth/local", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }), credentials: "same-origin" }); const j = await r.json().catch(() => ({})); if (!r.ok) return (j as { error?: string }).error ?? "Sign-in failed"; location.href = "/#home"; location.reload(); return undefined; }} />;

  const active = view === "coach" && !staff ? "home" : view;
  if (active === "home") return <HomeScreen viewer={state.data.viewer} signOutHref="/auth/logout" />;
  const reload = async () => { const data = await api.dashboard(); setState((s) => (s.kind === "app" ? { ...s, data } : s)); };
  return (
    <AppShell viewer={state.data.viewer} active={active} links={{ home: "#home", dashboard: "#dashboard", plan: "#plan", school: "/school", practice: "/practice", coach: "#coach" }} signOutHref="/auth/logout">
      {active === "coach"
        ? directory
          ? <CoachPortal key="c" initial={directory} today={todayET()} />
          : <div id="boot">LOADING ROSTER…</div>
        : active === "plan"
          ? <TradingPlanPage key="p" data={state.data} catalog={state.catalog} onSaved={reload} />
          : <MemberDashboard key={`d${state.data.projection?.updatedAt ?? ""}`} initial={state.data} catalog={state.catalog} planHref="#plan" />}
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
