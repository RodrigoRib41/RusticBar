import type { Metadata } from "next";
import { AuthSessionProvider } from "./components/AuthSessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rustic Pub | Reserva",
  description: "Reserva online para Rustic Pub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
