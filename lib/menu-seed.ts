import { getSectionCover, menuSections } from "../app/menu-data";
import type { MenuCategory } from "./menu-types";

type SeedSubcategory = {
  category: MenuCategory;
  name: string;
  slug: string;
  sortOrder: number;
};

type SeedItem = {
  category: MenuCategory;
  description: string;
  imageUrl: string;
  priceCents: number;
  sortOrder: number;
  subcategorySlug: string;
  title: string;
};

const categoryBySectionSlug = {
  bebidas: "bebida",
  comidas: "comida",
  postres: "postre",
} as const satisfies Record<string, MenuCategory>;

export function getInitialMenuSeed() {
  const subcategories: SeedSubcategory[] = [];
  const items: SeedItem[] = [];

  menuSections.forEach((section) => {
    const category = categoryBySectionSlug[section.slug];

    section.groups.forEach((group, groupIndex) => {
      const subcategorySlug = slugify(group.title);

      subcategories.push({
        category,
        name: group.title,
        slug: subcategorySlug,
        sortOrder: (groupIndex + 1) * 10,
      });

      group.items.forEach((item, itemIndex) => {
        items.push({
          category,
          description: item.description,
          imageUrl: item.image,
          priceCents: parseSeedPrice(item.price),
          sortOrder: groupIndex * 100 + (itemIndex + 1) * 10,
          subcategorySlug,
          title: item.name,
        });
      });
    });
  });

  subcategories.push({
    category: "promo",
    name: "Promos",
    slug: "promos",
    sortOrder: 10,
  });

  items.push(
    {
      category: "promo",
      description: "Papas Rustic + 2 fernets para arrancar la mesa.",
      imageUrl: getSectionCover(menuSections[0]),
      priceCents: 18900,
      sortOrder: 10,
      subcategorySlug: "promos",
      title: "Promo previa",
    },
    {
      category: "promo",
      description: "Balde x6 + papas para compartir con amigos.",
      imageUrl: getSectionCover(menuSections[1]),
      priceCents: 24900,
      sortOrder: 20,
      subcategorySlug: "promos",
      title: "Promo grupo",
    },
    {
      category: "promo",
      description: "2 Rustic Burger + 2 pintas artesanales.",
      imageUrl: getSectionCover(menuSections[0]),
      priceCents: 29900,
      sortOrder: 30,
      subcategorySlug: "promos",
      title: "Promo cena",
    },
  );

  return { items, subcategories };
}

function parseSeedPrice(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
