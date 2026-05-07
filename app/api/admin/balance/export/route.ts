import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import { BalanceError, createBalanceExcel, getBalance, parseBalanceFilters } from "../../../../../lib/balance";

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
    const excel = createBalanceExcel(balance);
    const filename = `balance-rustic-${balance.startDate}-${balance.endDate}.xls`;

    return new NextResponse(excel, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      },
    });
  } catch (error) {
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
        message: "No pudimos exportar el balance.",
      },
      { status: 500 },
    );
  }
}
