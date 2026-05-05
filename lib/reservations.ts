import { Prisma, PrismaClient, Reservation } from "@prisma/client";
import { prisma } from "./prisma";

export const RESERVATION_CAPACITY = 40;

const SERIALIZATION_RETRIES = 4;
const RESERVATION_LOCK_NAMESPACE = 20260505;

type ReservationDb = PrismaClient | Prisma.TransactionClient;

export type Availability = {
  date: string;
  capacity: number;
  reserved: number;
  available: number;
};

export type ReservationInput = {
  name: string;
  phone: string;
  date: string;
  people: number;
};

export type ReservationView = {
  id: string;
  name: string;
  phone: string;
  date: string;
  people: number;
  createdAt: string;
};

export class ReservationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "ReservationError";
  }
}

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function getTodayDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function parseCreateReservationInput(payload: unknown): ReservationInput {
  return parseReservationPayload(payload);
}

export function parseUpdateReservationInput(payload: unknown): ReservationInput {
  return parseReservationPayload(payload);
}

export async function getAvailability(date = getTodayDateString(), db: ReservationDb = prisma, excludeId?: string) {
  const dateString = parseDateString(date);
  const confirmed = await db.reservation.aggregate({
    _sum: { people: true },
    where: {
      date: dateToDatabaseValue(dateString),
      status: "confirmed",
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  const reserved = confirmed._sum.people ?? 0;
  const available = Math.max(RESERVATION_CAPACITY - reserved, 0);

  return {
    date: dateString,
    capacity: RESERVATION_CAPACITY,
    reserved,
    available,
  };
}

export async function createReservation(input: ReservationInput) {
  const reservationInput = parseReservationPayload(input);

  return withSerializableRetry(async () =>
    prisma.$transaction(
      async (tx) => {
        await lockReservationDate(tx, reservationInput.date);

        const availability = await getAvailability(reservationInput.date, tx);

        if (availability.available < reservationInput.people) {
          throw new ReservationError(
            "capacity_exceeded",
            `No hay lugares suficientes para esa fecha. Quedan ${availability.available}.`,
            409,
          );
        }

        const reservation = await tx.reservation.create({
          data: {
            date: dateToDatabaseValue(reservationInput.date),
            name: reservationInput.name,
            people: reservationInput.people,
            phone: reservationInput.phone,
            status: "confirmed",
          },
        });

        return {
          reservation: serializeReservation(reservation),
          availability: await getAvailability(reservationInput.date, tx),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}

export async function listReservations(filters: { date?: string } = {}) {
  const date = filters.date ? parseDateString(filters.date) : undefined;
  const reservations = await prisma.reservation.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    where: date ? { date: dateToDatabaseValue(date) } : undefined,
  });

  return reservations.map(serializeReservation);
}

export async function updateReservation(id: string, input: ReservationInput) {
  const reservationInput = parseReservationPayload(input);

  return withSerializableRetry(async () =>
    prisma.$transaction(
      async (tx) => {
        const current = await tx.reservation.findUnique({ where: { id } });

        if (!current) {
          throw new ReservationError("not_found", "No encontramos esa reserva.", 404);
        }

        await lockReservationDate(tx, reservationInput.date);

        const availability = await getAvailability(reservationInput.date, tx, id);

        if (availability.available < reservationInput.people) {
          throw new ReservationError(
            "capacity_exceeded",
            `No hay lugares suficientes para esa fecha. Quedan ${availability.available}.`,
            409,
          );
        }

        const reservation = await tx.reservation.update({
          data: {
            date: dateToDatabaseValue(reservationInput.date),
            name: reservationInput.name,
            people: reservationInput.people,
            phone: reservationInput.phone,
            status: "confirmed",
          },
          where: { id },
        });

        return {
          reservation: serializeReservation(reservation),
          availability: await getAvailability(reservationInput.date, tx),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}

export async function deleteReservation(id: string) {
  try {
    const reservation = await prisma.reservation.delete({ where: { id } });

    return serializeReservation(reservation);
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      throw new ReservationError("not_found", "No encontramos esa reserva.", 404);
    }

    throw error;
  }
}

export function serializeReservation(reservation: Reservation): ReservationView {
  return {
    createdAt: reservation.createdAt.toISOString(),
    date: databaseDateToString(reservation.date),
    id: reservation.id,
    name: reservation.name,
    people: reservation.people,
    phone: reservation.phone,
  };
}

function parseReservationPayload(payload: unknown): ReservationInput {
  const body = asRecord(payload);
  const nameValue = body.name ?? body.nombre;
  const phoneValue = body.phone ?? body.telefono;
  const dateValue = body.date ?? body.fecha;
  const peopleValue = body.people ?? body.personas;

  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const phone = typeof phoneValue === "string" ? normalizePhone(phoneValue) : "";
  const date = typeof dateValue === "string" ? parseDateString(dateValue) : "";
  const people = Number(peopleValue);

  if (name.length < 2 || name.length > 80) {
    throw new ReservationError("invalid_name", "Ingresa un nombre valido.");
  }

  if (!isValidPhone(phone)) {
    throw new ReservationError("invalid_phone", "Ingresa un telefono valido.");
  }

  if (!date) {
    throw new ReservationError("invalid_date", "Ingresa una fecha valida.");
  }

  if (!Number.isInteger(people) || people < 1 || people > RESERVATION_CAPACITY) {
    throw new ReservationError(
      "invalid_people",
      `La cantidad de personas debe estar entre 1 y ${RESERVATION_CAPACITY}.`,
    );
  }

  return { date, name, people, phone };
}

function parseDateString(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ReservationError("invalid_date", "Ingresa una fecha valida.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ReservationError("invalid_date", "Ingresa una fecha valida.");
  }

  return date;
}

function dateToDatabaseValue(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function databaseDateToString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function lockKeyForDate(date: string) {
  return Number(date.replaceAll("-", ""));
}

async function lockReservationDate(tx: Prisma.TransactionClient, date: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${RESERVATION_LOCK_NAMESPACE}, ${lockKeyForDate(date)})`;
}

function isValidPhone(phone: string) {
  return /^\+?\d{7,18}$/.test(phone);
}

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

async function withSerializableRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isPrismaError(error, "P2034")) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
