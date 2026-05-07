import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import { OrderError, deletePedido, parseOrderStateInput, updatePedidoEstado } from "../../../../../lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      {
        code: "unauthorized",
        message: "Necesitas iniciar sesion.",
      },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const estado = parseOrderStateInput(await request.json());
    const pedido = await updatePedidoEstado(id, estado);

    return NextResponse.json({ pedido });
  } catch (error) {
    return orderErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      {
        code: "unauthorized",
        message: "Necesitas iniciar sesion.",
      },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const pedido = await deletePedido(id);

    return NextResponse.json({ pedido });
  } catch (error) {
    return orderErrorResponse(error, "No pudimos eliminar el pedido.");
  }
}

function orderErrorResponse(error: unknown, fallbackMessage = "No pudimos actualizar el pedido.") {
  if (error instanceof OrderError) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
      },
      { status: error.statusCode },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      code: "internal_error",
      message: fallbackMessage,
    },
    { status: 500 },
  );
}
