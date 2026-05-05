import type { Metadata } from "next";
import { RusticPubLanding } from "./components/RusticPubLanding";

export const metadata: Metadata = {
  title: "Rustic Pub | Tu nuevo pub favorito",
  description: "Rustic Pub en E. Lopez 353, Gob. Crespo. Pub, barra y reservas online.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <RusticPubLanding />;
}
