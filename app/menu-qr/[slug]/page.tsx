import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuCategoryPage } from "../../components/MenuCategoryPage";
import { getMenuSection, menuSections, type MenuSection } from "../../menu-data";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function generateStaticParams() {
  return menuSections.map((section) => ({
    slug: section.slug,
  }));
}

export default async function MenuQrSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = getMenuSection(slug as MenuSection["slug"]);

  if (!section) {
    notFound();
  }

  return <MenuCategoryPage section={section} />;
}
