import type { Metadata } from "next";
import { headers } from "next/headers";
import { QrDownloadPrint } from "../components/QrDownloadPrint";
import { listRestaurantTables } from "../../lib/tables";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rustic Pub | QR del menu",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function QrPage() {
  const [tables, origin] = await Promise.all([listRestaurantTables(), getRequestOrigin()]);
  const mesaUrl = new URL("/mesa", origin).toString();

  return (
    <main className="min-h-screen bg-[#070504] px-4 py-10 text-amber-50">
      <section className="mx-auto max-w-6xl">
        <div className="qr-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-rustic.png" alt="Rustic PUB" />
        </div>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-black uppercase text-amber-300">QR seguros</p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-none text-white sm:text-6xl">
            Mesas Rustic
          </h1>
          <p className="mt-4 leading-7 text-amber-50/65">
            Cada mesa tiene un token unico. No imprimas URLs con numeros secuenciales.
          </p>
          <p className="mt-3 break-all rounded-full border border-amber-200/15 bg-white/[.04] px-4 py-2 text-xs font-black uppercase text-amber-100">
            Dominio activo: {origin}
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-amber-200/15 bg-[#120c08] p-4 shadow-xl shadow-black/25">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-amber-300">Carta simple</p>
              <strong className="mt-1 block text-2xl font-black uppercase text-white">/mesa</strong>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase text-emerald-100">
              Solo lectura
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <QrDownloadPrint fileName="rustic-pub-menu-mesa" label="Menu de mesa" url={mesaUrl} />
            <p className="break-all rounded-2xl border border-amber-200/10 bg-white/[.04] p-4 text-sm font-bold leading-6 text-amber-50/58">
              {mesaUrl}
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tables.map((table) => {
            const menuUrl = new URL(`/m/${table.token}`, origin).toString();

            return (
              <article
                className="rounded-3xl border border-amber-200/15 bg-[#120c08] p-4 shadow-xl shadow-black/25"
                key={table.token}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black uppercase text-amber-300">Mesa</p>
                  <strong className="text-3xl font-black text-white">{table.mesa}</strong>
                </div>
                <div className="mt-4">
                  <QrDownloadPrint
                    fileName={`rustic-pub-mesa-${table.mesa}`}
                    label={`Mesa ${table.mesa}`}
                    url={menuUrl}
                  />
                </div>
                <p className="mt-3 break-all text-xs font-bold leading-5 text-amber-50/50">{menuUrl}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedHost = firstHeaderValue(headerStore.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(headerStore.get("host"));
  const forwardedProto = firstHeaderValue(headerStore.get("x-forwarded-proto"));

  if (host) {
    const protocol = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_MENU_URL ?? "http://localhost:3000");
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "http://localhost:3000";
  }
}
