import type { Metadata } from "next";
import Link from "next/link";
import { CategoryNav, Header } from "../components/MenuCategoryPage";
import { getSectionCover, menuSections } from "../menu-data";

export const metadata: Metadata = {
  title: "Rustic Pub | Menu QR",
  description: "Menu digital privado de Rustic Pub",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MenuQrPage() {
  return (
    <main className="menu-page">
      <Header />

      <section className="hero">
        <div className="hero__content">
          <div className="logo-lockup">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-rustic.png" alt="Rustic PUB" />
          </div>
          <p className="hero__copy">
            Cocina de pub, tragos de barra y platos para compartir sin vueltas.
          </p>
          <div className="hero__actions">
            <a href="#menu" className="button button--primary">
              Ver menu
            </a>
          </div>
        </div>
      </section>

      <section id="menu" className="menu-shell" aria-label="Menu de Rustic PUB">
        <CategoryNav />

        <div className="section-heading">
          <p className="eyebrow">Carta</p>
          <h2>Elegi tu seccion</h2>
        </div>

        <div className="category-grid">
          {menuSections.map((section) => (
            <Link className="category-card" href={`/menu-qr/${section.slug}`} key={section.slug}>
              <div className="category-card__image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getSectionCover(section)} alt={section.title} />
              </div>
              <div className="category-card__body">
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.note}</p>
                </div>
                <span>Ver {section.title.toLowerCase()}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
