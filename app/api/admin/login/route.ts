import { NextResponse } from "next/server";
import { setAdminCookie, verifyAdminCredentials } from "../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json(
      {
        code: "invalid_credentials",
        message: "Usuario o password incorrectos.",
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  setAdminCookie(response);

  return response;
}
