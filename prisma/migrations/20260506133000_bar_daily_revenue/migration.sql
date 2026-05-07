CREATE TABLE IF NOT EXISTS "BarDailyRevenue" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "date" DATE NOT NULL,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "closedTables" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BarDailyRevenue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BarDailyRevenue_date_key" ON "BarDailyRevenue"("date");
CREATE INDEX IF NOT EXISTS "BarDailyRevenue_date_idx" ON "BarDailyRevenue"("date");

ALTER TABLE "BarDailyRevenue" ENABLE ROW LEVEL SECURITY;
