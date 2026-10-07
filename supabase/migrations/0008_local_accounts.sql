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
