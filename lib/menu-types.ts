export const MENU_CATEGORIES = ["comida", "bebida", "postre", "promo"] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export type MenuCategoryOption = {
  label: string;
  value: MenuCategory;
};

export const MENU_CATEGORY_LABELS: Record<MenuCategory, string> = {
  bebida: "Bebidas",
  comida: "Comidas",
  postre: "Postres",
  promo: "Promos",
};

export const MENU_CATEGORY_NOTES: Record<MenuCategory, string> = {
  bebida: "Sin alcohol, cervezas, tragos y clasicos de barra",
  comida: "Clasicos de pub, minutas y platos para compartir",
  postre: "Final dulce para cerrar la ronda",
  promo: "Combos pensados para pedir rapido desde la mesa",
};

export const MENU_CATEGORY_OPTIONS: MenuCategoryOption[] = MENU_CATEGORIES.map((category) => ({
  label: MENU_CATEGORY_LABELS[category],
  value: category,
}));

export type MenuSubcategoryView = {
  id: string;
  name: string;
  slug: string;
  category: MenuCategory;
  categoryLabel: string;
  sortOrder: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MenuItemView = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  price: string;
  category: MenuCategory;
  categoryLabel: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MenuAdminView = {
  categories: MenuCategoryOption[];
  items: MenuItemView[];
  subcategories: MenuSubcategoryView[];
};

export type MenuCatalogItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string | null;
};

export type MenuCatalogGroup = {
  id: string;
  title: string;
  note?: string;
  items: MenuCatalogItem[];
};

export type MenuCatalogSection = {
  slug: MenuCategory;
  title: string;
  note: string;
  groups: MenuCatalogGroup[];
};

export type OrderProduct = {
  id: string;
  category: string;
  categorySlug: MenuCategory;
  name: string;
  description: string;
  price: number;
  image: string | null;
};
