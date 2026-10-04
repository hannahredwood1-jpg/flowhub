import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const money = z.coerce.number().finite();
const httpsUrl = z
  .string()
  .url()
  .max(500)
  .refine((u) => u.startsWith("https://"), "Screenshot link must start with https://");

import { Instruments, Emotions, Stages } from "./types";
import { STRATEGY_KEYS, normalizeSelection, type StrategyKey } from "./strategies";

export const roadmapInput = z.object({
  monthlyIncomeGoal: money.min(0).max(1_000_000),
  tradingDaysPerWeek: z.coerce.number().int().min(1).max(7),
  strategyMode: z.enum(["DAILY_LEVELS", "INDICATORS"]),
  multiSession: z.boolean().default(false),
  strategies: z.array(z.enum(STRATEGY_KEYS as [StrategyKey, ...StrategyKey[]])).max(5).default([]),
  avgRR: z.coerce.number().min(0.1).max(20),
  tradesPerDay: z.coerce.number().min(0.2).max(30),
  primaryInstrument: z.enum(Instruments),
  avgStopPoints: z.coerce.number().min(0.25).max(1000),
});

export const roadmapSchema = roadmapInput
  .transform((r) => ({ ...r, ...normalizeSelection({ mode: r.strategyMode, multiSession: r.multiSession, strategies: r.strategies }) }))
  .refine((r) => r.strategies.length > 0, { message: "Pick at least one strategy", path: ["strategies"] })
  .transform(({ mode, ...r }) => ({ ...r, strategyMode: mode }));

export const accountInput = z.object({
  templateId: z.string().min(3),
  nickname: z.string().trim().max(40).optional().nullable(),
  stage: z.enum(Stages).default("EVALUATION"),
  startDate: isoDate,
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  targetPassDays: z.coerce.number().int().min(1).max(120).optional().nullable(),
  riskPerTradeOverride: money.min(1).optional().nullable(),
  dailyLossLimitOverride: z.coerce.number().int().min(1).optional().nullable(),
});
export const accountPatch = accountInput.omit({ templateId: true }).partial();

export const journalInput = z.object({
  memberAccountId: z.string().optional().nullable(),
  tradeDate: isoDate,
  ticker: z.string().trim().toUpperCase().min(1).max(12),
  direction: z.enum(["LONG", "SHORT"]),
  setupType: z.string().trim().min(1).max(60),
  contracts: z.coerce.number().int().min(1).max(500).optional().nullable(),
  riskPct: z.coerce.number().min(0).max(100).optional().nullable(),
  riskDollars: money.min(0).optional().nullable(),
  rrPlanned: z.coerce.number().min(0).max(50).optional().nullable(),
  rrRealized: z.coerce.number().min(-50).max(50).optional().nullable(),
  outcome: z.enum(["WIN", "LOSS", "BREAKEVEN"]),
  pnl: money.min(-1_000_000).max(1_000_000),
  emotion: z.enum(Emotions),
  followedPlan: z.boolean().default(true),
  screenshotUrl: httpsUrl.optional().nullable().or(z.literal("").transform(() => null)),
  notes: z.string().max(4000).optional().nullable(),
});
export const journalPatch = journalInput.partial();

export const payoutInput = z.object({ memberAccountId: z.string(), amount: money.min(0.01), paidAt: isoDate });

export const feedbackInput = z.object({
  traderId: z.string(),
  journalEntryId: z.string().optional().nullable(),
  memberAccountId: z.string().optional().nullable(),
  kind: z.enum(["NOTE", "PRAISE", "WARNING", "ACTION_ITEM"]).default("NOTE"),
  body: z.string().trim().min(1).max(4000),
});

export const projectionInput = z.object({
  name: z.string().trim().min(1).max(60).default("My plan"),
  months: z.coerce.number().int().min(1).max(12).default(6),
  riskLevel: z.enum(["CONSERVATIVE", "STANDARD", "AGGRESSIVE"]).default("STANDARD"),
  rebuyOnFail: z.boolean().default(true),
  rows: z.array(z.object({
    templateId: z.string().min(3).max(120),
    quantity: z.coerce.number().int().min(1).max(20),
    start: z.enum(["EVAL", "FUNDED"]),
    costPerAttempt: z.coerce.number().min(0).max(10_000).default(0),
    monthlyFee: z.coerce.number().min(0).max(10_000).default(0),
    payoutCap: z.coerce.number().min(0).max(1_000_000).nullable().default(null),
  })).min(1, "Add at least one account").max(12),
});

export const templatePatch = z.object({
  profitTarget: z.coerce.number().int().min(0).nullable().optional(),
  maxLoss: z.coerce.number().int().min(1).optional(),
  dailyLossLimit: z.coerce.number().int().min(0).nullable().optional(),
  dailyLossNote: z.string().max(200).optional(),
  consistencyPct: z.coerce.number().int().min(1).max(100).nullable().optional(),
  consistencyNote: z.string().max(200).optional(),
  minDays: z.coerce.number().int().min(0).max(60).optional(),
  maxMinis: z.coerce.number().int().min(0).optional(),
  maxMicros: z.coerce.number().int().min(0).optional(),
  profitSplit: z.string().max(60).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  sourceUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// Trading plan (Trading Plan → Build your plan)
import { PLAN_DAYS } from "./tradingPlan";
const planTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
export const tradingPlanInput = z.object({
  schedule: z.object({
    days: z.array(z.enum(PLAN_DAYS)).min(1, "Pick at least one day").max(6),
    sessions: z.array(z.enum(["ASIA", "LONDON", "NY"])).min(1, "Pick at least one session").max(3),
    start: planTime, end: planTime,
    windows: z.record(z.enum(["ASIA", "LONDON", "NY"]), z.object({ start: planTime, end: planTime })).optional(),
  }),
  models: z.array(z.enum(["ECHO_X_ORBIT", "NYFLOW_HL", "NYFLOW_PO3", "ASIAFLOW_PO3"])).min(1, "Pick at least one model").max(4),
  entries: z.object({
    entry: z.enum(["limit", "confirmation", "both"]),
    stopPts: z.coerce.number().min(1).max(200),
    targetPts: z.coerce.number().min(1).max(500),
    beAt1R: z.boolean(),
    partials: z.boolean(),
  }),
  risk: z.object({
    instrument: z.enum(["MNQ", "NQ"]),
    contracts: z.coerce.number().int().min(1).max(50),
    maxLossesPerDay: z.coerce.number().int().min(1).max(10),
    maxTradesPerDay: z.coerce.number().int().min(1).max(20),
    dailyProfitStop: z.coerce.number().min(0).max(100000).nullable(),
    noNews: z.boolean(),
  }),
  numbers: z.object({
    monthlyGoal: z.coerce.number().min(0).max(1_000_000),
    tradingDays: z.coerce.number().int().min(1).max(23),
  }),
  rules: z.array(z.string().trim().min(1).max(140)).max(5),
});
