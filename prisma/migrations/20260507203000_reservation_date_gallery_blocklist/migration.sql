ALTER TABLE "ReservationDayCapacity"
  ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN;

CREATE INDEX IF NOT EXISTS "ReservationDayCapacity_enabled_idx" ON "ReservationDayCapacity"("enabled");

CREATE TABLE IF NOT EXISTS "BlockedEmail" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "reason" TEXT,
  "blockedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BlockedEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlockedEmail_email_key" ON "BlockedEmail"("email");
CREATE INDEX IF NOT EXISTS "BlockedEmail_email_idx" ON "BlockedEmail"("email");
CREATE INDEX IF NOT EXISTS "BlockedEmail_createdAt_idx" ON "BlockedEmail"("createdAt");

ALTER TABLE "BlockedEmail" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "HomeGalleryImage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "imageUrl" TEXT NOT NULL,
  "imagePublicId" TEXT NOT NULL,
  "alt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HomeGalleryImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HomeGalleryImage_sortOrder_idx" ON "HomeGalleryImage"("sortOrder");
CREATE INDEX IF NOT EXISTS "HomeGalleryImage_createdAt_idx" ON "HomeGalleryImage"("createdAt");

ALTER TABLE "HomeGalleryImage" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'HomeGalleryImage'
      AND policyname = 'Allow public read home gallery images'
  ) THEN
    CREATE POLICY "Allow public read home gallery images"
      ON "HomeGalleryImage"
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
