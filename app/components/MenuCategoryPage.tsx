import Link from "next/link";
import { MenuSection, menuSections } from "../menu-data";

type MenuCategoryPageProps = {
  section: MenuSection;
};

export function MenuCategoryPage({ section }: MenuCategoryPageProps) {
  return (
    <main className="menu-page">
      <Header />
      <section className="category-hero">
        <p className="eyebrow">Rustic PUB</p>
        <h1>{section.title}</h1>
        <p>{section.note}</p>
      </section>

      <section className="menu-shell menu-shell--compact" aria-label={section.title}>
        <CategoryNav activeSlug={section.slug} />
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
                    <div className="photo-item__image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="photo-item__body">
                      <div className="menu-item__title">
                        <h3>{item.name}</h3>
                        {item.badge ? <span>{item.badge}</span> : null}
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

export function Header() {
  return (
    <header className="topbar" aria-label="Encabezado de Rustic PUB">
      <Link href="/" className="brand">
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

export function CategoryNav({ activeSlug }: { activeSlug?: MenuSection["slug"] }) {
  return (
    <nav className="category-nav" aria-label="Categorias del menu">
      {menuSections.map((section) => (
        <Link
          aria-current={activeSlug === section.slug ? "page" : undefined}
          href={`/${section.slug}`}
          key={section.slug}
        >
          {section.title}
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
