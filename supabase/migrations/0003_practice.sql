-- Practice tab: every graded rep (coach-visible summary) + each member's progress state.
create table if not exists "PracticeRep" (
  id text primary key,
  "userId" text not null references "User"(id) on delete cascade,
  model text not null check (model in ('dl','hl','po3','asia')),
  drill text not null check (char_length(drill) <= 20),
  ok boolean not null,
  tags text[] not null default '{}',
  xp integer not null default 0 check (xp between 0 and 200),
  "createdAt" timestamptz not null default now()
);
create index if not exists "PracticeRep_user_time" on "PracticeRep" ("userId", "createdAt" desc);
create table if not exists "PracticeState" (
  "userId" text primary key references "User"(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  "updatedAt" timestamptz not null default now()
);
alter table "PracticeRep" enable row level security;
alter table "PracticeState" enable row level security;
