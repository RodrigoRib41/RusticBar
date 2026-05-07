import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "rustic_admin_session";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

type AdminSessionPayload = {
  exp: number;
  user: string;
};

export function verifyAdminCredentials(username: string, password: string) {
  return safeEqual(username, getAdminUser()) && safeEqual(password, getAdminPassword());
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  return Boolean(session && verifySessionToken(session));
}

export function isAdminRequest(request: NextRequest) {
  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  return Boolean(session && verifySessionToken(session));
}

export function setAdminCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    name: ADMIN_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: createSessionToken(),
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: ADMIN_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: "",
  });
}

function createSessionToken() {
  const payload: AdminSessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    user: getAdminUser(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;

    return payload.user === getAdminUser() && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function getAdminUser() {
  return getRequiredAdminEnv("ADMIN_USER");
}

function getAdminPassword() {
  return getRequiredAdminEnv("ADMIN_PASSWORD");
}

function getSessionSecret() {
  return getRequiredAdminEnv("ADMIN_SESSION_SECRET");
}

function getRequiredAdminEnv(key: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET" | "ADMIN_USER") {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required for admin authentication.`);
  }

  return value;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
