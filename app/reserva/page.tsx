import type { Metadata } from "next";
import Link from "next/link";
import { getAvailability, getTodayDateString } from "../../lib/reservations";
import { ReservationFlow, type Availability } from "./ReservationFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rustic Pub | Reserva",
  description: "Reserva tu mesa en Rustic Pub",
  alternates: {
    canonical: "/reserva",
  },
};

const fallbackDate = getTodayDateString();
const fallbackIsReservationDayEnabled = isReservationDayEnabled(fallbackDate);
const fallbackCapacity = fallbackIsReservationDayEnabled ? 40 : 0;
const fallbackWeek = getFallbackWeek(fallbackDate);
const fallbackAvailability: Availability = {
  capacity: fallbackCapacity,
  date: fallbackDate,
  reserved: 0,
  available: fallbackCapacity,
  dayLabel: fallbackDayLabel(fallbackDate),
  enabledDateStrings: fallbackWeek.days.filter((day) => day.selectable).map((day) => day.date),
  isHabitualOpenDay: fallbackIsReservationDayEnabled,
  isReservationDayEnabled: fallbackIsReservationDayEnabled,
  weekDays: fallbackWeek.days,
  weekEndDate: fallbackWeek.end,
  weekStartDate: fallbackWeek.start,
};

export default async function ReservaPage() {
  let availability = fallbackAvailability;

  try {
    availability = await getAvailability();
  } catch (error) {
    console.error(error);
  }

  return (
    <main className="reserva-page">
      <div className="reservation-mini-nav">
        <Link href="/">Rustic Pub</Link>
      </div>
      <section className="reservation-hero" aria-label="Reserva Rustic Pub">
        <div className="reservation-hero__media" aria-hidden="true" />
        <div className="reservation-hero__content">
          <div className="reservation-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-rustic.png" alt="Rustic Pub" />
          </div>
          <div className="reservation-copy">
            <p className="eyebrow">Rustic Pub</p>
            <h1>Reserva</h1>
            <p>Elegis fecha, cantidad de personas y confirmas tu mesa en segundos.</p>
          </div>
          <ReservationFlow initialAvailability={availability} />
        </div>
      </section>
    </main>
  );
}

function fallbackDayLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function isReservationDayEnabled(value: string) {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();

  return day === 0 || day === 5 || day === 6;
}

function getFallbackWeek(value: string) {
  const start = getWeekStart(value);
  const dates = Array.from({ length: 7 }, (_, index) => shiftDateString(start, index));
  const days = dates.map((date) => {
    const enabled = isReservationDayEnabled(date);
    const capacity = enabled ? 40 : 0;
    const isPast = date < value;

    return {
      available: capacity,
      capacity,
      date,
      dayOfWeek: new Date(`${date}T00:00:00.000Z`).getUTCDay(),
      dayLabel: fallbackDayLabel(date),
      enabled,
      isFull: false,
      isPast,
      reserved: 0,
      selectable: enabled && !isPast,
    };
  });

  return {
    days,
    end: dates[6],
    start,
  };
}

function getWeekStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);

  return date.toISOString().slice(0, 10);
}

function shiftDateString(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
