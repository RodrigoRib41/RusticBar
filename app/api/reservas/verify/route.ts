import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      code: "otp_disabled",
      message: "Las reservas ahora se confirman directamente al validar disponibilidad.",
    },
    { status: 410 },
  );
}
