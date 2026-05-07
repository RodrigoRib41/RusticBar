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
const fallbackEnabledDayIndexes = [0, 4, 5, 6];
const fallbackIsReservationDayEnabled = isReservationDayEnabled(fallbackDate);
const fallbackCapacity = fallbackIsReservationDayEnabled ? 40 : 0;
const fallbackAvailability: Availability = {
  capacity: fallbackCapacity,
  date: fallbackDate,
  reserved: 0,
  available: fallbackCapacity,
  dayLabel: fallbackDayLabel(fallbackDate),
  enabledDayIndexes: fallbackEnabledDayIndexes,
  isHabitualOpenDay: fallbackIsReservationDayEnabled,
  isReservationDayEnabled: fallbackIsReservationDayEnabled,
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

  return fallbackEnabledDayIndexes.includes(day);
}
