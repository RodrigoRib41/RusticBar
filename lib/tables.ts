import { prisma } from "./prisma";

export type TableAccessView = {
  mesa: number;
  token: string;
};

export async function getTableByToken(token: string): Promise<TableAccessView | null> {
  const normalizedToken = normalizeTableToken(token);

  if (!normalizedToken) {
    return null;
  }

  const table = await prisma.restaurantTable.findFirst({
    select: {
      number: true,
      token: true,
    },
    where: {
      active: true,
      token: normalizedToken,
    },
  });

  return table ? { mesa: table.number, token: table.token } : null;
}

export async function listRestaurantTables() {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: {
      number: "asc",
    },
    select: {
      active: true,
      number: true,
      token: true,
    },
  });

  return tables.map((table) => ({
    active: table.active,
    mesa: table.number,
    token: table.token,
  }));
}

export function normalizeTableToken(token: string | null | undefined) {
  const value = typeof token === "string" ? token.trim() : "";

  if (!/^[a-zA-Z0-9_-]{24,140}$/.test(value)) {
    return "";
  }

  return value;
}
