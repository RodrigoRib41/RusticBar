import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import { MenuError, createMenuItem, getMenuAdminView } from "../../../../lib/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const menu = await getMenuAdminView({
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
    });

    return NextResponse.json(
      { menu },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return menuErrorResponse(error, "No pudimos cargar el menu.");
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const item = await createMenuItem(await request.json());
    const menu = await getMenuAdminView();

    return NextResponse.json({ item, menu }, { status: 201 });
  } catch (error) {
    return menuErrorResponse(error, "No pudimos crear el producto.");
  }
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      code: "unauthorized",
      message: "Necesitas iniciar sesion.",
    },
    { status: 401 },
  );
}

function menuErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MenuError) {
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
