CREATE TABLE IF NOT EXISTS "EnabledReservationDay" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dayOfWeek" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EnabledReservationDay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EnabledReservationDay_dayOfWeek_check" CHECK ("dayOfWeek" >= 0 AND "dayOfWeek" <= 6)
);

CREATE UNIQUE INDEX IF NOT EXISTS "EnabledReservationDay_dayOfWeek_key" ON "EnabledReservationDay"("dayOfWeek");
CREATE INDEX IF NOT EXISTS "EnabledReservationDay_enabled_idx" ON "EnabledReservationDay"("enabled");

INSERT INTO "EnabledReservationDay" ("dayOfWeek", "enabled")
VALUES
  (0, true),
  (1, false),
  (2, false),
  (3, false),
  (4, true),
  (5, true),
  (6, true)
ON CONFLICT ("dayOfWeek") DO NOTHING;

ALTER TABLE "EnabledReservationDay" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'EnabledReservationDay'
      AND policyname = 'Allow public read enabled reservation days'
  ) THEN
    CREATE POLICY "Allow public read enabled reservation days"
      ON "EnabledReservationDay"
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
