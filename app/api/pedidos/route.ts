import { NextResponse } from "next/server";
import {
  OrderError,
  createPedido,
  listPedidosByTableToken,
  parseCreateOrderInput,
  toPublicPedido,
} from "../../../lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableToken = searchParams.get("tableToken") ?? "";
    const pedidos = await listPedidosByTableToken(tableToken);

    return NextResponse.json(
      { pedidos },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return orderErrorResponse(error, "No pudimos cargar los pedidos.");
  }
}

export async function POST(request: Request) {
  try {
    const input = parseCreateOrderInput(await request.json());
    const pedido = await createPedido(input);

    return NextResponse.json({ pedido: toPublicPedido(pedido) }, { status: 201 });
  } catch (error) {
    return orderErrorResponse(error, "No pudimos enviar el pedido.");
  }
}

function orderErrorResponse(error: unknown, fallbackMessage: string) {
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
