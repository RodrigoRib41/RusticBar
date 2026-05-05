import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rustic Pub | QR del menu",
  robots: {
    index: false,
    follow: false,
  },
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_MENU_URL ?? "http://localhost:3000";
const menuUrl = new URL("/menu-qr", siteUrl).toString();
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
  menuUrl,
)}`;

export default function QrPage() {
  return (
    <main className="qr-page">
      <section className="qr-panel">
        <div className="qr-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-rustic.png" alt="Rustic PUB" />
        </div>
        <h1>QR del menu</h1>
        <div className="qr-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt={`Codigo QR para abrir ${menuUrl}`} />
        </div>
        <p className="qr-url">{menuUrl}</p>
      </section>
    </main>
  );
}
