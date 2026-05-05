import { NextResponse } from "next/server";
import { getAvailability } from "../../../lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const availability = await getAvailability(searchParams.get("date") ?? undefined);

  return NextResponse.json(availability, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
