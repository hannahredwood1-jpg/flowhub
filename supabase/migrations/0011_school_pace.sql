-- Trading School pace: how many modules a week a student chose, plus the reminder-email bookkeeping.
create table if not exists "SchoolPace" (
  "userId" text primary key references "User"(id) on delete cascade,
  "perWeek" real not null,
  preset text,
  baseline int not null default 0,          -- modules already passed when this pace was set
  "startedAt" timestamptz not null default now(),
  "setAt" timestamptz not null default now(),
  changes int not null default 0,
  emails boolean not null default true,
  "lastNudgeAt" timestamptz,
  "nudgeStreak" int not null default 0,      -- reminders in a row with no school activity between them
  "nudgeCount" int not null default 0
);
alter table "SchoolPace" enable row level security;
grant select, insert, update, delete on "SchoolPace" to flowhub_app;
revoke all on "SchoolPace" from anon, authenticated;
create policy flowhub_app_all on "SchoolPace" for all to flowhub_app using (true) with check (true);
