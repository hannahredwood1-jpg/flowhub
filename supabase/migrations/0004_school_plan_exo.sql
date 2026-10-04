-- Trading School gating (progress, coach unlocks, checkpoint/exam attempts), the written trading plan,
-- and ECHO X ORBIT as a practice model. (Applied.)
create table if not exists "SchoolProgress" (
  "userId" text primary key references "User"(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  unlocks text[] not null default '{}',
  "updatedAt" timestamptz not null default now()
);
create table if not exists "SchoolAttempt" (
  id text primary key,
  "userId" text not null references "User"(id) on delete cascade,
  kind text not null check (kind in ('ck','ex')),
  ref text not null check (char_length(ref) <= 20),
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and total <= 50),
  pass boolean not null,
  "createdAt" timestamptz not null default now()
);
create index if not exists "SchoolAttempt_user_time" on "SchoolAttempt" ("userId", "createdAt" desc);
create table if not exists "TradingPlan" (
  "userId" text primary key references "User"(id) on delete cascade,
  plan jsonb not null,
  "updatedAt" timestamptz not null default now()
);
alter table "SchoolProgress" enable row level security;
alter table "SchoolAttempt" enable row level security;
alter table "TradingPlan" enable row level security;

alter table "PracticeRep" drop constraint if exists "PracticeRep_model_check";
alter table "PracticeRep" add constraint "PracticeRep_model_check" check (model in ('dl','hl','po3','asia','exo'));

