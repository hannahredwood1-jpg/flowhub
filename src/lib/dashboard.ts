import "server-only";
import type { User } from "@prisma/client";
import { db, isoDate, num } from "./db";
import { avatarUrl } from "./discord";
import { buildDashboard, buildDirectoryRow, type RawAccount } from "./viewmodel";
import type { CatalogFirm, DashboardData, PersonDTO, ProjectionDTO, RulesDTO } from "./types";
import { todayET } from "./types";
import type { Instrument } from "./planner";
import { blendedWinRate, type StrategyKey } from "./strategies";

export const person = (u: User): PersonDTO => ({
  id: u.id,
  name: u.globalName ?? u.username,
  avatarUrl: avatarUrl(u.discordId, u.avatarHash),
  role: u.role,
  discordId: u.discordId,
});

/** Everything one trader's dashboard needs. Caller is responsible for authorization (see rbac.assertCanRead). */
export async function loadDashboard(viewer: User, traderId: string): Promise<DashboardData> {
  const since = new Date(Date.now() - 400 * 24 * 3600 * 1000);
  const trader = await db.user.findUniqueOrThrow({
    where: { id: traderId },
    include: {
      roadmap: true,
      accounts: { orderBy: { createdAt: "asc" } },
      journal: { where: { tradeDate: { gte: since } }, include: { _count: { select: { feedback: true } } } },
      feedbackGot: { orderBy: { createdAt: "desc" }, take: 100, include: { coach: true } },
      projection: true,
    },
  });

  const r = trader.roadmap;
  return buildDashboard({
    viewer: person(viewer),
    trader: person(trader),
    today: todayET(),
    roadmap: r
      ? {
          monthlyIncomeGoal: num(r.monthlyIncomeGoal)!, tradingDaysPerWeek: r.tradingDaysPerWeek,
          strategyMode: r.strategyMode, multiSession: r.multiSession, strategies: r.strategies as StrategyKey[],
          winRate: blendedWinRate({ mode: r.strategyMode, multiSession: r.multiSession, strategies: r.strategies as StrategyKey[] }),
          avgRR: num(r.avgRR)!, tradesPerDay: num(r.tradesPerDay)!, primaryInstrument: r.primaryInstrument as Instrument,
          avgStopPoints: num(r.avgStopPoints)!,
        }
      : null,
    accounts: trader.accounts.map<RawAccount>((a) => ({
      id: a.id, templateId: a.templateId, nickname: a.nickname, stage: a.stage, startDate: isoDate(a.startDate), quantity: a.quantity,
      targetPassDays: a.targetPassDays, riskPerTradeOverride: num(a.riskPerTradeOverride), dailyLossLimitOverride: a.dailyLossLimitOverride,
      rules: a.ruleSnapshot as unknown as RulesDTO,
    })),
    journal: trader.journal.map((j) => ({
      id: j.id, memberAccountId: j.memberAccountId, tradeDate: isoDate(j.tradeDate), ticker: j.ticker, direction: j.direction,
      setupType: j.setupType, contracts: j.contracts, riskPct: num(j.riskPct), riskDollars: num(j.riskDollars),
      rrPlanned: num(j.rrPlanned), rrRealized: num(j.rrRealized), outcome: j.outcome, pnl: num(j.pnl)!, emotion: j.emotion,
      followedPlan: j.followedPlan, screenshotUrl: j.screenshotUrl, notes: j.notes, feedbackCount: j._count.feedback,
    })),
    feedback: trader.feedbackGot.map((f) => ({
      id: f.id, coach: { name: f.coach.globalName ?? f.coach.username, avatarUrl: avatarUrl(f.coach.discordId, f.coach.avatarHash) },
      kind: f.kind, body: f.body, journalEntryId: f.journalEntryId, memberAccountId: f.memberAccountId,
      createdAt: f.createdAt.toISOString(), readAt: f.readAt?.toISOString() ?? null,
    })),
    projection: trader.projection
      ? { ...(trader.projection.config as unknown as Omit<ProjectionDTO, "name" | "updatedAt">), name: trader.projection.name, updatedAt: trader.projection.updatedAt.toISOString() }
      : null,
  });
}

/**
 * Coach directory: one row per guild member who has used the app.
 * Computes pace for every member — fine for a community of a few hundred traders.
 * Past ~1,000 active traders, move this to a nightly/15-min job that caches rows in a table.
 */
export async function loadDirectory(viewer: User, q?: string) {
  const members = await db.user.findMany({
    where: {
      isGuildMember: true,
      ...(q ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { globalName: { contains: q, mode: "insensitive" } }] } : {}),
    },
    select: { id: true },
    take: 500,
  });
  const rows = [];
  for (const m of members) rows.push(buildDirectoryRow(await loadDashboard(viewer, m.id)));
  return rows;
}

/** Snapshot of catalog rules copied onto a member account at purchase time. */
export function snapshotRules(t: {
  firm: { name: string }; planName: string; accountSize: number; profitTarget: number | null; maxLoss: number;
  drawdownModel: RulesDTO["drawdownModel"]; drawdownNote: string; dailyLossLimit: number | null; dailyLossNote: string;
  consistencyPct: number | null; consistencyNote: string; minDays: number; maxMinis: number; maxMicros: number;
  profitSplit: string | null; notes: string | null; sourceUrl: string; dataStatus: RulesDTO["dataStatus"];
}): RulesDTO {
  return {
    firm: t.firm.name, planName: t.planName, accountSize: t.accountSize, profitTarget: t.profitTarget, maxLoss: t.maxLoss,
    drawdownModel: t.drawdownModel, drawdownNote: t.drawdownNote, dailyLossLimit: t.dailyLossLimit, dailyLossNote: t.dailyLossNote,
    consistencyPct: t.consistencyPct, consistencyNote: t.consistencyNote, minDays: t.minDays, maxMinis: t.maxMinis,
    maxMicros: t.maxMicros, profitSplit: t.profitSplit, notes: t.notes, sourceUrl: t.sourceUrl, dataStatus: t.dataStatus,
  };
}

export async function loadCatalog(): Promise<CatalogFirm[]> {
  const templates = await db.accountTemplate.findMany({
    where: { isActive: true },
    include: { firm: true },
    orderBy: [{ firm: { name: "asc" } }, { planName: "asc" }, { accountSize: "asc" }],
  });
  const firms = new Map<string, Map<string, CatalogFirm["plans"][number]["sizes"]>>();
  for (const t of templates) {
    const plans = firms.get(t.firm.name) ?? new Map();
    const sizes = plans.get(t.planName) ?? [];
    sizes.push({
      id: t.id, accountSize: t.accountSize, profitTarget: t.profitTarget, maxLoss: t.maxLoss, dailyLossLimit: t.dailyLossLimit,
      consistencyPct: t.consistencyPct, minDays: t.minDays, drawdownNote: t.drawdownNote, dataStatus: t.dataStatus,
      drawdownModel: t.drawdownModel, maxMinis: t.maxMinis, maxMicros: t.maxMicros, profitSplit: t.profitSplit,
    });
    plans.set(t.planName, sizes);
    firms.set(t.firm.name, plans);
  }
  return [...firms].map(([firm, plans]) => ({ firm, plans: [...plans].map(([plan, sizes]) => ({ plan, sizes })) }));
}
