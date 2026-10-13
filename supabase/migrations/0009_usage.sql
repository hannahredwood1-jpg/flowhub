-- Usage tracking for the coach portal: when members log on (sessions) and how long they spend in each section.
create table if not exists "UsageSession" (
  id text primary key,
  "userId" text not null references "User"(id) on delete cascade,
  "startedAt" timestamptz not null default now(),
  "lastSeenAt" timestamptz not null default now(),
  seconds int not null default 0
);
create index if not exists usagesession_user_idx on "UsageSession" ("userId", "startedAt" desc);
create table if not exists "UsageDaily" (
  "userId" text not null references "User"(id) on delete cascade,
  day date not null,
  area text not null,
  section text not null,
  seconds int not null default 0,
  "updatedAt" timestamptz not null default now(),
  primary key ("userId", day, area, section)
);
alter table "UsageSession" enable row level security;
alter table "UsageDaily" enable row level security;
grant select, insert, update, delete on "UsageSession" to flowhub_app;
grant select, insert, update, delete on "UsageDaily" to flowhub_app;
revoke all on "UsageSession" from anon, authenticated;
revoke all on "UsageDaily" from anon, authenticated;
create policy flowhub_app_all on "UsageSession" for all to flowhub_app using (true) with check (true);
create policy flowhub_app_all on "UsageDaily" for all to flowhub_app using (true) with check (true);
