DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MenuCategory') THEN
    CREATE TYPE "MenuCategory" AS ENUM ('comida', 'bebida', 'postre', 'promo');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MenuSubcategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" "MenuCategory" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MenuSubcategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MenuItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "category" "MenuCategory" NOT NULL,
  "subcategoryId" UUID,
  "imageUrl" TEXT,
  "imagePublicId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MenuSubcategory_category_slug_key" ON "MenuSubcategory"("category", "slug");
CREATE INDEX IF NOT EXISTS "MenuSubcategory_category_idx" ON "MenuSubcategory"("category");
CREATE INDEX IF NOT EXISTS "MenuSubcategory_sortOrder_idx" ON "MenuSubcategory"("sortOrder");
CREATE INDEX IF NOT EXISTS "MenuItem_active_idx" ON "MenuItem"("active");
CREATE INDEX IF NOT EXISTS "MenuItem_category_idx" ON "MenuItem"("category");
CREATE INDEX IF NOT EXISTS "MenuItem_subcategoryId_idx" ON "MenuItem"("subcategoryId");
CREATE INDEX IF NOT EXISTS "MenuItem_sortOrder_idx" ON "MenuItem"("sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuItem_subcategoryId_fkey'
  ) THEN
    ALTER TABLE "MenuItem"
      ADD CONSTRAINT "MenuItem_subcategoryId_fkey"
      FOREIGN KEY ("subcategoryId") REFERENCES "MenuSubcategory"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "MenuSubcategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'MenuSubcategory'
      AND policyname = 'Allow public read menu subcategories'
  ) THEN
    CREATE POLICY "Allow public read menu subcategories"
      ON "MenuSubcategory"
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'MenuItem'
      AND policyname = 'Allow public read active menu items'
  ) THEN
    CREATE POLICY "Allow public read active menu items"
      ON "MenuItem"
      FOR SELECT
      TO anon, authenticated
      USING ("active" = true);
  END IF;
END $$;

WITH subcategory_seed("name", "slug", "category", "sortOrder") AS (
  VALUES
    ('Para picar', 'para-picar', 'comida'::"MenuCategory", 10),
    ('Milanesas', 'milanesas', 'comida'::"MenuCategory", 20),
    ('Hamburguesas', 'hamburguesas', 'comida'::"MenuCategory", 30),
    ('Minutas', 'minutas', 'comida'::"MenuCategory", 40),
    ('Sin alcohol', 'sin-alcohol', 'bebida'::"MenuCategory", 10),
    ('Cervezas', 'cervezas', 'bebida'::"MenuCategory", 20),
    ('Tragos', 'tragos', 'bebida'::"MenuCategory", 30),
    ('Boliche', 'boliche', 'bebida'::"MenuCategory", 40),
    ('Dulces', 'dulces', 'postre'::"MenuCategory", 10),
    ('Promos', 'promos', 'promo'::"MenuCategory", 10)
)
INSERT INTO "MenuSubcategory" ("name", "slug", "category", "sortOrder")
SELECT "name", "slug", "category", "sortOrder"
FROM subcategory_seed
ON CONFLICT ("category", "slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "sortOrder" = EXCLUDED."sortOrder";

WITH item_seed("title", "description", "priceCents", "category", "subcategorySlug", "imageUrl", "sortOrder") AS (
  VALUES
    ('Papas Rustic', 'Papas doradas, cheddar, panceta crocante y verdeo.', 8900, 'comida'::"MenuCategory", 'para-picar', 'https://unsplash.com/photos/mFPlHlDLtUA/download?force=true&w=720', 10),
    ('Papas provenzal', 'Papas baston con ajo, perejil y dip de mayonesa casera.', 7500, 'comida'::"MenuCategory", 'para-picar', 'https://unsplash.com/photos/vi0kZuoe0-8/download?force=true&w=720', 20),
    ('Nachos del pub', 'Totopos, carne especiada, cheddar, pico de gallo y crema.', 10200, 'comida'::"MenuCategory", 'para-picar', 'https://unsplash.com/photos/FUmVP6PSSSs/download?force=true&w=720', 30),
    ('Rabas con alioli', 'Rabas tiernas con limon y alioli de la casa.', 12500, 'comida'::"MenuCategory", 'para-picar', 'https://unsplash.com/photos/COtv-D5osKA/download?force=true&w=720', 40),
    ('Bastones de muzza', 'Mozzarella rebozada, salsa fileto y toque de oregano.', 8700, 'comida'::"MenuCategory", 'para-picar', 'https://unsplash.com/photos/3AoHmfsKPa8/download?force=true&w=720', 50),
    ('Mila napolitana', 'Milanesa de carne, jamon, muzzarella, tomate y oregano.', 12900, 'comida'::"MenuCategory", 'milanesas', 'https://unsplash.com/photos/774GQuMpFnQ/download?force=true&w=720', 60),
    ('Mila cheddar', 'Cheddar fundido, panceta crocante y verdeo.', 13800, 'comida'::"MenuCategory", 'milanesas', 'https://unsplash.com/photos/Q9vMQoNm0bM/download?force=true&w=720', 70),
    ('Mila fugazzeta', 'Muzzarella, cebolla salteada y lluvia de oregano.', 13400, 'comida'::"MenuCategory", 'milanesas', 'https://unsplash.com/photos/NO-ewxS6tGY/download?force=true&w=720', 80),
    ('Suprema Rustic', 'Suprema de pollo con salsa cremosa, champis y papas.', 13200, 'comida'::"MenuCategory", 'milanesas', 'https://unsplash.com/photos/dRx5_RaePIo/download?force=true&w=720', 90),
    ('Rustic Burger', 'Doble carne, cheddar, panceta, cebolla crispy y BBQ.', 11900, 'comida'::"MenuCategory", 'hamburguesas', 'https://unsplash.com/photos/GzdWvD7ADWU/download?force=true&w=720', 100),
    ('Smash Clasica', 'Carne smash, queso americano, pickles y salsa secreta.', 9800, 'comida'::"MenuCategory", 'hamburguesas', 'https://unsplash.com/photos/0aYRypre3g4/download?force=true&w=720', 110),
    ('Blue Cheese', 'Doble carne, queso azul, cebolla caramelizada y rucula.', 12600, 'comida'::"MenuCategory", 'hamburguesas', 'https://unsplash.com/photos/B2E7uN08CEk/download?force=true&w=720', 120),
    ('Veggie Pub', 'Medallon veggie, queso, tomate, rucula y mayo ahumada.', 9500, 'comida'::"MenuCategory", 'hamburguesas', 'https://unsplash.com/photos/yE9Rq_KGrLI/download?force=true&w=720', 130),
    ('Lomito completo', 'Lomo, jamon, queso, huevo, lechuga, tomate y papas.', 12400, 'comida'::"MenuCategory", 'minutas', 'https://unsplash.com/photos/076m8JMwBsI/download?force=true&w=720', 140),
    ('Tostado mixto', 'Jamon y queso en pan de miga tostado con papas pay.', 6900, 'comida'::"MenuCategory", 'minutas', 'https://unsplash.com/photos/4NQrFtFBIaI/download?force=true&w=720', 150),
    ('Pizza muzzarella', 'Salsa de tomate, muzzarella, aceitunas y oregano.', 9900, 'comida'::"MenuCategory", 'minutas', 'https://unsplash.com/photos/DPrldCuaoJ8/download?force=true&w=720', 160),
    ('Gaseosa', 'Linea Coca-Cola, vaso o botella segun disponibilidad.', 2900, 'bebida'::"MenuCategory", 'sin-alcohol', 'https://unsplash.com/photos/uurg0rkdNjE/download?force=true&w=720', 10),
    ('Agua mineral', 'Con o sin gas.', 2400, 'bebida'::"MenuCategory", 'sin-alcohol', 'https://unsplash.com/photos/n9cmgm5xcgE/download?force=true&w=720', 20),
    ('Limonada Rustic', 'Limon, menta, jengibre y almibar suave.', 3800, 'bebida'::"MenuCategory", 'sin-alcohol', 'https://unsplash.com/photos/DTlDH3jF89k/download?force=true&w=720', 30),
    ('Pomelada', 'Pomelo exprimido, soda y toque de menta.', 3900, 'bebida'::"MenuCategory", 'sin-alcohol', 'https://unsplash.com/photos/Xf6Uc2rHp74/download?force=true&w=720', 40),
    ('Pinta artesanal', 'Consultanos por los estilos disponibles de la noche.', 4200, 'bebida'::"MenuCategory", 'cervezas', 'https://unsplash.com/photos/3Mcn6WhJVds/download?force=true&w=720', 50),
    ('Media pinta', 'Ideal para probar estilos.', 2900, 'bebida'::"MenuCategory", 'cervezas', 'https://unsplash.com/photos/WoVLtEVuWUg/download?force=true&w=720', 60),
    ('Balde x6', 'Seis botellas o latas seleccionadas.', 18500, 'bebida'::"MenuCategory", 'cervezas', 'https://unsplash.com/photos/RuHMDFzKpgs/download?force=true&w=720', 70),
    ('Corona', 'Botella con lima.', 5900, 'bebida'::"MenuCategory", 'cervezas', 'https://unsplash.com/photos/D6ZEf2YBqfE/download?force=true&w=720', 80),
    ('Fernet con cola', 'Clasico de barra servido en vaso largo.', 5800, 'bebida'::"MenuCategory", 'tragos', 'https://unsplash.com/photos/KtsmfnTyhTg/download?force=true&w=720', 90),
    ('Gin tonic', 'Gin, tonica premium y botanicos de estacion.', 6900, 'bebida'::"MenuCategory", 'tragos', 'https://unsplash.com/photos/AquVFyceuXk/download?force=true&w=720', 100),
    ('Campari orange', 'Campari, jugo de naranja y rodaja citrica.', 6200, 'bebida'::"MenuCategory", 'tragos', 'https://unsplash.com/photos/nY5DJyAcxE4/download?force=true&w=720', 110),
    ('Aperol spritz', 'Aperol, espumante, soda y naranja.', 7200, 'bebida'::"MenuCategory", 'tragos', 'https://unsplash.com/photos/58BUJo2VvyE/download?force=true&w=720', 120),
    ('Mojito', 'Ron, lima, menta, azucar y soda.', 6800, 'bebida'::"MenuCategory", 'tragos', 'https://unsplash.com/photos/T5Xqblq5KNk/download?force=true&w=720', 130),
    ('Cuba libre', 'Ron, cola y lima.', 5900, 'bebida'::"MenuCategory", 'tragos', 'https://unsplash.com/photos/KtsmfnTyhTg/download?force=true&w=720', 140),
    ('Vodka con energizante', 'Botella de vodka con 4 energizantes.', 42000, 'bebida'::"MenuCategory", 'boliche', 'https://unsplash.com/photos/T3fZK2TW9h0/download?force=true&w=720', 150),
    ('Champagne', 'Botella fria para la mesa.', 28000, 'bebida'::"MenuCategory", 'boliche', 'https://unsplash.com/photos/8a63U2IOCy0/download?force=true&w=720', 160),
    ('Whisky importado', 'Botella con hielo y mixer a eleccion.', 55000, 'bebida'::"MenuCategory", 'boliche', 'https://unsplash.com/photos/eEvdnaLCTjM/download?force=true&w=720', 170),
    ('Shots x6', 'Ronda de shots dulces o fuertes.', 12000, 'bebida'::"MenuCategory", 'boliche', 'https://unsplash.com/photos/CXOLY7UXSV4/download?force=true&w=720', 180),
    ('Brownie tibio', 'Con helado de crema americana y salsa de chocolate.', 5500, 'postre'::"MenuCategory", 'dulces', 'https://unsplash.com/photos/yacMYOlyvpw/download?force=true&w=720', 10),
    ('Flan casero', 'Con dulce de leche y crema.', 4800, 'postre'::"MenuCategory", 'dulces', 'https://unsplash.com/photos/PerJ_q-EuKw/download?force=true&w=720', 20),
    ('Panqueque con dulce', 'Panqueque caliente con dulce de leche y azucar impalpable.', 5200, 'postre'::"MenuCategory", 'dulces', 'https://unsplash.com/photos/H_tbutCB-rU/download?force=true&w=720', 30),
    ('Copa helada', 'Dos bochas, crema, salsa y crocante.', 5900, 'postre'::"MenuCategory", 'dulces', 'https://unsplash.com/photos/IsdL4-vMA3I/download?force=true&w=720', 40),
    ('Promo previa', 'Papas Rustic + 2 fernets para arrancar la mesa.', 18900, 'promo'::"MenuCategory", 'promos', 'https://unsplash.com/photos/mFPlHlDLtUA/download?force=true&w=720', 10),
    ('Promo grupo', 'Balde x6 + papas para compartir con amigos.', 24900, 'promo'::"MenuCategory", 'promos', 'https://unsplash.com/photos/uurg0rkdNjE/download?force=true&w=720', 20),
    ('Promo cena', '2 Rustic Burger + 2 pintas artesanales.', 29900, 'promo'::"MenuCategory", 'promos', 'https://unsplash.com/photos/mFPlHlDLtUA/download?force=true&w=720', 30)
)
INSERT INTO "MenuItem" (
  "title",
  "description",
  "priceCents",
  "category",
  "subcategoryId",
  "imageUrl",
  "sortOrder"
)
SELECT
  item_seed."title",
  item_seed."description",
  item_seed."priceCents",
  item_seed."category",
  subcategory."id",
  item_seed."imageUrl",
  item_seed."sortOrder"
FROM item_seed
LEFT JOIN "MenuSubcategory" subcategory
  ON subcategory."category" = item_seed."category"
  AND subcategory."slug" = item_seed."subcategorySlug"
WHERE NOT EXISTS (
  SELECT 1
  FROM "MenuItem" existing
  WHERE existing."category" = item_seed."category"
    AND existing."title" = item_seed."title"
);
