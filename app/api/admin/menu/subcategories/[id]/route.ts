import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../../lib/admin-auth";
import {
  MenuError,
  deleteMenuSubcategory,
  getMenuAdminView,
  updateMenuSubcategory,
} from "../../../../../../lib/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubcategoryRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: SubcategoryRouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const subcategory = await updateMenuSubcategory(id, await request.json());
    const menu = await getMenuAdminView();

    return NextResponse.json({ menu, subcategory });
  } catch (error) {
    return menuErrorResponse(error, "No pudimos actualizar la subcategoria.");
  }
}

export async function DELETE(request: NextRequest, context: SubcategoryRouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const subcategory = await deleteMenuSubcategory(id);
    const menu = await getMenuAdminView();

    return NextResponse.json({ menu, subcategory });
  } catch (error) {
    return menuErrorResponse(error, "No pudimos eliminar la subcategoria.");
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
