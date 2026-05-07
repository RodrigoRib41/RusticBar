ALTER TABLE "MenuItem"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "MenuItem_deletedAt_idx" ON "MenuItem"("deletedAt");
