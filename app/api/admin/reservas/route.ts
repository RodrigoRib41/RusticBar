import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-auth";
import {
  ReservationError,
  createReservation,
  deleteReservationsByDate,
  getAvailability,
  listReservations,
  parseCreateAdminReservationInput,
  parseReservationCapacityInput,
  parseReservationDayDeleteInput,
  updateReservationDayCapacity,
} from "../../../../lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const date = request.nextUrl.searchParams.get("date") ?? undefined;
    const startDate = request.nextUrl.searchParams.get("startDate") ?? undefined;
    const endDate = request.nextUrl.searchParams.get("endDate") ?? undefined;
    const user = request.nextUrl.searchParams.get("user") ?? undefined;
    const reservations = await listReservations({ date, endDate, startDate, user });
    const availability = date ? await getAvailability(date) : null;

    return NextResponse.json(
      { availability, reservations },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return reservationErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const input = parseCreateAdminReservationInput(await request.json());
    const result = await createReservation(input, { requirePhone: false });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return reservationErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);
    const input = parseReservationCapacityInput({
      ...body,
      date: request.nextUrl.searchParams.get("date") ?? body.date,
    });
    const result = await updateReservationDayCapacity(input);

    return NextResponse.json(result);
  } catch (error) {
    return reservationErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);
    const input = parseReservationDayDeleteInput({
      ...body,
      date: request.nextUrl.searchParams.get("date") ?? body.date,
    });
    const result = await deleteReservationsByDate(input);

    return NextResponse.json(result);
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

async function readJsonBody(request: NextRequest) {
  try {
    const body = await request.json();

    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
