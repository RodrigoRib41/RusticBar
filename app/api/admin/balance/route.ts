import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import {
  BalanceError,
  getBalance,
  parseBalanceFilters,
  parseBalanceResetInput,
  resetBalanceHistory,
} from "../../../../lib/balance";

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

  try {
    const balance = await getBalance(parseBalanceFilters(request.nextUrl.searchParams));

    return NextResponse.json(
      { balance },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return balanceErrorResponse(error, "No pudimos cargar el balance.");
  }
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
    parseBalanceResetInput(await request.json());
    const deletedCount = await resetBalanceHistory();

    return NextResponse.json({ deletedCount });
  } catch (error) {
    return balanceErrorResponse(error, "No pudimos reiniciar el balance.");
  }
}

function balanceErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof BalanceError) {
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
