-- Daily GEX levels for NQ, worked out from the NDX options chain by the server at 8:30 AM Eastern on weekdays.
create table if not exists "GexDaily" (
  day date not null,
  symbol text not null default 'NDX',
  levels jsonb not null,
  "feedLabel" text,
  "feedAt" timestamptz,
  "fetchedAt" timestamptz not null default now(),
  primary key (day, symbol)
);
alter table "GexDaily" enable row level security;
grant select, insert, update, delete on "GexDaily" to flowhub_app;
revoke all on "GexDaily" from anon, authenticated;
create policy flowhub_app_all on "GexDaily" for all to flowhub_app using (true) with check (true);
