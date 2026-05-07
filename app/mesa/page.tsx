import type { Metadata } from "next";
import { getMenuCatalog } from "../../lib/menu";
import { MesaMenuView } from "./MesaMenuView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rustic Pub | Menu de mesa",
  description: "Menu de Rustic Pub para consultar comidas, bebidas y postres.",
  alternates: {
    canonical: "/mesa",
  },
};

export default async function MesaMenuPage() {
  const sections = await getMenuCatalog();

  return <MesaMenuView sections={sections} />;
}
