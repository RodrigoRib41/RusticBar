import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { checkRateLimit } from "../../../lib/rate-limit";
import { verifyRecaptchaToken } from "../../../lib/recaptcha";
import {
  ReservationError,
  createAuthenticatedReservation,
  getAvailability,
  parseCreateReservationInput,
} from "../../../lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      throw new ReservationError("unauthorized", "Necesitas iniciar sesion con Google para reservar.", 401);
    }

    assertSameOrigin(request);

    const ipAddress = getRequestIp(request);
    const rateLimit = checkRateLimit(`reservas:${ipAddress ?? session.user.id}`, 6, 10 * 60 * 1000);

    if (!rateLimit.allowed) {
      throw new ReservationError("rate_limited", "Demasiados intentos de reserva. Proba de nuevo en unos minutos.", 429);
    }

    const payload = await readJsonBody(request);
    const recaptchaToken = typeof payload.recaptchaToken === "string" ? payload.recaptchaToken : "";

    await verifyRecaptchaToken(recaptchaToken, ipAddress ?? undefined);

    const input = parseCreateReservationInput(payload);
    const result = await createAuthenticatedReservation(input, {
      googleId: session.user.googleId,
      ipAddress: ipAddress ?? undefined,
      userEmail: session.user.email,
      userId: session.user.id,
      userImage: session.user.image,
      userName: session.user.name,
    });

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

async function readJsonBody(request: Request) {
  try {
    const body = await request.json();

    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    throw new ReservationError("invalid_payload", "No pudimos leer los datos de la reserva.");
  }
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || null;
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return;
  }

  const allowedOrigins = new Set<string>();
  const host = request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (host) {
    allowedOrigins.add(`${forwardedProto}://${host}`);
    allowedOrigins.add(`https://${host}`);
    allowedOrigins.add(`http://${host}`);
  }

  addEnvOrigin(allowedOrigins, process.env.NEXTAUTH_URL);
  addEnvOrigin(allowedOrigins, process.env.AUTH_URL);
  addEnvOrigin(allowedOrigins, process.env.NEXT_PUBLIC_SITE_URL);

  if (!allowedOrigins.has(origin)) {
    throw new ReservationError("csrf_failed", "No pudimos validar el origen de la reserva.", 403);
  }
}

function addEnvOrigin(origins: Set<string>, value: string | undefined) {
  if (!value) {
    return;
  }

  try {
    origins.add(new URL(value).origin);
  } catch {
    return;
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
