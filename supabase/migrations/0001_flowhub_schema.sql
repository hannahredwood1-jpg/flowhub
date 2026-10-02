-- FLOWHUB schema — mirrors prisma/schema.prisma (same table/column names, so Prisma can take over later).
-- Access model: the app server connects as role "flowhub_app". RLS is on for every table with a single
-- policy for that role, so Supabase's public Data API (anon/authenticated keys) can't read anything.

-- ── Enums ───────────────────────────────────────────────────
CREATE TYPE "Role" AS ENUM ('MEMBER', 'COACH', 'ADMIN');
CREATE TYPE "DrawdownModel" AS ENUM ('EOD_TRAILING', 'INTRADAY_TRAILING', 'STATIC');
CREATE TYPE "DataStatus" AS ENUM ('OFFICIAL', 'SECONDARY', 'VERIFY');
CREATE TYPE "AccountStage" AS ENUM ('EVALUATION', 'FUNDED', 'LIVE', 'PASSED', 'FAILED', 'ARCHIVED');
CREATE TYPE "Direction" AS ENUM ('LONG', 'SHORT');
CREATE TYPE "Outcome" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');
CREATE TYPE "Emotion" AS ENUM ('CALM', 'CONFIDENT', 'FOCUSED', 'HESITANT', 'FEARFUL', 'FOMO', 'FRUSTRATED', 'REVENGE', 'BORED', 'EUPHORIC');
CREATE TYPE "FeedbackKind" AS ENUM ('NOTE', 'PRAISE', 'WARNING', 'ACTION_ITEM');
CREATE TYPE "StrategyMode" AS ENUM ('DAILY_LEVELS', 'INDICATORS');
CREATE TYPE "Instrument" AS ENUM ('NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K', 'CL', 'MCL', 'GC', 'MGC');

-- ── Tables ──────────────────────────────────────────────────
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "discordId" TEXT NOT NULL UNIQUE,
  "username" TEXT NOT NULL,
  "globalName" TEXT,
  "avatarHash" TEXT,
  "role" "Role" NOT NULL DEFAULT 'MEMBER',
  "guildRoleIds" TEXT[] NOT NULL DEFAULT '{}',
  "isGuildMember" BOOLEAN NOT NULL DEFAULT true,
  "accessTokenEnc" TEXT,
  "refreshTokenEnc" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "rolesSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE TABLE "PropFirm" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "website" TEXT
);

CREATE TABLE "AccountTemplate" (
  "id" TEXT PRIMARY KEY,
  "firmId" TEXT NOT NULL REFERENCES "PropFirm"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "planName" TEXT NOT NULL,
  "accountSize" INTEGER NOT NULL,
  "profitTarget" INTEGER,
  "maxLoss" INTEGER NOT NULL,
  "drawdownModel" "DrawdownModel" NOT NULL,
  "drawdownNote" TEXT NOT NULL,
  "dailyLossLimit" INTEGER,
  "dailyLossNote" TEXT NOT NULL,
  "consistencyPct" INTEGER,
  "consistencyNote" TEXT NOT NULL,
  "minDays" INTEGER NOT NULL,
  "maxMinis" INTEGER NOT NULL,
  "maxMicros" INTEGER NOT NULL,
  "profitSplit" TEXT,
  "notes" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "dataStatus" "DataStatus" NOT NULL,
  "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "AccountTemplate_firmId_planName_accountSize_key" ON "AccountTemplate"("firmId", "planName", "accountSize");
CREATE INDEX "AccountTemplate_isActive_idx" ON "AccountTemplate"("isActive");

CREATE TABLE "Roadmap" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "monthlyIncomeGoal" DECIMAL(12,2) NOT NULL,
  "tradingDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
  "strategyMode" "StrategyMode" NOT NULL DEFAULT 'INDICATORS',
  "multiSession" BOOLEAN NOT NULL DEFAULT false,
  "strategies" TEXT[] NOT NULL DEFAULT '{}',
  "avgRR" DECIMAL(6,2) NOT NULL,
  "tradesPerDay" DECIMAL(4,1) NOT NULL,
  "primaryInstrument" "Instrument" NOT NULL DEFAULT 'NQ',
  "avgStopPoints" DECIMAL(8,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MemberAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "templateId" TEXT NOT NULL REFERENCES "AccountTemplate"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "nickname" TEXT,
  "stage" "AccountStage" NOT NULL DEFAULT 'EVALUATION',
  "startDate" DATE NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "targetPassDays" INTEGER,
  "riskPerTradeOverride" DECIMAL(10,2),
  "dailyLossLimitOverride" INTEGER,
  "ruleSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MemberAccount_userId_stage_idx" ON "MemberAccount"("userId", "stage");

CREATE TABLE "JournalEntry" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "memberAccountId" TEXT REFERENCES "MemberAccount"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "tradeDate" DATE NOT NULL,
  "ticker" TEXT NOT NULL,
  "direction" "Direction" NOT NULL,
  "setupType" TEXT NOT NULL,
  "contracts" INTEGER,
  "riskPct" DECIMAL(5,2),
  "riskDollars" DECIMAL(10,2),
  "rrPlanned" DECIMAL(6,2),
  "rrRealized" DECIMAL(6,2),
  "outcome" "Outcome" NOT NULL,
  "pnl" DECIMAL(12,2) NOT NULL,
  "emotion" "Emotion" NOT NULL,
  "followedPlan" BOOLEAN NOT NULL DEFAULT true,
  "screenshotUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "JournalEntry_userId_tradeDate_idx" ON "JournalEntry"("userId", "tradeDate");
CREATE INDEX "JournalEntry_memberAccountId_tradeDate_idx" ON "JournalEntry"("memberAccountId", "tradeDate");

CREATE TABLE "Payout" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "memberAccountId" TEXT NOT NULL REFERENCES "MemberAccount"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "amount" DECIMAL(12,2) NOT NULL,
  "paidAt" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Payout_userId_paidAt_idx" ON "Payout"("userId", "paidAt");

CREATE TABLE "CoachFeedback" (
  "id" TEXT PRIMARY KEY,
  "coachId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "traderId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "journalEntryId" TEXT REFERENCES "JournalEntry"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "memberAccountId" TEXT REFERENCES "MemberAccount"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "kind" "FeedbackKind" NOT NULL DEFAULT 'NOTE',
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CoachFeedback_traderId_createdAt_idx" ON "CoachFeedback"("traderId", "createdAt");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- Web assets (the compiled browser app) served by the Railway server
CREATE TABLE "AppAsset" (
  "path" TEXT PRIMARY KEY,
  "contentType" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Lock down: no access through Supabase's public Data API ──
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['User','PropFirm','AccountTemplate','Roadmap','MemberAccount','JournalEntry','Payout','CoachFeedback','AuditLog','AppAsset'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
