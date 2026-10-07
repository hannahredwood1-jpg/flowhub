-- Non-Discord (username + password) members, managed from the coach portal.
create table if not exists "LocalAccount" (
  "userId" text primary key references "User"(id) on delete cascade,
  username text not null unique,
  "passwordHash" text not null,
  "expiresAt" timestamptz,
  disabled boolean not null default false,
  "createdById" text,
  "createdAt" timestamptz not null default now()
);
alter table "LocalAccount" enable row level security;
grant select, insert, update, delete on "LocalAccount" to flowhub_app;
revoke all on "LocalAccount" from anon, authenticated;
create policy flowhub_app_all on "LocalAccount" for all to flowhub_app using (true) with check (true);

-- Email invites and resets
alter table "LocalAccount" alter column "passwordHash" drop not null;
alter table "LocalAccount" add column if not exists email text, add column if not exists days int, add column if not exists "activatedAt" timestamptz;
update "LocalAccount" set "activatedAt" = "createdAt" where "passwordHash" is not null and "activatedAt" is null;
create unique index if not exists localaccount_email_idx on "LocalAccount" (lower(email));
create table if not exists "LocalToken" (hash text primary key, "userId" text not null references "User"(id) on delete cascade, kind text not null, "expiresAt" timestamptz not null, "usedAt" timestamptz, "createdAt" timestamptz not null default now());
alter table "LocalToken" enable row level security;
grant select, insert, update, delete on "LocalToken" to flowhub_app;
revoke all on "LocalToken" from anon, authenticated;
create policy flowhub_app_all on "LocalToken" for all to flowhub_app using (true) with check (true);
