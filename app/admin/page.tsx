import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAdminSession } from "../../lib/admin-auth";
import type { BalanceView } from "../../lib/balance";
import { MENU_CATEGORY_OPTIONS, type MenuAdminView } from "../../lib/menu-types";
import { getAvailability, getReservationSettings, getTodayDateString, listReservations } from "../../lib/reservations";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservas | Admin Rustic Pub",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function AdminPage() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }

  const today = getTodayDateString();
  const reservationStartDate = getWeekStart(today);
  const reservationEndDate = shiftDateString(reservationStartDate, 6);
  const [reservations, availability, reservationSettings] = await Promise.all([
    listReservations({ endDate: reservationEndDate, startDate: reservationStartDate }),
    getAvailability(today),
    getReservationSettings(),
  ]);
  const balance: BalanceView = {
    days: [],
    endDate: today,
    startDate: today,
    total: 0,
  };
  const menu: MenuAdminView = {
    categories: MENU_CATEGORY_OPTIONS,
    items: [],
    subcategories: [],
  };

  return (
    <AdminDashboard
      initialAvailability={availability}
      initialBalance={balance}
      initialMenu={menu}
      initialPedidos={[]}
      initialReservations={reservations}
      initialReservationSettings={reservationSettings}
      today={today}
    />
  );
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
