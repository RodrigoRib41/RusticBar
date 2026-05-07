import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  if (request.nextUrl.pathname === "/api/reservas" && request.method === "POST" && !request.auth?.user) {
    return NextResponse.json(
      {
        code: "unauthorized",
        message: "Necesitas iniciar sesion con Google para reservar.",
      },
      { status: 401 },
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/reservas"],
};
