import { MenuCategory as PrismaMenuCategory, Prisma } from "@prisma/client";
import { deleteMenuImage } from "./cloudinary";
import { getInitialMenuSeed } from "./menu-seed";
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  MENU_CATEGORY_NOTES,
  MENU_CATEGORY_OPTIONS,
  type MenuAdminView,
  type MenuCatalogGroup,
  type MenuCatalogItem,
  type MenuCatalogSection,
  type MenuCategory,
  type MenuItemView,
  type MenuSubcategoryView,
  type OrderProduct,
} from "./menu-types";
import { prisma } from "./prisma";

let menuSeedPromise: Promise<void> | null = null;

type MenuItemWithSubcategory = Prisma.MenuItemGetPayload<{
  include: {
    subcategory: true;
  };
}>;

type MenuSubcategoryWithCount = Prisma.MenuSubcategoryGetPayload<{
  include: {
    _count: {
      select: {
        items: true;
      };
    };
  };
}>;

type MenuItemInput = {
  active: boolean;
  category: MenuCategory;
  description: string;
  imagePublicId: string | null;
  imageUrl: string | null;
  priceCents: number;
  sortOrder?: number;
  subcategoryId: string | null;
  title: string;
};

type MenuSubcategoryInput = {
  category: MenuCategory;
  name: string;
  sortOrder?: number;
};

export class MenuError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "MenuError";
  }
}

export async function getMenuAdminView(filters: { category?: string; search?: string } = {}): Promise<MenuAdminView> {
  await ensureMenuSeeded();

  const category = filters.category ? parseMenuCategory(filters.category) : null;
  const search = typeof filters.search === "string" ? filters.search.trim() : "";
  const where: Prisma.MenuItemWhereInput = {
    deletedAt: null,
  };

  if (category) {
    where.category = category as PrismaMenuCategory;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      {
        subcategory: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const [items, subcategories] = await Promise.all([
    prisma.menuItem.findMany({
      include: {
        subcategory: true,
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      where,
    }),
    prisma.menuSubcategory.findMany({
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    categories: MENU_CATEGORY_OPTIONS,
    items: items.map(serializeMenuItem),
    subcategories: subcategories.map(serializeMenuSubcategory),
  };
}

export async function getMenuCatalog(): Promise<MenuCatalogSection[]> {
  await ensureMenuSeeded();

  const [items, subcategories] = await Promise.all([
    prisma.menuItem.findMany({
      include: {
        subcategory: true,
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      where: {
        active: true,
        deletedAt: null,
      },
    }),
    prisma.menuSubcategory.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return MENU_CATEGORIES.map((category) => {
    const categoryItems = items.filter((item) => toMenuCategory(item.category) === category);
    const categorySubcategories = subcategories.filter((subcategory) => toMenuCategory(subcategory.category) === category);
    const groups: MenuCatalogGroup[] = [];

    const withoutSubcategory = categoryItems.filter((item) => !item.subcategoryId);

    if (withoutSubcategory.length) {
      groups.push({
        id: `${category}-general`,
        items: withoutSubcategory.map(toCatalogItem),
        title: "General",
      });
    }

    categorySubcategories.forEach((subcategory) => {
      const groupItems = categoryItems.filter((item) => item.subcategoryId === subcategory.id);

      if (groupItems.length) {
        groups.push({
          id: subcategory.id,
          items: groupItems.map(toCatalogItem),
          title: subcategory.name,
        });
      }
    });

    return {
      groups,
      note: MENU_CATEGORY_NOTES[category],
      slug: category,
      title: MENU_CATEGORY_LABELS[category],
    };
  });
}

export async function getOrderProducts(): Promise<OrderProduct[]> {
  await ensureMenuSeeded();

  const items = await prisma.menuItem.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    where: {
      active: true,
      deletedAt: null,
    },
  });

  return items.map((item) => {
    const category = toMenuCategory(item.category);

    return {
      category: MENU_CATEGORY_LABELS[category],
      categorySlug: category,
      description: item.description,
      id: item.id,
      image: item.imageUrl,
      name: item.title,
      price: item.priceCents,
    };
  });
}

export async function createMenuItem(payload: unknown): Promise<MenuItemView> {
  const input = parseMenuItemInput(payload);

  await ensureSubcategoryMatches(input.subcategoryId, input.category);

  const sortOrder = input.sortOrder ?? (await nextItemSortOrder(input.category));
  const item = await prisma.menuItem.create({
    data: {
      active: input.active,
      category: input.category as PrismaMenuCategory,
      description: input.description,
      imagePublicId: input.imagePublicId,
      imageUrl: input.imageUrl,
      priceCents: input.priceCents,
      sortOrder,
      subcategoryId: input.subcategoryId,
      title: input.title,
    },
    include: {
      subcategory: true,
    },
  });

  return serializeMenuItem(item);
}

export async function updateMenuItem(id: string, payload: unknown): Promise<MenuItemView> {
  const input = parseMenuItemInput(payload);
  const current = await getExistingMenuItem(id);

  await ensureSubcategoryMatches(input.subcategoryId, input.category);

  const item = await prisma.menuItem.update({
    data: {
      active: input.active,
      category: input.category as PrismaMenuCategory,
      description: input.description,
      imagePublicId: input.imagePublicId,
      imageUrl: input.imageUrl,
      priceCents: input.priceCents,
      sortOrder: input.sortOrder ?? current.sortOrder,
      subcategoryId: input.subcategoryId,
      title: input.title,
    },
    include: {
      subcategory: true,
    },
    where: {
      id,
    },
  });

  if (current.imagePublicId && current.imagePublicId !== input.imagePublicId) {
    void deleteMenuImage(current.imagePublicId).catch((error) => {
      console.warn("Could not delete replaced Cloudinary image", error);
    });
  }

  return serializeMenuItem(item);
}

export async function deleteMenuItem(id: string): Promise<MenuItemView> {
  let item: MenuItemWithSubcategory;

  try {
    item = await prisma.menuItem.update({
      data: {
        active: false,
        deletedAt: new Date(),
      },
      include: {
        subcategory: true,
      },
      where: {
        id,
      },
    });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      throw new MenuError("not_found", "No encontramos ese producto.", 404);
    }

    throw error;
  }

  if (item.imagePublicId) {
    void deleteMenuImage(item.imagePublicId).catch((error) => {
      console.warn("Could not delete Cloudinary image", error);
    });
  }

  return serializeMenuItem(item);
}

export async function createMenuSubcategory(payload: unknown): Promise<MenuSubcategoryView> {
  const input = parseMenuSubcategoryInput(payload);
  const sortOrder = input.sortOrder ?? (await nextSubcategorySortOrder(input.category));

  try {
    const subcategory = await prisma.menuSubcategory.create({
      data: {
        category: input.category as PrismaMenuCategory,
        name: input.name,
        slug: slugify(input.name),
        sortOrder,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    return serializeMenuSubcategory(subcategory);
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new MenuError("duplicate_subcategory", "Ya existe una subcategoria con ese nombre en esa categoria.");
    }

    throw error;
  }
}

export async function updateMenuSubcategory(id: string, payload: unknown): Promise<MenuSubcategoryView> {
  const input = parseMenuSubcategoryInput(payload);
  await getExistingSubcategory(id);

  try {
    const subcategory = await prisma.menuSubcategory.update({
      data: {
        category: input.category as PrismaMenuCategory,
        name: input.name,
        slug: slugify(input.name),
        sortOrder: input.sortOrder,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      where: {
        id,
      },
    });

    return serializeMenuSubcategory(subcategory);
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new MenuError("duplicate_subcategory", "Ya existe una subcategoria con ese nombre en esa categoria.");
    }

    throw error;
  }
}

export async function deleteMenuSubcategory(id: string): Promise<MenuSubcategoryView> {
  const current = await getExistingSubcategory(id);

  await prisma.menuSubcategory.delete({
    where: {
      id,
    },
  });

  return serializeMenuSubcategory(current);
}

export function parseMenuCategory(value: string): MenuCategory {
  if (MENU_CATEGORIES.includes(value as MenuCategory)) {
    return value as MenuCategory;
  }

  throw new MenuError("invalid_category", "Categoria de menu invalida.");
}

export function formatMenuPrice(value: number) {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function parseMenuItemInput(payload: unknown): MenuItemInput {
  const body = asRecord(payload);
  const title = parseRequiredString(body.title, "Titulo", 2, 90);
  const description = parseRequiredString(body.description, "Descripcion", 2, 320);
  const priceCents = parsePriceToCents(body.priceCents ?? body.price);
  const category = parseMenuCategory(typeof body.category === "string" ? body.category : "");
  const subcategoryId = parseNullableString(body.subcategoryId, 80);
  const imageUrl = parseNullableUrl(body.imageUrl);
  const imagePublicId = parseNullableString(body.imagePublicId, 255);
  const active = typeof body.active === "boolean" ? body.active : true;
  const sortOrder = parseOptionalInteger(body.sortOrder, 0, 100000);

  return {
    active,
    category,
    description,
    imagePublicId,
    imageUrl,
    priceCents,
    sortOrder,
    subcategoryId,
    title,
  };
}

function parseMenuSubcategoryInput(payload: unknown): MenuSubcategoryInput {
  const body = asRecord(payload);
  const name = parseRequiredString(body.name, "Subcategoria", 2, 60);
  const category = parseMenuCategory(typeof body.category === "string" ? body.category : "");
  const sortOrder = parseOptionalInteger(body.sortOrder, 0, 100000);

  return {
    category,
    name,
    sortOrder,
  };
}

async function ensureSubcategoryMatches(subcategoryId: string | null, category: MenuCategory) {
  if (!subcategoryId) {
    return;
  }

  const subcategory = await prisma.menuSubcategory.findUnique({
    where: {
      id: subcategoryId,
    },
  });

  if (!subcategory) {
    throw new MenuError("subcategory_not_found", "No encontramos esa subcategoria.", 404);
  }

  if (toMenuCategory(subcategory.category) !== category) {
    throw new MenuError("subcategory_mismatch", "La subcategoria no pertenece a la categoria seleccionada.");
  }
}

async function getExistingMenuItem(id: string) {
  try {
    return await prisma.menuItem.findFirstOrThrow({
      where: {
        id,
        deletedAt: null,
      },
    });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      throw new MenuError("not_found", "No encontramos ese producto.", 404);
    }

    throw error;
  }
}

async function getExistingSubcategory(id: string): Promise<MenuSubcategoryWithCount> {
  try {
    return await prisma.menuSubcategory.findUniqueOrThrow({
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      where: {
        id,
      },
    });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      throw new MenuError("not_found", "No encontramos esa subcategoria.", 404);
    }

    throw error;
  }
}

async function nextItemSortOrder(category: MenuCategory) {
  const result = await prisma.menuItem.aggregate({
    _max: {
      sortOrder: true,
    },
    where: {
      category: category as PrismaMenuCategory,
    },
  });

  return (result._max.sortOrder ?? 0) + 10;
}

async function nextSubcategorySortOrder(category: MenuCategory) {
  const result = await prisma.menuSubcategory.aggregate({
    _max: {
      sortOrder: true,
    },
    where: {
      category: category as PrismaMenuCategory,
    },
  });

  return (result._max.sortOrder ?? 0) + 10;
}

function serializeMenuItem(item: MenuItemWithSubcategory): MenuItemView {
  const category = toMenuCategory(item.category);

  return {
    active: item.active,
    category,
    categoryLabel: MENU_CATEGORY_LABELS[category],
    createdAt: item.createdAt.toISOString(),
    description: item.description,
    id: item.id,
    imagePublicId: item.imagePublicId,
    imageUrl: item.imageUrl,
    price: formatMenuPrice(item.priceCents),
    priceCents: item.priceCents,
    sortOrder: item.sortOrder,
    subcategoryId: item.subcategoryId,
    subcategoryName: item.subcategory?.name ?? null,
    title: item.title,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeMenuSubcategory(subcategory: MenuSubcategoryWithCount): MenuSubcategoryView {
  const category = toMenuCategory(subcategory.category);

  return {
    category,
    categoryLabel: MENU_CATEGORY_LABELS[category],
    createdAt: subcategory.createdAt.toISOString(),
    id: subcategory.id,
    itemCount: subcategory._count.items,
    name: subcategory.name,
    slug: subcategory.slug,
    sortOrder: subcategory.sortOrder,
    updatedAt: subcategory.updatedAt.toISOString(),
  };
}

function toCatalogItem(item: MenuItemWithSubcategory): MenuCatalogItem {
  return {
    description: item.description,
    id: item.id,
    image: item.imageUrl,
    name: item.title,
    price: formatMenuPrice(item.priceCents),
  };
}

function toMenuCategory(value: PrismaMenuCategory | string): MenuCategory {
  return parseMenuCategory(value);
}

function parsePriceToCents(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return validatePrice(Math.round(value));
  }

  if (typeof value !== "string") {
    throw new MenuError("invalid_price", "Ingresa un precio valido.");
  }

  const digits = value.replace(/[^\d]/g, "");

  if (!digits) {
    throw new MenuError("invalid_price", "Ingresa un precio valido.");
  }

  return validatePrice(Number(digits));
}

function validatePrice(value: number) {
  if (!Number.isInteger(value) || value <= 0 || value > 10000000) {
    throw new MenuError("invalid_price", "Ingresa un precio numerico valido.");
  }

  return value;
}

function parseRequiredString(value: unknown, label: string, minLength: number, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";

  if (text.length < minLength || text.length > maxLength) {
    throw new MenuError("invalid_field", `${label} debe tener entre ${minLength} y ${maxLength} caracteres.`);
  }

  return text;
}

function parseNullableString(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new MenuError("invalid_field", "Hay un valor invalido.");
  }

  return value.trim();
}

function parseNullableUrl(value: unknown) {
  const text = parseNullableString(value, 1000);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Invalid protocol");
    }

    return url.toString();
  } catch {
    throw new MenuError("invalid_image", "La imagen no tiene una URL valida.");
  }
}

function parseOptionalInteger(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new MenuError("invalid_sort", "El orden debe ser un numero valido.");
  }

  return parsed;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureMenuSeeded() {
  if (menuSeedPromise) {
    return menuSeedPromise;
  }

  menuSeedPromise = seedMenuIfEmpty().catch((error) => {
    menuSeedPromise = null;
    throw error;
  });

  return menuSeedPromise;
}

async function seedMenuIfEmpty() {
  const itemCount = await prisma.menuItem.count({
    where: {
      deletedAt: null,
    },
  });

  if (itemCount > 0) {
    return;
  }

  const seed = getInitialMenuSeed();

  await prisma.$transaction(async (tx) => {
    const subcategoryIds = new Map<string, string>();

    for (const subcategory of seed.subcategories) {
      const created = await tx.menuSubcategory.upsert({
        create: {
          category: subcategory.category as PrismaMenuCategory,
          name: subcategory.name,
          slug: subcategory.slug,
          sortOrder: subcategory.sortOrder,
        },
        update: {
          name: subcategory.name,
          sortOrder: subcategory.sortOrder,
        },
        where: {
          category_slug: {
            category: subcategory.category as PrismaMenuCategory,
            slug: subcategory.slug,
          },
        },
      });

      subcategoryIds.set(`${subcategory.category}:${subcategory.slug}`, created.id);
    }

    await tx.menuItem.createMany({
      data: seed.items.map((item) => ({
        active: true,
        category: item.category as PrismaMenuCategory,
        description: item.description,
        imageUrl: item.imageUrl,
        priceCents: item.priceCents,
        sortOrder: item.sortOrder,
        subcategoryId: subcategoryIds.get(`${item.category}:${item.subcategorySlug}`) ?? null,
        title: item.title,
      })),
    });
  });
}
