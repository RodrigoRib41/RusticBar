import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import {
  ReservationError,
  createReservation,
  getAvailability,
  listReservations,
  parseCreateReservationInput,
} from "../../../../lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const reservations = await listReservations({ date });
  const availability = date ? await getAvailability(date) : null;

  return NextResponse.json(
    { availability, reservations },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const input = parseCreateReservationInput(await request.json());
    const result = await createReservation(input);

    return NextResponse.json(result, { status: 201 });
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
