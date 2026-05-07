CREATE TABLE IF NOT EXISTS "ReservationDayCapacity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "date" DATE NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 40,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReservationDayCapacity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReservationDayCapacity_date_key" ON "ReservationDayCapacity"("date");
CREATE INDEX IF NOT EXISTS "ReservationDayCapacity_date_idx" ON "ReservationDayCapacity"("date");

ALTER TABLE "ReservationDayCapacity" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ReservationDayCapacity'
      AND policyname = 'Allow public read reservation day capacity'
  ) THEN
    CREATE POLICY "Allow public read reservation day capacity"
      ON "ReservationDayCapacity"
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
