-- Saved income projections (a member's multi-account trading plan). One per member.
CREATE TABLE "Projection" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "name" TEXT NOT NULL DEFAULT 'My plan',
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Same lock-down as every other table: only the app server's role can touch it
ALTER TABLE public."Projection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Projection" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Projection" TO flowhub_app;
CREATE POLICY flowhub_app_all ON public."Projection" FOR ALL TO flowhub_app USING (true) WITH CHECK (true);
