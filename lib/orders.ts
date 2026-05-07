import { Pedido, PedidoItem, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getTodayDateString } from "./reservations";
import { getTableByToken, normalizeTableToken } from "./tables";

export const TABLE_COUNT = 20;
export const COMPLETED_ORDER_VISIBILITY_MINUTES = 10;

export const ORDER_STATES = ["pendiente", "preparando", "entregado"] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export type OrderItemInput = {
  nombre: string;
  precio: number;
  cantidad: number;
};

export type CreateOrderInput = {
  customerName: string;
  items: OrderItemInput[];
  tableToken: string;
};

export type PedidoView = {
  id: string;
  mesa: number;
  estado: OrderState;
  total: number;
  customerName: string;
  completedAt: string | null;
  createdAt: string;
  items: {
    id: string;
    nombre: string;
    precio: number;
    cantidad: number;
  }[];
};

export type PublicPedidoView = Omit<PedidoView, "customerName">;

export type ResetMesaResult = {
  deletedCount: number;
  mesa: number;
  revenueAmount: number;
  revenueOrderCount: number;
  revenueDate: string;
};

type PedidoWithItems = Pedido & {
  items: PedidoItem[];
};

export class OrderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export function parseCreateOrderInput(payload: unknown): CreateOrderInput {
  const body = asRecord(payload);
  const tableToken = normalizeTableToken(typeof body.tableToken === "string" ? body.tableToken : "");
  const customerName = parseCustomerName(body.customerName);
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!tableToken) {
    throw new OrderError("invalid_table", "QR invalido. Mesa no reconocida.", 400);
  }

  if (rawItems.length === 0) {
    throw new OrderError("empty_cart", "El carrito esta vacio.");
  }

  if (rawItems.length > 40) {
    throw new OrderError("too_many_items", "El pedido tiene demasiados productos.");
  }

  const items = rawItems.map(parseOrderItem);

  return { customerName, items, tableToken };
}

export function parseOrderStateInput(payload: unknown): OrderState {
  const body = asRecord(payload);
  const estado = typeof body.estado === "string" ? body.estado : "";

  if (!isOrderState(estado)) {
    throw new OrderError("invalid_state", "Estado de pedido invalido.");
  }

  return estado;
}

export async function createPedido(input: CreateOrderInput) {
  const orderInput = parseCreateOrderInput(input);
  const table = await getTableByToken(orderInput.tableToken);

  if (!table) {
    throw new OrderError("invalid_table", "QR invalido. Mesa no reconocida.", 400);
  }

  const total = calculateTotal(orderInput.items);

  const pedido = await prisma.$transaction(async (tx) => {
    const created = await tx.pedido.create({
      data: {
        customerName: orderInput.customerName,
        estado: "pendiente",
        items: {
          create: orderInput.items.map((item) => ({
            cantidad: item.cantidad,
            nombre: item.nombre,
            precio: item.precio,
          })),
        },
        mesa: table.mesa,
        total,
      },
      include: {
        items: true,
      },
    });

    await tx.orderSignal.create({
      data: {
        type: "pedido_created",
      },
    });

    return created;
  });

  return serializePedido(pedido);
}

export async function listPedidos() {
  const pedidos = await prisma.pedido.findMany({
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return pedidos.map(serializePedido);
}

export async function listPedidosByTableToken(tableToken: string): Promise<PublicPedidoView[]> {
  const table = await getTableByToken(tableToken);

  if (!table) {
    throw new OrderError("invalid_table", "QR invalido. Mesa no reconocida.", 400);
  }

  const completedVisibilityCutoff = new Date(
    Date.now() - COMPLETED_ORDER_VISIBILITY_MINUTES * 60 * 1000,
  );

  const pedidos = await prisma.pedido.findMany({
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    where: {
      mesa: table.mesa,
      OR: [
        {
          estado: {
            not: "entregado",
          },
        },
        {
          completedAt: {
            gte: completedVisibilityCutoff,
          },
        },
      ],
    },
  });

  return pedidos.map((pedido) => toPublicPedido(serializePedido(pedido)));
}

export async function updatePedidoEstado(id: string, estado: OrderState) {
  try {
    const pedido = await prisma.pedido.update({
      data: {
        completedAt: estado === "entregado" ? new Date() : null,
        estado,
      },
      include: {
        items: true,
      },
      where: { id },
    });

    return serializePedido(pedido);
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      throw new OrderError("not_found", "No encontramos ese pedido.", 404);
    }

    throw error;
  }
}

export async function deletePedido(id: string) {
  try {
    const pedido = await prisma.pedido.delete({
      include: {
        items: true,
      },
      where: { id },
    });

    return serializePedido(pedido);
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      throw new OrderError("not_found", "No encontramos ese pedido.", 404);
    }

    throw error;
  }
}

export async function resetPedidosByMesa(mesa: number): Promise<ResetMesaResult> {
  validateMesa(mesa);
  const revenueDate = getTodayDateString();

  const result = await prisma.$transaction(async (tx) => {
    const deliveredTotal = await tx.pedido.aggregate({
      _count: {
        _all: true,
      },
      _sum: {
        total: true,
      },
      where: {
        estado: "entregado",
        mesa,
      },
    });
    const deleted = await tx.pedido.deleteMany({
      where: { mesa },
    });
    const revenueAmount = deliveredTotal._sum.total ?? 0;
    const revenueOrderCount = deliveredTotal._count._all;

    if (revenueOrderCount > 0 && revenueAmount > 0) {
      await tx.barDailyRevenue.upsert({
        create: {
          closedTables: 1,
          date: dateToDatabaseValue(revenueDate),
          total: revenueAmount,
        },
        update: {
          closedTables: {
            increment: 1,
          },
          total: {
            increment: revenueAmount,
          },
        },
        where: {
          date: dateToDatabaseValue(revenueDate),
        },
      });
    }

    return {
      deletedCount: deleted.count,
      revenueAmount,
      revenueOrderCount,
    };
  });

  return {
    deletedCount: result.deletedCount,
    mesa,
    revenueAmount: result.revenueAmount,
    revenueOrderCount: result.revenueOrderCount,
    revenueDate,
  };
}

export function serializePedido(pedido: PedidoWithItems): PedidoView {
  const estado = isOrderState(pedido.estado) ? pedido.estado : "pendiente";

  return {
    completedAt: pedido.completedAt?.toISOString() ?? null,
    createdAt: pedido.createdAt.toISOString(),
    customerName: pedido.customerName,
    estado,
    id: pedido.id,
    items: pedido.items.map((item) => ({
      cantidad: item.cantidad,
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
    })),
    mesa: pedido.mesa,
    total: pedido.total,
  };
}

export function toPublicPedido(pedido: PedidoView): PublicPedidoView {
  return {
    completedAt: pedido.completedAt,
    createdAt: pedido.createdAt,
    estado: pedido.estado,
    id: pedido.id,
    items: pedido.items,
    mesa: pedido.mesa,
    total: pedido.total,
  };
}

function parseOrderItem(payload: unknown): OrderItemInput {
  const body = asRecord(payload);
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const precio = Number(body.precio);
  const cantidad = Number(body.cantidad);

  if (nombre.length < 2 || nombre.length > 120) {
    throw new OrderError("invalid_item", "Hay un producto invalido.");
  }

  if (!Number.isFinite(precio) || precio <= 0 || precio > 1000000) {
    throw new OrderError("invalid_price", "Hay un precio invalido.");
  }

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
    throw new OrderError("invalid_quantity", "Hay una cantidad invalida.");
  }

  return {
    cantidad,
    nombre,
    precio,
  };
}

function parseCustomerName(payload: unknown) {
  const value = typeof payload === "string" ? sanitizeCustomerName(payload) : "";

  if (value.length < 3 || value.length > 24) {
    throw new OrderError("invalid_customer", "Ingresa una sola palabra valida.", 400);
  }

  return value;
}

function sanitizeCustomerName(value: string) {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function calculateTotal(items: OrderItemInput[]) {
  return items.reduce((total, item) => total + item.precio * item.cantidad, 0);
}

function validateMesa(mesa: number) {
  if (!Number.isInteger(mesa) || mesa < 1 || mesa > TABLE_COUNT) {
    throw new OrderError("invalid_table", "QR invalido. Mesa no reconocida.", 400);
  }
}

function dateToDatabaseValue(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function isOrderState(value: string): value is OrderState {
  return ORDER_STATES.includes(value as OrderState);
}

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
