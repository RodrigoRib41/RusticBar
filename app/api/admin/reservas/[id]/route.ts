import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import {
  ReservationError,
  deleteReservation,
  parseUpdateAdminReservationInput,
  updateReservation,
} from "../../../../../lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const input = parseUpdateAdminReservationInput(await request.json());
    const result = await updateReservation(id, input, { requirePhone: false });

    return NextResponse.json(result);
  } catch (error) {
    return reservationErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const reservation = await deleteReservation(id);

    return NextResponse.json({ reservation });
  } catch (error) {
    return reservationErrorResponse(error);
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

function reservationErrorResponse(error: unknown) {
  if (error instanceof ReservationError) {
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
      message: "No pudimos procesar la reserva.",
    },
    { status: 500 },
  );
}
