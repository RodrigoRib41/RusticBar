import Link from "next/link";
import { MENU_CATEGORY_OPTIONS, type MenuCatalogSection } from "../../lib/menu-types";
import { MenuImage } from "./MenuImage";

type MenuCategoryPageProps = {
  section: MenuCatalogSection;
  basePath?: string;
};

export function MenuCategoryPage({ section, basePath = "/menu-qr" }: MenuCategoryPageProps) {
  return (
    <main className="menu-page">
      <Header basePath={basePath} />
      <section className="category-hero">
        <p className="eyebrow">Rustic PUB</p>
        <h1>{section.title}</h1>
        <p>{section.note}</p>
      </section>

      <section className="menu-shell menu-shell--compact" aria-label={section.title}>
        <CategoryNav activeSlug={section.slug} basePath={basePath} />
        <nav className="subcat-nav" aria-label={`Categorias de ${section.title}`}>
          {section.groups.map((group) => (
            <a href={`#${toAnchor(group.title)}`} key={group.title}>
              {group.title}
            </a>
          ))}
        </nav>

        <div className="menu-groups">
          {section.groups.map((group) => (
            <section className="menu-group" id={toAnchor(group.title)} key={group.title}>
              <div className="menu-group__header">
                <h2>{group.title}</h2>
                {group.note ? <p>{group.note}</p> : null}
              </div>
              <div className="item-list">
                {group.items.map((item) => (
                  <article className="photo-item" key={item.name}>
                    <div className="photo-item__image relative">
                      <MenuImage alt={item.name} sizes="(max-width: 640px) 100vw, 240px" src={item.image} />
                    </div>
                    <div className="photo-item__body">
                      <div className="menu-item__title">
                        <h3>{item.name}</h3>
                      </div>
                      <p>{item.description}</p>
                      <strong>{item.price}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

export function Header({ basePath = "/menu-qr" }: { basePath?: string }) {
  return (
    <header className="topbar" aria-label="Encabezado de Rustic PUB">
      <Link href={basePath} className="brand">
        <span className="brand__seal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-rustic.png" alt="" />
        </span>
        <span>
          <strong>Rustic</strong>
          <small>Pub menu</small>
        </span>
      </Link>
    </header>
  );
}

export function CategoryNav({
  activeSlug,
  basePath = "/menu-qr",
}: {
  activeSlug?: MenuCatalogSection["slug"];
  basePath?: string;
}) {
  return (
    <nav className="category-nav" aria-label="Categorias del menu">
      {MENU_CATEGORY_OPTIONS.map((section) => (
        <Link
          aria-current={activeSlug === section.value ? "page" : undefined}
          href={`${basePath}/${section.value}`}
          key={section.value}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}

const toAnchor = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
