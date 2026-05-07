import { Prisma, PrismaClient, Reservation, ReservationStatus } from "@prisma/client";
import { prisma } from "./prisma";

export const DEFAULT_RESERVATION_CAPACITY = 40;
export const MAX_RESERVATION_CAPACITY = 500;

const DEFAULT_ENABLED_RESERVATION_DAYS = new Set([0, 4, 5, 6]);
const MAX_RESERVATIONS_PER_IP_DAY = 3;
const MAX_RESERVATIONS_PER_USER_DATE = 2;
const SERIALIZATION_RETRIES = 4;
const RESERVATION_LOCK_NAMESPACE = 20260505;

export const RESERVATION_WEEK_DAYS = [
  { dayOfWeek: 1, label: "Lunes", shortLabel: "Lun" },
  { dayOfWeek: 2, label: "Martes", shortLabel: "Mar" },
  { dayOfWeek: 3, label: "Miércoles", shortLabel: "Mié" },
  { dayOfWeek: 4, label: "Jueves", shortLabel: "Jue" },
  { dayOfWeek: 5, label: "Viernes", shortLabel: "Vie" },
  { dayOfWeek: 6, label: "Sábado", shortLabel: "Sáb" },
  { dayOfWeek: 0, label: "Domingo", shortLabel: "Dom" },
] as const;

type ReservationDb = PrismaClient | Prisma.TransactionClient;
type ReservationDayCapacityRecord = {
  capacity: number;
};
type EnabledReservationDayRecord = {
  dayOfWeek: number;
  enabled: boolean;
  updatedAt: Date | null;
};
type ReservationDayCapacityDelegate = {
  findUnique: (args: {
    select?: { capacity: true };
    where: { date: Date };
  }) => Promise<ReservationDayCapacityRecord | null>;
  upsert: (args: {
    create: { capacity: number; date: Date };
    select?: { capacity: true };
    update: { capacity: number };
    where: { date: Date };
  }) => Promise<ReservationDayCapacityRecord>;
};
type EnabledReservationDayDelegate = {
  findMany: (args: {
    orderBy?: { dayOfWeek: "asc" | "desc" };
    select: { dayOfWeek: true; enabled: true; updatedAt: true };
  }) => Promise<EnabledReservationDayRecord[]>;
  upsert: (args: {
    create: { dayOfWeek: number; enabled: boolean };
    select: { dayOfWeek: true; enabled: true; updatedAt: true };
    update: { enabled: boolean };
    where: { dayOfWeek: number };
  }) => Promise<EnabledReservationDayRecord>;
};
type ReservationRecord = Reservation & {
  user?: {
    createdAt: Date;
    email: string | null;
    googleId: string | null;
    id: string;
    image: string | null;
    name: string | null;
  } | null;
};

export type Availability = {
  date: string;
  capacity: number;
  reserved: number;
  available: number;
  isHabitualOpenDay: boolean;
  isReservationDayEnabled: boolean;
  enabledDayIndexes: number[];
  dayLabel: string;
};

export type ReservationInput = {
  name: string;
  phone: string;
  date: string;
  time?: string;
  people: number;
};

export type ReservationFilters = {
  date?: string;
  endDate?: string;
  startDate?: string;
  user?: string;
};

export type ReservationDayDeleteInput = {
  confirmation: string;
  date: string;
};

export type ReservationCapacityInput = {
  capacity: number;
  date: string;
};

export type EnabledReservationDayInput = {
  dayOfWeek: number;
  enabled: boolean;
};

export type EnabledReservationDayView = {
  dayOfWeek: number;
  enabled: boolean;
  label: string;
  shortLabel: string;
};

export type ReservationSettingsView = {
  days: EnabledReservationDayView[];
  enabledDayIndexes: number[];
  updatedAt: string | null;
};

export type ReservationView = {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  people: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  user: ReservationUserView | null;
  userEmail: string | null;
};

export type ReservationUserView = {
  createdAt: string;
  email: string | null;
  googleId: string | null;
  id: string;
  image: string | null;
  name: string | null;
};

export type AuthenticatedReservationContext = {
  googleId?: string | null;
  ipAddress?: string;
  userEmail: string;
  userId: string;
  userImage?: string | null;
  userName?: string | null;
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

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeIpAddress(value: string | undefined) {
  const ip = sanitizeText(value ?? "", 80);

  return ip || null;
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

export function parseCreateAdminReservationInput(payload: unknown): ReservationInput {
  return parseReservationPayload(payload, { requirePhone: false });
}

export function parseUpdateAdminReservationInput(payload: unknown): ReservationInput {
  return parseReservationPayload(payload, { requirePhone: false });
}

export function parseReservationDayDeleteInput(payload: unknown): ReservationDayDeleteInput {
  const body = asRecord(payload);
  const dateValue = body.date ?? body.fecha;
  const confirmationValue = body.confirmation ?? body.confirmacion;
  const date = typeof dateValue === "string" ? parseDateString(dateValue) : "";
  const confirmation = typeof confirmationValue === "string" ? confirmationValue.trim() : "";

  if (!date) {
    throw new ReservationError("invalid_date", "Ingresa una fecha valida.");
  }

  if (confirmation !== "Confirmar") {
    throw new ReservationError("invalid_confirmation", "Escribi Confirmar para borrar las reservas del dia.", 400);
  }

  return { confirmation, date };
}

export function parseReservationCapacityInput(payload: unknown): ReservationCapacityInput {
  const body = asRecord(payload);
  const dateValue = body.date ?? body.fecha;
  const capacityValue = body.capacity ?? body.cupo ?? body.lugares;
  const date = typeof dateValue === "string" ? parseDateString(dateValue) : "";
  const capacity = Number(capacityValue);

  if (!date) {
    throw new ReservationError("invalid_date", "Ingresa una fecha valida.");
  }

  if (!Number.isInteger(capacity) || capacity < 0 || capacity > MAX_RESERVATION_CAPACITY) {
    throw new ReservationError(
      "invalid_capacity",
      `El cupo debe ser un numero entre 0 y ${MAX_RESERVATION_CAPACITY}.`,
    );
  }

  return { capacity, date };
}

export function parseEnabledReservationDayInput(payload: unknown): EnabledReservationDayInput {
  const body = asRecord(payload);
  const dayValue = body.dayOfWeek ?? body.diaSemana;
  const enabledValue = body.enabled ?? body.habilitado;
  const dayOfWeek = Number(dayValue);

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new ReservationError("invalid_day", "Ingresa un día de la semana válido.");
  }

  if (typeof enabledValue !== "boolean") {
    throw new ReservationError("invalid_enabled", "Indica si el día está habilitado o no.");
  }

  return { dayOfWeek, enabled: enabledValue };
}

export async function getReservationSettings(db: ReservationDb = prisma): Promise<ReservationSettingsView> {
  const rows = await findEnabledReservationDays(db);
  const rowByDay = new Map(rows.map((row) => [row.dayOfWeek, row]));
  const days = RESERVATION_WEEK_DAYS.map((day) => {
    const row = rowByDay.get(day.dayOfWeek);
    const enabled = row?.enabled ?? DEFAULT_ENABLED_RESERVATION_DAYS.has(day.dayOfWeek);

    return {
      ...day,
      enabled,
    };
  });
  const updatedAt =
    rows
      .map((row) => row.updatedAt?.getTime() ?? 0)
      .sort((a, b) => b - a)[0] ?? 0;

  return {
    days,
    enabledDayIndexes: days.filter((day) => day.enabled).map((day) => day.dayOfWeek),
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
  };
}

export async function updateEnabledReservationDay(input: EnabledReservationDayInput) {
  const { dayOfWeek, enabled } = parseEnabledReservationDayInput(input);
  await upsertEnabledReservationDay(dayOfWeek, enabled);

  return {
    settings: await getReservationSettings(),
  };
}

export async function getAvailability(date = getTodayDateString(), db: ReservationDb = prisma, excludeId?: string) {
  const dateString = parseDateString(date);
  const [confirmed, dayCapacity, settings] = await Promise.all([
    db.reservation.aggregate({
      _sum: { people: true },
      where: {
        date: dateToDatabaseValue(dateString),
        status: "confirmed",
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    }),
    findReservationDayCapacity(db, dateString),
    getReservationSettings(db),
  ]);
  const isReservationDayEnabled = settings.enabledDayIndexes.includes(getDayOfWeek(dateString));
  const capacity = isReservationDayEnabled ? dayCapacity?.capacity ?? DEFAULT_RESERVATION_CAPACITY : 0;
  const reserved = confirmed._sum.people ?? 0;
  const available = Math.max(capacity - reserved, 0);

  return {
    date: dateString,
    capacity,
    reserved,
    available,
    dayLabel: getDateDayLabel(dateString),
    enabledDayIndexes: settings.enabledDayIndexes,
    isHabitualOpenDay: isReservationDayEnabled,
    isReservationDayEnabled,
  };
}

export async function updateReservationDayCapacity(input: ReservationCapacityInput) {
  const { capacity, date } = parseReservationCapacityInput(input);
  const dayCapacity = await upsertReservationDayCapacity(date, capacity);

  return {
    availability: await getAvailability(date),
    capacity: {
      capacity: dayCapacity.capacity,
      date,
    },
  };
}

function assertReservationDateEnabled(availability: Availability) {
  if (!availability.isReservationDayEnabled) {
    throw new ReservationError(
      "reservation_day_disabled",
      "Ese día no está habilitado para reservas. Elegí un día disponible.",
      400,
    );
  }
}

export async function createReservation(input: ReservationInput, options: ReservationValidationOptions = {}) {
  const reservationInput = parseReservationPayload(input, options);

  return withSerializableRetry(async () =>
    prisma.$transaction(
      async (tx) => {
        await lockReservationDate(tx, reservationInput.date);

        const availability = await getAvailability(reservationInput.date, tx);

        assertReservationDateEnabled(availability);

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
            time: reservationInput.time ?? "21:00",
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

export async function createAuthenticatedReservation(
  input: ReservationInput,
  context: AuthenticatedReservationContext,
  options: ReservationValidationOptions = {},
) {
  const reservationInput = parseReservationPayload(input, options);
  const ipAddress = normalizeIpAddress(context.ipAddress);

  if (!context.userId || !context.userEmail) {
    throw new ReservationError("unauthorized", "Necesitas iniciar sesion con Google para reservar.", 401);
  }

  return withSerializableRetry(async () =>
    prisma.$transaction(
      async (tx) => {
        await lockReservationDate(tx, reservationInput.date);

        const user = await tx.user.findUnique({
          select: { id: true },
          where: { id: context.userId },
        });

        if (!user) {
          throw new ReservationError("unauthorized", "Necesitas iniciar sesion con Google para reservar.", 401);
        }

        await tx.user.update({
          data: {
            ...(context.googleId ? { googleId: context.googleId } : {}),
            ...(context.userImage ? { image: context.userImage } : {}),
            ...(context.userName ? { name: context.userName } : {}),
          },
          where: { id: context.userId },
        });

        const availability = await getAvailability(reservationInput.date, tx);

        assertReservationDateEnabled(availability);

        if (availability.available < reservationInput.people) {
          throw new ReservationError(
            "capacity_exceeded",
            `No hay lugares suficientes para esa fecha. Quedan ${availability.available}.`,
            409,
          );
        }

        const userReservationsForDate = await tx.reservation.count({
          where: {
            date: dateToDatabaseValue(reservationInput.date),
            status: { not: "canceled" },
            userId: context.userId,
          },
        });

        if (userReservationsForDate >= MAX_RESERVATIONS_PER_USER_DATE) {
          throw new ReservationError(
            "user_daily_limit",
            `Cada cuenta Google puede hacer hasta ${MAX_RESERVATIONS_PER_USER_DATE} reservas por dia.`,
            429,
          );
        }

        if (ipAddress) {
          const { end, start } = getArgentinaDayBounds();
          const ipReservationsToday = await tx.reservation.count({
            where: {
              createdAt: {
                gte: start,
                lt: end,
              },
              ipAddress,
              status: { not: "canceled" },
            },
          });

          if (ipReservationsToday >= MAX_RESERVATIONS_PER_IP_DAY) {
            throw new ReservationError(
              "ip_daily_limit",
              `Desde esta conexion se pueden hacer hasta ${MAX_RESERVATIONS_PER_IP_DAY} reservas por dia.`,
              429,
            );
          }
        }

        const reservation = await tx.reservation.create({
          data: {
            date: dateToDatabaseValue(reservationInput.date),
            ipAddress,
            name: reservationInput.name,
            people: reservationInput.people,
            phone: reservationInput.phone,
            status: "confirmed",
            time: reservationInput.time ?? "21:00",
            userEmail: context.userEmail,
            userId: context.userId,
          },
          include: {
            user: true,
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

export async function listReservations(filters: ReservationFilters = {}) {
  const date = filters.date ? parseDateString(filters.date) : undefined;
  const startDate = !date && filters.startDate ? parseDateString(filters.startDate) : undefined;
  const endDate = !date && filters.endDate ? parseDateString(filters.endDate) : undefined;
  const userFilter = sanitizeText(filters.user ?? "", 80);

  if (startDate && endDate && startDate > endDate) {
    throw new ReservationError("invalid_range", "La fecha desde no puede ser posterior a la fecha hasta.");
  }

  const and: Prisma.ReservationWhereInput[] = [];

  if (date) {
    and.push({ date: dateToDatabaseValue(date) });
  } else if (startDate || endDate) {
    and.push({
      date: {
        ...(startDate ? { gte: dateToDatabaseValue(startDate) } : {}),
        ...(endDate ? { lte: dateToDatabaseValue(endDate) } : {}),
      },
    });
  }

  if (userFilter) {
    and.push({
      OR: [
        { name: { contains: userFilter, mode: "insensitive" } },
        { user: { is: { name: { contains: userFilter, mode: "insensitive" } } } },
      ],
    });
  }

  const where: Prisma.ReservationWhereInput | undefined = and.length ? { AND: and } : undefined;

  const reservations = await prisma.reservation.findMany({
    include: {
      user: true,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    where,
  });

  return reservations.map(serializeReservation);
}

export async function updateReservation(
  id: string,
  input: ReservationInput,
  options: ReservationValidationOptions = {},
) {
  const reservationInput = parseReservationPayload(input, options);

  return withSerializableRetry(async () =>
    prisma.$transaction(
      async (tx) => {
        const current = await tx.reservation.findUnique({ where: { id } });

        if (!current) {
          throw new ReservationError("not_found", "No encontramos esa reserva.", 404);
        }

        await lockReservationDate(tx, reservationInput.date);

        const availability = await getAvailability(reservationInput.date, tx, id);

        assertReservationDateEnabled(availability);

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
            time: reservationInput.time ?? "21:00",
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

export async function deleteReservationsByDate(input: ReservationDayDeleteInput) {
  const { date } = parseReservationDayDeleteInput(input);
  const deleted = await prisma.reservation.deleteMany({
    where: {
      date: dateToDatabaseValue(date),
    },
  });

  return {
    availability: await getAvailability(date),
    date,
    deletedCount: deleted.count,
  };
}

export function serializeReservation(reservation: ReservationRecord): ReservationView {
  return {
    createdAt: reservation.createdAt.toISOString(),
    date: databaseDateToString(reservation.date),
    id: reservation.id,
    name: reservation.name,
    people: reservation.people,
    phone: reservation.phone,
    status: reservation.status,
    time: reservation.time,
    updatedAt: reservation.updatedAt.toISOString(),
    user: reservation.user
      ? {
          createdAt: reservation.user.createdAt.toISOString(),
          email: reservation.user.email,
          googleId: reservation.user.googleId,
          id: reservation.user.id,
          image: reservation.user.image,
          name: reservation.user.name,
        }
      : null,
    userEmail: reservation.userEmail,
  };
}

type ReservationValidationOptions = {
  requirePhone?: boolean;
};

function parseReservationPayload(
  payload: unknown,
  { requirePhone = true }: ReservationValidationOptions = {},
): ReservationInput {
  const body = asRecord(payload);
  const nameValue = body.name ?? body.nombre;
  const phoneValue = body.phone ?? body.telefono;
  const dateValue = body.date ?? body.fecha;
  const peopleValue = body.people ?? body.personas;
  const timeValue = body.time ?? body.hora;

  const name = typeof nameValue === "string" ? sanitizeText(nameValue, 80) : "";
  const phone = typeof phoneValue === "string" ? normalizePhone(phoneValue) : "";
  const date = typeof dateValue === "string" ? parseDateString(dateValue) : "";
  const people = Number(peopleValue);
  const time = typeof timeValue === "string" && timeValue.trim() ? parseTimeString(timeValue) : "21:00";

  if (name.length < 2 || name.length > 80) {
    throw new ReservationError("invalid_name", "Ingresa un nombre valido.");
  }

  if (requirePhone && !isValidPhone(phone)) {
    throw new ReservationError("invalid_phone", "Ingresa un telefono valido.");
  }

  if (!requirePhone && phone && !isValidPhone(phone)) {
    throw new ReservationError("invalid_phone", "Ingresa un telefono valido o dejalo vacio.");
  }

  if (!date) {
    throw new ReservationError("invalid_date", "Ingresa una fecha valida.");
  }

  if (!Number.isInteger(people) || people < 1 || people > MAX_RESERVATION_CAPACITY) {
    throw new ReservationError(
      "invalid_people",
      `La cantidad de personas debe estar entre 1 y ${MAX_RESERVATION_CAPACITY}.`,
    );
  }

  return { date, name, people, phone, time };
}

function parseTimeString(time: string) {
  const value = time.trim();

  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new ReservationError("invalid_time", "Ingresa un horario valido.");
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new ReservationError("invalid_time", "Ingresa un horario valido.");
  }

  return value;
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

function getDateDayLabel(date: string) {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "long",
  });

  return formatter.format(dateToDatabaseValue(date));
}

function getDayOfWeek(date: string) {
  return dateToDatabaseValue(date).getUTCDay();
}

function getReservationDayCapacityDelegate(db: ReservationDb) {
  return (db as ReservationDb & { reservationDayCapacity?: ReservationDayCapacityDelegate }).reservationDayCapacity;
}

function getEnabledReservationDayDelegate(db: ReservationDb) {
  return (db as ReservationDb & { enabledReservationDay?: EnabledReservationDayDelegate }).enabledReservationDay;
}

async function findEnabledReservationDays(db: ReservationDb) {
  const delegate = getEnabledReservationDayDelegate(db);

  if (delegate) {
    return delegate.findMany({
      orderBy: { dayOfWeek: "asc" },
      select: { dayOfWeek: true, enabled: true, updatedAt: true },
    });
  }

  return db.$queryRaw<EnabledReservationDayRecord[]>`
    SELECT "dayOfWeek", "enabled", "updatedAt"
    FROM "EnabledReservationDay"
    ORDER BY "dayOfWeek" ASC
  `;
}

async function upsertEnabledReservationDay(dayOfWeek: number, enabled: boolean) {
  const delegate = getEnabledReservationDayDelegate(prisma);

  if (delegate) {
    return delegate.upsert({
      create: {
        dayOfWeek,
        enabled,
      },
      select: { dayOfWeek: true, enabled: true, updatedAt: true },
      update: {
        enabled,
      },
      where: {
        dayOfWeek,
      },
    });
  }

  const rows = await prisma.$queryRaw<EnabledReservationDayRecord[]>`
    INSERT INTO "EnabledReservationDay" ("dayOfWeek", "enabled")
    VALUES (${dayOfWeek}, ${enabled})
    ON CONFLICT ("dayOfWeek") DO UPDATE
      SET "enabled" = EXCLUDED."enabled",
          "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "dayOfWeek", "enabled", "updatedAt"
  `;

  return rows[0] ?? { dayOfWeek, enabled, updatedAt: new Date() };
}

async function findReservationDayCapacity(db: ReservationDb, date: string) {
  const dateValue = dateToDatabaseValue(date);
  const delegate = getReservationDayCapacityDelegate(db);

  if (delegate) {
    return delegate.findUnique({
      select: { capacity: true },
      where: { date: dateValue },
    });
  }

  const rows = await db.$queryRaw<ReservationDayCapacityRecord[]>`
    SELECT "capacity"
    FROM "ReservationDayCapacity"
    WHERE "date" = ${dateValue}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function upsertReservationDayCapacity(date: string, capacity: number) {
  const dateValue = dateToDatabaseValue(date);
  const delegate = getReservationDayCapacityDelegate(prisma);

  if (delegate) {
    return delegate.upsert({
      create: {
        capacity,
        date: dateValue,
      },
      select: { capacity: true },
      update: {
        capacity,
      },
      where: {
        date: dateValue,
      },
    });
  }

  const rows = await prisma.$queryRaw<ReservationDayCapacityRecord[]>`
    INSERT INTO "ReservationDayCapacity" ("date", "capacity")
    VALUES (${dateValue}, ${capacity})
    ON CONFLICT ("date") DO UPDATE
      SET "capacity" = EXCLUDED."capacity",
          "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "capacity"
  `;

  return rows[0] ?? { capacity };
}

function getArgentinaDayBounds(date = getTodayDateString()) {
  const [year, month, day] = date.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { end, start };
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
