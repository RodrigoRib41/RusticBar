import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "../../../../../lib/admin-auth";
import {
  BlockedEmailError,
  createBlockedEmail,
  deleteBlockedEmail,
  listBlockedEmails,
  parseBlockedEmailInput,
} from "../../../../../lib/blocked-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const blockedEmails = await listBlockedEmails(request.nextUrl.searchParams.get("search") ?? "");

    return NextResponse.json(
      { blockedEmails },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return blockedEmailErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const blockedEmail = await createBlockedEmail(parseBlockedEmailInput(await request.json()));

    return NextResponse.json({ blockedEmail }, { status: 201 });
  } catch (error) {
    return blockedEmailErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const blockedEmail = await deleteBlockedEmail(id);

    return NextResponse.json({ blockedEmail });
  } catch (error) {
    return blockedEmailErrorResponse(error);
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

function blockedEmailErrorResponse(error: unknown) {
  if (error instanceof BlockedEmailError) {
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
      message: "No pudimos gestionar los emails bloqueados.",
    },
    { status: 500 },
  );
}
