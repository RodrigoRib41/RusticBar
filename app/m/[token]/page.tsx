import type { Metadata } from "next";
import { MenuQrOrderApp } from "../../menu-qr/MenuQrOrderApp";
import { getOrderProducts } from "../../menu-qr/order-products";
import { getTableByToken } from "../../../lib/tables";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rustic Pub | Mesa segura",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function SecureTableMenuPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [products, table] = await Promise.all([getOrderProducts(), getTableByToken(token)]);

  return <MenuQrOrderApp products={products} table={table} />;
}
