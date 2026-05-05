import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/SiteFooter";
import { getAvailability, getTodayDateString } from "../../lib/reservations";
import { ReservationFlow, type Availability } from "./ReservationFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rustic Pub | Reservas",
  description: "Reserva tu mesa en Rustic Pub",
  alternates: {
    canonical: "/reservas",
  },
};

const fallbackAvailability: Availability = {
  capacity: 40,
  date: getTodayDateString(),
  reserved: 0,
  available: 40,
};

export default async function ReservasPage() {
  let availability = fallbackAvailability;

  try {
    availability = await getAvailability();
  } catch (error) {
    console.error(error);
  }

  return (
    <main className="reservas-page">
      <div className="reservation-mini-nav">
        <Link href="/">Rustic Pub</Link>
      </div>
      <section className="reservation-hero" aria-label="Reservas Rustic Pub">
        <div className="reservation-hero__media" aria-hidden="true" />
        <div className="reservation-hero__content">
          <div className="reservation-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-rustic.png" alt="Rustic Pub" />
          </div>
          <div className="reservation-copy">
            <p className="eyebrow">Rustic Pub</p>
            <h1>Reservas</h1>
            <p>Elegis fecha, cantidad de personas y confirmas tu mesa en segundos.</p>
          </div>
          <ReservationFlow initialAvailability={availability} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
