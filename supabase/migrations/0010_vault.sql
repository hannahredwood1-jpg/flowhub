-- The ECHO X ORBIT vault: one row per member Hannah has issued a code to.
-- The code itself is never stored, only its SHA-256 hash. "orderflow" is a second, separate approval for the sealed room (nobody has it yet).
create table if not exists "VaultAccess" (
  "userId" text primary key references "User"(id) on delete cascade,
  "codeHash" text not null,
  "codeHint" text not null,
  "issuedBy" text,
  "issuedAt" timestamptz not null default now(),
  "redeemedAt" timestamptz,
  "revokedAt" timestamptz,
  "mentorshipOverride" boolean not null default false,
  orderflow boolean not null default false,
  state jsonb,
  "updatedAt" timestamptz not null default now()
);
alter table "VaultAccess" enable row level security;
grant select, insert, update, delete on "VaultAccess" to flowhub_app;
revoke all on "VaultAccess" from anon, authenticated;
create policy flowhub_app_all on "VaultAccess" for all to flowhub_app using (true) with check (true);
