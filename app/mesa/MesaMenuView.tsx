"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MenuCatalogSection } from "../../lib/menu-types";
import { MenuImage } from "../components/MenuImage";

type MesaMenuViewProps = {
  sections: MenuCatalogSection[];
};

export function MesaMenuView({ sections }: MesaMenuViewProps) {
  const [activeSlug, setActiveSlug] = useState<MenuCatalogSection["slug"]>(sections[0]?.slug ?? "comida");
  const activeSection = useMemo(
    () => sections.find((section) => section.slug === activeSlug) ?? sections[0],
    [activeSlug, sections],
  );

  return (
    <main className="min-h-screen bg-[#070504] pb-12 text-amber-50">
      <header className="sticky top-0 z-30 border-b border-amber-200/10 bg-[#070504]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-amber-200/20 shadow-xl shadow-black/35">
              <Image alt="" className="h-full w-full object-cover" height={48} src="/logo-rustic.png" width={48} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase text-amber-300">Rustic Pub</span>
              <strong className="block truncate text-xl font-black uppercase text-white">Menu de mesa</strong>
            </span>
          </Link>
          <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase text-emerald-100 sm:block">
            Solo lectura
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="overflow-hidden rounded-3xl border border-amber-200/15 bg-[linear-gradient(135deg,rgba(216,197,170,.22),rgba(18,12,8,.96)_46%),#120c08] p-5 shadow-2xl shadow-black/30 sm:p-7">
          <p className="text-sm font-black uppercase text-amber-300">Carta completa</p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-none text-white sm:text-6xl">
            Menu Rustic
          </h1>
        </div>

        <nav className="sticky top-[73px] z-20 -mx-4 mt-5 flex gap-2 overflow-x-auto border-y border-amber-200/10 bg-[#070504]/90 px-4 py-3 backdrop-blur-xl">
          {sections.map((section) => (
            <button
              aria-pressed={activeSlug === section.slug}
              className={`min-h-11 flex-none rounded-full px-5 py-3 text-sm font-black transition ${
                activeSlug === section.slug
                  ? "bg-amber-300 text-[#130b04]"
                  : "border border-amber-200/20 text-amber-100 hover:bg-amber-300 hover:text-[#130b04]"
              }`}
              key={section.slug}
              onClick={() => setActiveSlug(section.slug)}
              type="button"
            >
              {section.title}
            </button>
          ))}
        </nav>

        {activeSection ? (
          <section className="mt-6">
            <div className="mb-4">
              <p className="text-xs font-black uppercase text-amber-300">Rustic Pub</p>
              <h2 className="mt-1 text-3xl font-black uppercase leading-none text-white sm:text-5xl">
                {activeSection.title}
              </h2>
              <p className="mt-2 max-w-2xl leading-6 text-amber-50/60">{activeSection.note}</p>
            </div>

            <div className="grid gap-6">
              {activeSection.groups.map((group) => (
                <section
                  className="rounded-3xl border border-amber-200/12 bg-black/24 p-4 shadow-xl shadow-black/20"
                  key={group.title}
                >
                  <div className="mb-4">
                    <h3 className="text-2xl font-black uppercase leading-none text-amber-100">{group.title}</h3>
                    {group.note ? <p className="mt-2 text-sm font-semibold text-amber-50/58">{group.note}</p> : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {group.items.map((item) => (
                      <article
                        className="grid min-h-32 overflow-hidden rounded-2xl border border-amber-200/12 bg-[#120c08] shadow-lg shadow-black/15 sm:grid-cols-[128px_minmax(0,1fr)]"
                        key={item.id}
                      >
                        <div className="relative h-40 bg-black sm:h-auto">
                          <MenuImage alt={item.name} sizes="(max-width: 640px) 100vw, 128px" src={item.image} />
                        </div>
                        <div className="grid min-w-0 content-between gap-3 p-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-black uppercase leading-tight text-white">{item.name}</h4>
                            </div>
                            <p className="mt-2 text-sm leading-5 text-amber-50/62">{item.description}</p>
                          </div>
                          <strong className="text-lg font-black text-amber-200">{item.price}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              {activeSection.groups.length === 0 ? (
                <p className="rounded-3xl border border-amber-200/12 bg-[#120c08] p-8 text-center text-amber-50/60">
                  Todavia no hay productos activos en esta categoria.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
