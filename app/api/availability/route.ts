import { NextResponse } from "next/server";
import { ReservationError, assertCurrentWeekReservationDate, getAvailability, getTodayDateString } from "../../../lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? getTodayDateString();

  try {
    assertCurrentWeekReservationDate(date);
    const availability = await getAvailability(date);

    return NextResponse.json(availability, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ReservationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode },
      );
    }

    throw error;
  }
}
