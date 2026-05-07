import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BlockedEmailInput = {
  blockedBy?: string | null;
  email: string;
  reason?: string | null;
};

export type BlockedEmailView = {
  blockedBy: string | null;
  createdAt: string;
  email: string;
  id: string;
  reason: string | null;
};

export class BlockedEmailError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "BlockedEmailError";
  }
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function parseBlockedEmailInput(payload: unknown): BlockedEmailInput {
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const reason = typeof body.reason === "string" ? sanitizeText(body.reason, 240) : null;
  const blockedBy = typeof body.blockedBy === "string" ? sanitizeText(body.blockedBy, 120) : null;

  if (!EMAIL_PATTERN.test(email)) {
    throw new BlockedEmailError("invalid_email", "Ingresá un email Google válido.");
  }

  return { blockedBy, email, reason };
}

export async function assertEmailCanReserve(email: string | null | undefined) {
  if (!email) {
    return;
  }

  const blocked = await isEmailBlocked(email);

  if (blocked) {
    throw new BlockedEmailError(
      "email_blocked",
      "Tu cuenta no tiene permisos para realizar reservas.",
      403,
    );
  }
}

export async function isEmailBlocked(email: string) {
  const normalized = normalizeEmail(email);

  if (!EMAIL_PATTERN.test(normalized)) {
    return false;
  }

  const blocked = await prisma.blockedEmail.findUnique({
    select: { id: true },
    where: { email: normalized },
  });

  return Boolean(blocked);
}

export async function listBlockedEmails(search = "") {
  const query = normalizeEmail(search);
  const blocked = await prisma.blockedEmail.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { reason: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
  });

  return blocked.map(serializeBlockedEmail);
}

export async function createBlockedEmail(input: BlockedEmailInput) {
  const parsed = parseBlockedEmailInput(input);

  try {
    const blocked = await prisma.blockedEmail.create({
      data: parsed,
    });

    return serializeBlockedEmail(blocked);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BlockedEmailError("duplicate_email", "Ese email ya está bloqueado.", 409);
    }

    throw error;
  }
}

export async function deleteBlockedEmail(id: string) {
  try {
    const blocked = await prisma.blockedEmail.delete({ where: { id } });

    return serializeBlockedEmail(blocked);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new BlockedEmailError("not_found", "No encontramos ese bloqueo.", 404);
    }

    throw error;
  }
}

function serializeBlockedEmail(blocked: {
  blockedBy: string | null;
  createdAt: Date;
  email: string;
  id: string;
  reason: string | null;
}): BlockedEmailView {
  return {
    blockedBy: blocked.blockedBy,
    createdAt: blocked.createdAt.toISOString(),
    email: blocked.email,
    id: blocked.id,
    reason: blocked.reason,
  };
}

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
