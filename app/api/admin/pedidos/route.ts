import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import { OrderError, listPedidos, resetPedidosByMesa } from "../../../../lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      {
        code: "unauthorized",
        message: "Necesitas iniciar sesion.",
      },
      { status: 401 },
    );
  }

  const pedidos = await listPedidos();

  return NextResponse.json(
    { pedidos },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function DELETE(request: NextRequest) {
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
    const mesa = Number(request.nextUrl.searchParams.get("mesa"));
    const result = await resetPedidosByMesa(mesa);

    return NextResponse.json(result);
  } catch (error) {
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
        message: "No pudimos reiniciar los pedidos de la mesa.",
      },
      { status: 500 },
    );
  }
}
