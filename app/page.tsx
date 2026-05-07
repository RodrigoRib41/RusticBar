import type { Metadata } from "next";
import { listHomeGalleryImages } from "../lib/home-gallery";
import { RusticPubLanding } from "./components/RusticPubLanding";

export const metadata: Metadata = {
  title: "Rustic Pub | Tu nuevo pub favorito",
  description: "Rustic Pub en E. Lopez 353, Gob. Crespo. Pub, barra y reserva online.",
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const homeGallery = await listHomeGalleryImages();

  return <RusticPubLanding homeGallery={homeGallery} />;
}
