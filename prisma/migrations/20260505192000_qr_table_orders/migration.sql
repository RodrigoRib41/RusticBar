CREATE TABLE IF NOT EXISTS "Pedido" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "mesa" INTEGER NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "total" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PedidoItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pedidoId" UUID NOT NULL,
  "nombre" TEXT NOT NULL,
  "precio" DOUBLE PRECISION NOT NULL,
  "cantidad" INTEGER NOT NULL,

  CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Pedido_mesa_idx" ON "Pedido"("mesa");
CREATE INDEX IF NOT EXISTS "Pedido_estado_idx" ON "Pedido"("estado");
CREATE INDEX IF NOT EXISTS "Pedido_createdAt_idx" ON "Pedido"("createdAt");
CREATE INDEX IF NOT EXISTS "PedidoItem_pedidoId_idx" ON "PedidoItem"("pedidoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PedidoItem_pedidoId_fkey'
      AND conrelid = '"PedidoItem"'::regclass
  ) THEN
    ALTER TABLE "PedidoItem"
      ADD CONSTRAINT "PedidoItem_pedidoId_fkey"
      FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PedidoItem" ENABLE ROW LEVEL SECURITY;
