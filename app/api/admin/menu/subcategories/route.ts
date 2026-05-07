import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import { MenuError, createMenuSubcategory, getMenuAdminView } from "../../../../../lib/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const subcategory = await createMenuSubcategory(await request.json());
    const menu = await getMenuAdminView();

    return NextResponse.json({ menu, subcategory }, { status: 201 });
  } catch (error) {
    return menuErrorResponse(error, "No pudimos crear la subcategoria.");
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
