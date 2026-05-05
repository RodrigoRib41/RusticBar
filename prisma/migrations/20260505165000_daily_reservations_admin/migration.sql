ALTER TABLE "Reservation"
  ADD COLUMN IF NOT EXISTS "date" DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE "Reservation"
  ALTER COLUMN "status" SET DEFAULT 'confirmed';

ALTER TABLE "Reservation"
  ALTER COLUMN "token" DROP NOT NULL;

ALTER TABLE "Reservation"
  ALTER COLUMN "tokenExpiration" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "Reservation_date_idx" ON "Reservation"("date");
CREATE INDEX IF NOT EXISTS "Reservation_status_date_idx" ON "Reservation"("status", "date");
