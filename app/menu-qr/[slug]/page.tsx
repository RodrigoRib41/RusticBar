import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuCategoryPage } from "../../components/MenuCategoryPage";
import { getMenuCatalog } from "../../../lib/menu";
import { MENU_CATEGORIES, type MenuCategory } from "../../../lib/menu-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function generateStaticParams() {
  return MENU_CATEGORIES.map((category) => ({
    slug: category,
  }));
}

export default async function MenuQrSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = normalizeCategorySlug(slug);

  if (!category) {
    notFound();
  }

  const sections = await getMenuCatalog();
  const section = sections.find((section) => section.slug === category);

  if (!section) {
    notFound();
  }

  return <MenuCategoryPage section={section} />;
}

function normalizeCategorySlug(value: string): MenuCategory | null {
  if (MENU_CATEGORIES.includes(value as MenuCategory)) {
    return value as MenuCategory;
  }

  const aliases: Record<string, MenuCategory> = {
    bebidas: "bebida",
    comidas: "comida",
    postres: "postre",
    promos: "promo",
  };

  return aliases[value] ?? null;
}
