import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rustic Pub | Reservas",
  description: "Reservas online para Rustic Pub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
