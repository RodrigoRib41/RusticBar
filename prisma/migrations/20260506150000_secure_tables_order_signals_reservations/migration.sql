ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'canceled';

ALTER TABLE "Reservation"
  ADD COLUMN IF NOT EXISTS "time" TEXT NOT NULL DEFAULT '21:00';

ALTER TABLE "Pedido"
  ADD COLUMN IF NOT EXISTS "customerName" TEXT NOT NULL DEFAULT 'Cliente';

CREATE TABLE IF NOT EXISTS "RestaurantTable" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "number" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantTable_number_key" ON "RestaurantTable"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantTable_token_key" ON "RestaurantTable"("token");
CREATE INDEX IF NOT EXISTS "RestaurantTable_token_idx" ON "RestaurantTable"("token");
CREATE INDEX IF NOT EXISTS "RestaurantTable_active_idx" ON "RestaurantTable"("active");

INSERT INTO "RestaurantTable" ("number", "token")
SELECT table_number, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
FROM generate_series(1, 20) AS table_number
ON CONFLICT ("number") DO NOTHING;

CREATE TABLE IF NOT EXISTS "OrderSignal" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderSignal_createdAt_idx" ON "OrderSignal"("createdAt");

ALTER TABLE "RestaurantTable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderSignal" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'OrderSignal'
      AND policyname = 'Allow realtime listeners to read order signals'
  ) THEN
    CREATE POLICY "Allow realtime listeners to read order signals"
      ON "OrderSignal"
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'OrderSignal'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE "OrderSignal";
    END IF;
  END IF;
END $$;
