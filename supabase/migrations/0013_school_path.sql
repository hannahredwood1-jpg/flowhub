-- Trading School learning paths: each student says where they are, and anything they claim they can already do is proved with a
-- one-attempt "proof exam" (kind 'po'). The path is locked once the first proof exam is taken; only a coach can reset it.
alter table "SchoolAttempt" add column if not exists secs int;
alter table "SchoolAttempt" drop constraint if exists "SchoolAttempt_kind_check";
alter table "SchoolAttempt" add constraint "SchoolAttempt_kind_check" check (kind in ('ck', 'ex', 'po'));
-- one proof attempt per student per module, enforced by the database
create unique index if not exists schoolattempt_po_once on "SchoolAttempt" ("userId", ref) where kind = 'po';

create table if not exists "SchoolPath" (
  "userId" text primary key references "User"(id) on delete cascade,
  modes jsonb not null default '{}'::jsonb,       -- module id -> 'prove' | 'learn'
  answers jsonb not null default '{}'::jsonb,     -- where the student said they start
  "committedAt" timestamptz not null default now(),
  "lockedAt" timestamptz,                          -- set when the first proof exam is taken
  "updatedAt" timestamptz not null default now()
);
alter table "SchoolPath" enable row level security;
grant select, insert, update, delete on "SchoolPath" to flowhub_app;
revoke all on "SchoolPath" from anon, authenticated;
create policy flowhub_app_all on "SchoolPath" for all to flowhub_app using (true) with check (true);
