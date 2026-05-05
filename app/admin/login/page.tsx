import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminSession } from "../../../lib/admin-auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Rustic Pub",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function AdminLoginPage() {
  if (await hasAdminSession()) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#070504] px-4 py-10 text-amber-50">
      <div
        className="overflow-hidden rounded-3xl border border-amber-200/15 bg-black/45 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl"
        style={{ maxWidth: "448px", width: "min(100%, 358px)" }}
      >
        <Link className="text-sm font-black uppercase text-amber-300" href="/">
          Rustic Pub
        </Link>
        <h1 className="mt-5 text-3xl font-black uppercase leading-none text-white sm:text-4xl">Panel admin</h1>
        <p className="mt-3 leading-7 text-amber-50/70">
          Acceso privado para gestionar reservas, cupos diarios e historial.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
