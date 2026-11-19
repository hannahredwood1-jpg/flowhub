-- The path a student chose after the Foundations ("orderflow" = the full course, "basic" = TradingView only).
-- The server connects as the flowhub_app role, so a new table needs BOTH a grant and a policy for that role (RLS is on).
CREATE TABLE IF NOT EXISTS "LearningPath" (
  "userId" text PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
  path text NOT NULL CHECK (path IN ('orderflow','basic')),
  "chosenAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "LearningPath" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "LearningPath" TO flowhub_app;
DROP POLICY IF EXISTS flowhub_app_all ON "LearningPath";
CREATE POLICY flowhub_app_all ON "LearningPath" FOR ALL TO flowhub_app USING (true) WITH CHECK (true);
