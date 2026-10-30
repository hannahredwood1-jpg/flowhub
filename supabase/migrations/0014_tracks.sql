-- The Trading School becomes three tracks: Trading Fundamentals (the school), INVERTIX (its own page, opened by the fundamentals certificate)
-- and ECHO X ORBIT (the vault). Pace is kept per track, and INVERTIX gets its own saved progress.
alter table "SchoolPace" add column if not exists track text not null default 'fundamentals';
alter table "SchoolPace" drop constraint if exists "SchoolPace_pkey";
alter table "SchoolPace" add primary key ("userId", track);

create table if not exists "TrackProgress" (
  "userId" text not null references "User"(id) on delete cascade,
  track text not null check (track in ('invertix')),
  state jsonb not null default '{}'::jsonb,
  "updatedAt" timestamptz not null default now(),
  primary key ("userId", track)
);
alter table "TrackProgress" enable row level security;
grant select, insert, update, delete on "TrackProgress" to flowhub_app;
revoke all on "TrackProgress" from anon, authenticated;
create policy flowhub_app_all on "TrackProgress" for all to flowhub_app using (true) with check (true);

-- INVERTIX progress already saved inside the fundamentals school moves to the INVERTIX track (the originals are dropped from the school's saved state the next time a student syncs).
insert into "TrackProgress" ("userId", track, state)
select sp."userId", 'invertix',
       jsonb_build_object('v2', jsonb_build_object('m', m.mods))
from "SchoolProgress" sp
cross join lateral (select case when jsonb_typeof(sp.state) = 'string' then (sp.state #>> '{}')::jsonb else sp.state end as st) j
cross join lateral (
  select jsonb_object_agg(e.key, e.value) as mods
  from jsonb_each(coalesce(j.st->'v2'->'m', '{}'::jsonb)) e
  where e.key in ('m43', 'm44', 'm45', 'm46', 'm47')
) m
where m.mods is not null
on conflict ("userId", track) do nothing;
