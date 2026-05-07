ALTER TABLE "Pedido"
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Pedido_mesa_estado_idx" ON "Pedido"("mesa", "estado");
CREATE INDEX IF NOT EXISTS "Pedido_completedAt_idx" ON "Pedido"("completedAt");
