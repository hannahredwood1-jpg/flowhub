-- The app connects as flowhub_app: give it access to the Practice, School and Plan tables (and the routine log).
grant select, insert, update, delete on "PracticeRep", "PracticeState", "SchoolProgress", "SchoolAttempt", "TradingPlan", "MemberLog" to flowhub_app;
revoke all on "PracticeRep", "PracticeState", "SchoolProgress", "SchoolAttempt", "TradingPlan" from anon, authenticated;
