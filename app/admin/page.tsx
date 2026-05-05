import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAdminSession } from "../../lib/admin-auth";
import { getAvailability, getTodayDateString, listReservations } from "../../lib/reservations";
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
  const [reservations, availability] = await Promise.all([listReservations(), getAvailability(today)]);

  return <AdminDashboard initialAvailability={availability} initialReservations={reservations} today={today} />;
}
