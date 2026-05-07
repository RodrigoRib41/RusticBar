import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import { MenuError, deleteMenuItem, getMenuAdminView, updateMenuItem } from "../../../../../lib/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MenuItemRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: MenuItemRouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const item = await updateMenuItem(id, await request.json());
    const menu = await getMenuAdminView();

    return NextResponse.json({ item, menu });
  } catch (error) {
    return menuErrorResponse(error, "No pudimos actualizar el producto.");
  }
}

export async function DELETE(request: NextRequest, context: MenuItemRouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const item = await deleteMenuItem(id);
    const menu = await getMenuAdminView();

    return NextResponse.json({ item, menu });
  } catch (error) {
    return menuErrorResponse(error, "No pudimos eliminar el producto.");
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
