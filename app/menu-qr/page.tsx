import type { Metadata } from "next";
import { MenuQrOrderApp } from "./MenuQrOrderApp";
import { getOrderProducts } from "./order-products";
import { getTableByToken } from "../../lib/tables";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rustic Pub | Pedidos QR",
  description: "Pedidos por mesa de Rustic Pub",
  robots: {
    index: false,
    follow: false,
  },
};

type MenuQrPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MenuQrPage({ searchParams }: MenuQrPageProps) {
  const params = await searchParams;
  const tokenParam = Array.isArray(params.token) ? params.token[0] : params.token;
  const [products, table] = await Promise.all([
    getOrderProducts(),
    tokenParam ? getTableByToken(tokenParam) : Promise.resolve(null),
  ]);

  return <MenuQrOrderApp products={products} table={table} />;
}
