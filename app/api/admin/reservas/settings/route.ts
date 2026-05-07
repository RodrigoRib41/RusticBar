import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import {
  ReservationError,
  getReservationSettings,
  parseEnabledReservationDayInput,
  updateEnabledReservationDay,
} from "../../../../../lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const settings = await getReservationSettings();

    return NextResponse.json(
      { settings },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return reservationSettingsErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const input = parseEnabledReservationDayInput(await request.json());
    const result = await updateEnabledReservationDay(input);

    return NextResponse.json(result);
  } catch (error) {
    return reservationSettingsErrorResponse(error);
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

function reservationSettingsErrorResponse(error: unknown) {
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
      message: "No pudimos guardar la configuracion de reservas.",
    },
    { status: 500 },
  );
}
