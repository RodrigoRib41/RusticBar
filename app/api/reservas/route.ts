import { NextResponse } from "next/server";
import {
  ReservationError,
  createReservation,
  getAvailability,
  parseCreateReservationInput,
} from "../../../lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = parseCreateReservationInput(await request.json());
    const result = await createReservation(input);

    return NextResponse.json(
      {
        reservation: result.reservation,
        availability: result.availability,
      },
      { status: 201 },
    );
  } catch (error) {
    return reservationErrorResponse(error);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const availability = await getAvailability(searchParams.get("date") ?? undefined);

  return NextResponse.json(availability, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
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
