// Static, clickable preview of the real UI components with sample data and an in-memory mock API.
// Build: see preview/build.mjs. Nothing here ships with the app.
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import rows from "../prisma/data/prop_firm_accounts.json";
import { rowToTemplate, type CatalogRow } from "../src/lib/catalog";
import { buildDashboard, buildDirectoryRow, sortDirectory, type RawAccount, type RawInput, type DirectorySort } from "../src/lib/viewmodel";
import type { CatalogFirm, FeedbackDTO, JournalDTO, PersonDTO, RoadmapDTO, RulesDTO, Stage } from "../src/lib/types";
import { todayET } from "../src/lib/types";
import { AppShell } from "../src/components/AppShell";
import { LoginScreen } from "../src/components/LoginScreen";
import { blendedWinRate, strategyLabel, type StrategyKey } from "../src/lib/strategies";
import { MemberDashboard } from "../src/components/MemberDashboard";
import { CoachPortal } from "../src/components/CoachPortal";
import { TradingPlanPage } from "../src/components/TradingPlan";
import { summarizeSchool } from "../src/lib/school";
import { summarizePractice } from "../src/lib/practice";

// ── Catalog ────────────────────────────────────────────────
const catalogRows = rows as CatalogRow[];
const rulesById = new Map<string, RulesDTO>(
  catalogRows.map((r) => [r.id, { ...rowToTemplate(r), firm: r.firm, notes: r.notes || null } as unknown as RulesDTO]),
);
const catalog: CatalogFirm[] = [];
for (const r of catalogRows) {
  const t = rowToTemplate(r);
  let f = catalog.find((x) => x.firm === r.firm);
  if (!f) catalog.push((f = { firm: r.firm, plans: [] }));
  let p = f.plans.find((x) => x.plan === r.plan);
  if (!p) f.plans.push((p = { plan: r.plan, sizes: [] }));
  p.sizes.push({ id: t.id, accountSize: t.accountSize, profitTarget: t.profitTarget, maxLoss: t.maxLoss, dailyLossLimit: t.dailyLossLimit, consistencyPct: t.consistencyPct, minDays: t.minDays, drawdownNote: t.drawdownNote, dataStatus: t.dataStatus, drawdownModel: t.drawdownModel, maxMinis: t.maxMinis, maxMicros: t.maxMicros, profitSplit: t.profitSplit ?? null });
}

// ── Sample people ──────────────────────────────────────────
const PALETTE = ["#3d6a9c", "#4a5b8c", "#2f6f6a", "#5b4a8c", "#3a5f7a", "#6a4a6a", "#2f5a8a"];
function avatar(name: string, i: number) {
  const initials = name.split(/[\s_]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='${PALETTE[i % PALETTE.length]}'/><path d='M0 48 L64 20 L64 64 L0 64Z' fill='rgba(0,0,0,.25)'/><text x='32' y='41' font-family='monospace' font-size='24' font-weight='700' text-anchor='middle' fill='#dbe6f5'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const mk = (id: string, name: string, role: PersonDTO["role"], i: number): PersonDTO => ({ id, name, role, avatarUrl: avatar(name, i), discordId: `10000000000000000${i}` });

const today = todayET();
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const tradingDaysBack = (n: number) => { const out: string[] = []; let d = today; while (out.length < n) { d = addDays(d, -1); const wd = new Date(d + "T12:00:00Z").getUTCDay(); if (wd && wd !== 6) out.push(d); } return out.reverse(); };

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
const NOTES = [
  "Waited for the 5m FVG to fill after NY open, entered on the rejection wick. Clean.",
  "Took it early before confirmation. Stop was fine but entry was rushed.",
  "Absorption at VWAP, held to first target and trailed the rest.",
  "Chased the breakout after missing the first entry. Should have let it go.",
  "A+ setup lined up with the 4H level. Sized correctly and let it work.",
  "Moved stop to breakeven too early and got wicked out before the move.",
];

type RM = Omit<RoadmapDTO, "winRate">;
type Profile = { id: string; name: string; role: PersonDTO["role"]; roadmap: RM; accounts: { tpl: string; stage: Stage; qty?: number; nick?: string; daysAgo: number; bias: number; days: number }[] };
const profiles: Profile[] = [
  { id: "u-coach", name: "Coach Nova", role: "COACH", roadmap: { monthlyIncomeGoal: 8000, tradingDaysPerWeek: 5, strategyMode: "INDICATORS", multiSession: true, strategies: ["ASIAFLOW_PO3", "NYFLOW_HL", "NYFLOW_PO3"], avgRR: 1.4, tradesPerDay: 3, primaryInstrument: "MNQ", avgStopPoints: 18 },
    accounts: [
      { tpl: "my-funded-futures--rapid-intraday--50k", stage: "EVALUATION", daysAgo: 7, bias: 0.05, days: 6 },
      { tpl: "lucid-trading--lucidflex--50k", stage: "FUNDED", qty: 3, daysAgo: 30, bias: 0.0, days: 16 },
      { tpl: "topstep--trading-combine--100k", stage: "EVALUATION", daysAgo: 4, bias: -0.1, days: 3 },
    ] },
  { id: "u-1", name: "vortex_nq", role: "MEMBER", roadmap: { monthlyIncomeGoal: 4000, tradingDaysPerWeek: 5, strategyMode: "INDICATORS", multiSession: false, strategies: ["NYFLOW_PO3"], avgRR: 1.5, tradesPerDay: 2, primaryInstrument: "MNQ", avgStopPoints: 20 },
    accounts: [{ tpl: "apex-trader-funding--intraday-trailing--50k", stage: "EVALUATION", daysAgo: 9, bias: -0.35, days: 7 }] },
  { id: "u-2", name: "lunaticks", role: "MEMBER", roadmap: { monthlyIncomeGoal: 3000, tradingDaysPerWeek: 4, strategyMode: "DAILY_LEVELS", multiSession: false, strategies: ["DAILY_LEVELS"], avgRR: 1, tradesPerDay: 2, primaryInstrument: "MNQ", avgStopPoints: 15 },
    accounts: [{ tpl: "lucid-trading--lucidflex--25k", stage: "EVALUATION", daysAgo: 6, bias: 0.02, days: 4 }, { tpl: "tradeify--select--50k", stage: "EVALUATION", daysAgo: 12, bias: -0.05, days: 8 }] },
  { id: "u-3", name: "Deon K", role: "MEMBER", roadmap: { monthlyIncomeGoal: 10000, tradingDaysPerWeek: 5, strategyMode: "INDICATORS", multiSession: true, strategies: ["ASIAFLOW_PO3", "NYFLOW_HL"], avgRR: 1.3, tradesPerDay: 3, primaryInstrument: "NQ", avgStopPoints: 12 },
    accounts: [{ tpl: "my-funded-futures--rapid-intraday--150k", stage: "FUNDED", qty: 2, daysAgo: 25, bias: 0.04, days: 14 }, { tpl: "alpha-futures--standard--100k", stage: "EVALUATION", daysAgo: 10, bias: -0.2, days: 6 }] },
  { id: "u-4", name: "priya.trades", role: "MEMBER", roadmap: { monthlyIncomeGoal: 2500, tradingDaysPerWeek: 5, strategyMode: "DAILY_LEVELS", multiSession: false, strategies: ["DAILY_LEVELS"], avgRR: 1.2, tradesPerDay: 1, primaryInstrument: "MES", avgStopPoints: 6 },
    accounts: [{ tpl: "take-profit-trader--test-pro-pro--50k", stage: "EVALUATION", daysAgo: 14, bias: -0.08, days: 9 }] },
  { id: "u-5", name: "ghostfills", role: "MEMBER", roadmap: { monthlyIncomeGoal: 6000, tradingDaysPerWeek: 5, strategyMode: "INDICATORS", multiSession: false, strategies: ["NYFLOW_HL", "NYFLOW_PO3"], avgRR: 1.5, tradesPerDay: 3, primaryInstrument: "MNQ", avgStopPoints: 25 },
    accounts: [{ tpl: "bulenox--qualification-option-2-eod--50k", stage: "EVALUATION", daysAgo: 20, bias: -0.355, days: 5 }] },
];

const EMO_GOOD = ["CALM", "FOCUSED", "CONFIDENT"] as const;
const EMO_BAD = ["FOMO", "FRUSTRATED", "HESITANT", "REVENGE"] as const;

const db = new Map<string, RawInput>();
let uid = 1000;
for (const [i, p] of profiles.entries()) {
  const person = mk(p.id, p.name, p.role, i);
  const accounts: RawAccount[] = [];
  const journal: RawInput["journal"] = [];
  for (const [ai, a] of p.accounts.entries()) {
    const rules = rulesById.get(a.tpl)!;
    const id = `${p.id}-a${ai}`;
    accounts.push({ id, templateId: a.tpl, nickname: a.nick ?? null, stage: a.stage, startDate: addDays(today, -a.daysAgo), quantity: a.qty ?? 1, targetPassDays: null, riskPerTradeOverride: null, dailyLossLimitOverride: null, rules });
    const risk = Math.round((rules.maxLoss / 8) / 10) * 10;
    const wr = blendedWinRate({ mode: p.roadmap.strategyMode, multiSession: p.roadmap.multiSession, strategies: p.roadmap.strategies });
    for (const d of tradingDaysBack(a.days)) {
      const n = 1 + Math.floor(rand() * p.roadmap.tradesPerDay);
      for (let t = 0; t < n; t++) {
        const win = rand() < Math.min(0.97, wr + a.bias);
        const be = !win && rand() < 0.12;
        const rr = win ? Math.round((p.roadmap.avgRR * (0.7 + rand() * 0.6)) * 10) / 10 : be ? 0 : -1;
        const pnl = Math.round(risk * rr + (win ? rand() * 40 : 0));
        const followed = rand() < (win ? 0.9 : 0.6);
        journal.push({
          id: `t${uid++}`, memberAccountId: id, tradeDate: d, ticker: p.roadmap.primaryInstrument, direction: rand() < 0.55 ? "LONG" : "SHORT",
          setupType: strategyLabel(pick(p.roadmap.strategies as StrategyKey[])), contracts: Math.max(1, Math.round(risk / (p.roadmap.avgStopPoints * (p.roadmap.primaryInstrument === "NQ" ? 20 : p.roadmap.primaryInstrument === "MES" ? 5 : 2)))),
          riskPct: Math.round((risk / rules.accountSize) * 10000) / 100, riskDollars: risk, rrPlanned: 2, rrRealized: rr,
          outcome: be ? "BREAKEVEN" : win ? "WIN" : "LOSS", pnl, emotion: followed ? pick(EMO_GOOD) : pick(EMO_BAD), followedPlan: followed,
          screenshotUrl: rand() < 0.5 ? "https://www.tradingview.com/x/example/" : null, notes: pick(NOTES), feedbackCount: 0,
        });
      }
    }
  }
  db.set(p.id, { viewer: person, trader: person, today, roadmap: { ...p.roadmap, winRate: blendedWinRate({ mode: p.roadmap.strategyMode, multiSession: p.roadmap.multiSession, strategies: p.roadmap.strategies }) }, accounts, journal, feedback: [] });
}
db.get("u-3")!.projection = { name: "Scale to 5 accounts", months: 6, riskLevel: "STANDARD", rebuyOnFail: true, updatedAt: new Date().toISOString(), rows: [
  { templateId: "my-funded-futures--rapid-intraday--150k", quantity: 2, start: "FUNDED", costPerAttempt: 0, monthlyFee: 0, payoutCap: 9000 },
  { templateId: "alpha-futures--standard--100k", quantity: 3, start: "EVAL", costPerAttempt: 150, monthlyFee: 0, payoutCap: 6000 },
] };
// Trading School + plan + practice samples for the coach view
db.get("u-1")!.school = summarizeSchool({ ch: ["chart", "connect", "order", "manage", "limits", "end"], dives: { futures: { what: 1, nq: 1, clock: 1, side: 1, roll: 1 }, charts: { candle: 1, bear: 1, tf: 1, trend: 1, sr: 1 }, setup: { chart: 1, clock: 1, broker: 1, bracket: 1, check: 1 }, orders: { types: 1, bracket: 1, oco: 1 }, risk: { formula: 1, r: 1, daily: 1 }, prop: { flow: 1, dd: 1 } },
  ck: { b1: { best: 0.86, pass: true }, b2: { best: 0.83, pass: true }, b3: { best: 1, pass: true }, b4: { best: 0.88, pass: true } }, ex: { beginner: { best: 0.86, pass: true, n: 2 } } }, [],
  [{ kind: "ex", ref: "beginner", score: 12, total: 14, pass: true, createdAt: new Date(Date.now() - 864e5).toISOString() }, { kind: "ex", ref: "beginner", score: 9, total: 14, pass: false, createdAt: new Date(Date.now() - 2 * 864e5).toISOString() }, { kind: "ck", ref: "b4", score: 7, total: 8, pass: true, createdAt: new Date(Date.now() - 3 * 864e5).toISOString() }]);
db.get("u-1")!.practice = summarizePractice(Array.from({ length: 60 }, (_, i) => ({ model: ["hl", "po3", "dl", "exo"][i % 4], drill: ["mark", "replay", "limit", "echo"][i % 4], ok: (i * 7) % 10 > 3, tags: (i * 7) % 10 > 3 ? [] : [["early-entry", "cisd-read", "limit-no-lrl"][i % 3]], createdAt: new Date(Date.now() - (60 - i) * 36e5).toISOString() })));
db.get("u-1")!.tradingPlan = { schedule: { days: ["Mon", "Tue", "Wed", "Thu"], sessions: ["NY"], start: "09:30", end: "11:00" }, models: ["ECHO_X_ORBIT", "NYFLOW_HL"], entries: { entry: "both", stopPts: 15, targetPts: 40, beAt1R: true, partials: false }, risk: { instrument: "MNQ", contracts: 3, maxLossesPerDay: 2, maxTradesPerDay: 3, dailyProfitStop: 400, noNews: true }, numbers: { monthlyGoal: 2500, tradingDays: 16 }, rules: ["No trades after a 2R win"], done: true, updatedAt: new Date().toISOString() };
const coach = db.get("u-coach")!.trader;
const addFeedback = (traderId: string, f: Omit<FeedbackDTO, "id" | "coach" | "createdAt" | "readAt">, read = false) =>
  db.get(traderId)!.feedback.unshift({ ...f, id: `f${uid++}`, coach: { name: coach.name, avatarUrl: coach.avatarUrl }, createdAt: new Date().toISOString(), readAt: read ? new Date().toISOString() : null });
addFeedback("u-coach", { kind: "ACTION_ITEM", body: "Sample note: you're 2 days from passing the MFFU Rapid. Keep size at 7 MNQ and stop at the daily cap. No need to force it.", journalEntryId: null, memberAccountId: "u-coach-a0" });
addFeedback("u-1", { kind: "WARNING", body: "Three revenge trades after the first loss on Tuesday. Stop after 2 losses for the day. That's the plan.", journalEntryId: null, memberAccountId: null }, true);
const firstTrade = db.get("u-coach")!.journal.find((j) => j.outcome === "WIN")!;
addFeedback("u-coach", { kind: "PRAISE", body: "Textbook entry. Waited for the FVG fill and the wick. More of this.", journalEntryId: firstTrade.id, memberAccountId: null }, true);

const dash = (viewerId: string, traderId: string) => {
  const raw = db.get(traderId)!;
  const d = buildDashboard({ ...raw, viewer: db.get(viewerId)!.trader, journal: raw.journal.map((j) => ({ ...j, feedbackCount: raw.feedback.filter((f) => f.journalEntryId === j.id).length })) });
  return d;
};

// ── Mock API (replaces fetch) ──────────────────────────────
const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const ME = "u-coach";
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), location.href);
  const path = url.pathname.replace(/^.*\/api\//, "/api/");
  const method = init?.method ?? "GET";
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const me = db.get(ME)!;
  await new Promise((r) => setTimeout(r, 180));
  let m: RegExpMatchArray | null;

  if (path === "/api/dashboard") return ok(dash(ME, ME));
  if (path === "/api/catalog") return ok(catalog);
  if (path === "/api/log") {
    const w = window as unknown as { __logs?: unknown[] }; w.__logs ??= [];
    if (method === "PUT") { const e = JSON.parse(String(init?.body)); w.__logs = [e, ...w.__logs.filter((x) => { const y = x as { kind: string; day: string }; return !(y.kind === e.kind && y.day === e.day); })]; return ok({ ok: true }); }
    return ok(w.__logs);
  }
  if (path === "/api/projection") {
    me.projection = method === "DELETE" ? null : { ...body, updatedAt: new Date().toISOString() };
    return ok({ ok: true });
  }
  if (path === "/api/plan") {
    if (method === "PUT") { me.tradingPlan = { ...body, done: true, updatedAt: new Date().toISOString() }; return ok({ ok: true }); }
    return ok({ plan: me.tradingPlan ?? null });
  }
  if ((m = path.match(/^\/api\/coach\/members\/(.+)\/unlock$/))) {
    const t = db.get(m[1])!; const sch = t.school ?? summarizeSchool(null, [], []);
    t.school = { ...sch, levels: sch.levels.map((l) => (l.id === body.level ? { ...l, manualUnlock: !!body.on } : l)) };
    return ok({ ok: true });
  }
  if (path === "/api/roadmap" && method === "PUT") {
    const sel = { mode: body.strategyMode, multiSession: !!body.multiSession, strategies: body.strategies };
    me.roadmap = { monthlyIncomeGoal: +body.monthlyIncomeGoal, tradingDaysPerWeek: +body.tradingDaysPerWeek, strategyMode: body.strategyMode, multiSession: !!body.multiSession, strategies: body.strategies, winRate: blendedWinRate(sel), avgRR: +body.avgRR, tradesPerDay: +body.tradesPerDay, primaryInstrument: body.primaryInstrument, avgStopPoints: +body.avgStopPoints };
    return ok({ ok: true });
  }
  if (path === "/api/accounts" && method === "POST") {
    const rules = rulesById.get(body.templateId);
    if (!rules) return ok({ error: "Unknown account" }, 400);
    me.accounts.push({ id: `a${uid++}`, templateId: body.templateId, nickname: body.nickname, stage: body.stage, startDate: body.startDate, quantity: body.quantity, targetPassDays: body.targetPassDays, riskPerTradeOverride: body.riskPerTradeOverride, dailyLossLimitOverride: body.dailyLossLimitOverride, rules });
    return ok({ id: "new" });
  }
  if ((m = path.match(/^\/api\/accounts\/(.+)$/))) {
    const i = me.accounts.findIndex((a) => a.id === m![1]);
    if (method === "DELETE") { me.accounts.splice(i, 1); me.journal.forEach((j) => { if (j.memberAccountId === m![1]) j.memberAccountId = null; }); }
    else Object.assign(me.accounts[i], body);
    return ok({ ok: true });
  }
  if (path === "/api/journal" && method === "POST") {
    me.journal.push({ ...body, id: `t${uid++}`, feedbackCount: 0 } as JournalDTO);
    return ok({ id: "new" });
  }
  if ((m = path.match(/^\/api\/journal\/(.+)$/))) {
    const i = me.journal.findIndex((j) => j.id === m![1]);
    if (method === "DELETE") me.journal.splice(i, 1); else Object.assign(me.journal[i], body);
    return ok({ ok: true });
  }
  if ((m = path.match(/^\/api\/feedback\/(.+)\/read$/))) {
    const f = me.feedback.find((x) => x.id === m![1]); if (f) f.readAt = new Date().toISOString();
    return ok({ ok: true });
  }
  if (path === "/api/coach/members") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const list = [...db.keys()].map((id) => buildDirectoryRow(dash(ME, id))).filter((r) => r.trader.name.toLowerCase().includes(q));
    return ok(sortDirectory(list, (url.searchParams.get("sort") ?? "drawdown") as DirectorySort));
  }
  if ((m = path.match(/^\/api\/coach\/members\/(.+)$/))) return ok(dash(ME, m[1]));
  if (path === "/api/coach/feedback" && method === "POST") {
    addFeedback(body.traderId, { kind: body.kind, body: body.body, journalEntryId: body.journalEntryId, memberAccountId: body.memberAccountId });
    return ok({ id: "new" });
  }
  return ok({ error: "Not in preview" }, 404);
};

function PlanView() {
  const [d, setD] = useState(() => dash(ME, ME));
  return <TradingPlanPage data={d} catalog={catalog} onSaved={async () => setD(dash(ME, ME))} />;
}

// ── App ────────────────────────────────────────────────────
function App() {
  const pick = () => (location.hash === "#coach" ? "coach" : location.hash === "#dashboard" ? "dashboard" : location.hash.startsWith("#plan") ? "plan" : "login") as "login" | "dashboard" | "plan" | "coach";
  const [view, setView] = useState(pick);
  useEffect(() => {
    const on = () => { setView(pick()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const initialDir = sortDirectory([...db.keys()].map((id) => buildDirectoryRow(dash(ME, id))), "drawdown");
  if (view === "login")
    return <LoginScreen action={async () => { await new Promise((r) => setTimeout(r, 2200)); location.hash = "dashboard"; }} />;
  return (
    <AppShell viewer={coach} active={view} links={{ dashboard: "#dashboard", plan: "#plan", school: "https://claude.ai/artifact/TeTW45zgMgzPLasmC1PQUr", coach: "#coach" }}>
      <div className="mb-4 flex flex-wrap items-center gap-2 border border-dashed border-line-2 px-3 py-2 text-xs text-ink-3">
        <span className="chip text-ice">Preview</span>
        Sample traders and trades. Changes you make here stay in this tab. You&apos;re viewing as a Trading Coach, so both views are unlocked. <a href="#login" className="text-ice underline-offset-2 hover:underline">See the login screen</a>
      </div>
      {view === "dashboard" ? <MemberDashboard key="d" initial={dash(ME, ME)} catalog={catalog} planHref="#plan" /> : view === "plan" ? <PlanView /> : <CoachPortal key="c" initial={initialDir} today={today} />}
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
