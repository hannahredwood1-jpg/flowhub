-- RLS is on for these tables, so flowhub_app also needs an allow policy (same as every other table).
create policy flowhub_app_all on "PracticeRep" for all to flowhub_app using (true) with check (true);
create policy flowhub_app_all on "PracticeState" for all to flowhub_app using (true) with check (true);
create policy flowhub_app_all on "SchoolProgress" for all to flowhub_app using (true) with check (true);
create policy flowhub_app_all on "SchoolAttempt" for all to flowhub_app using (true) with check (true);
create policy flowhub_app_all on "TradingPlan" for all to flowhub_app using (true) with check (true);
create policy flowhub_app_all on "MemberLog" for all to flowhub_app using (true) with check (true);
