import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rustic PUB | Menu",
  description: "Menu digital de Rustic PUB",
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
