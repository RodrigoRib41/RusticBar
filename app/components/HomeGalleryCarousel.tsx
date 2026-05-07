"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { HomeGalleryImageView } from "../../lib/home-gallery";

type HomeGalleryCarouselProps = {
  images: HomeGalleryImageView[];
};

type Slide = {
  alt: string | null;
  id: string;
  imageUrl: string;
};

const fallbackSlides: Slide[] = [
  {
    alt: "Rustic Pub",
    id: "rustic-fallback",
    imageUrl: "/hero.png",
  },
];

export function HomeGalleryCarousel({ images }: HomeGalleryCarouselProps) {
  const slides = useMemo<Slide[]>(() => (images.length ? images : fallbackSlides), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const activeSlideIndex = Math.min(activeIndex, slides.length - 1);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  function goToPrevious() {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function goToNext() {
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  return (
    <section className="border-y border-[#d8c5aa]/15 bg-[#0c0806] px-4 py-14 sm:px-6 lg:px-10 lg:py-20" aria-label="Galería de Rustic Pub">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-black uppercase text-amber-300">Rustic en imágenes</p>
            <h2 className="max-w-3xl text-3xl font-black uppercase leading-none text-white sm:text-5xl">
              Noches, barra y momentos para volver.
            </h2>
          </div>
          <span className="w-fit rounded-full border border-amber-200/15 px-4 py-2 text-xs font-black uppercase text-amber-100">
            {slides.length} foto{slides.length === 1 ? "" : "s"}
          </span>
        </div>

        <div
          className="group relative overflow-hidden rounded-[2rem] border border-amber-200/16 bg-[#140d08] shadow-[0_30px_90px_rgba(0,0,0,.45)]"
          onPointerDown={(event) => {
            touchStartX.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (touchStartX.current === null || slides.length <= 1) {
              return;
            }

            const distance = event.clientX - touchStartX.current;
            touchStartX.current = null;

            if (Math.abs(distance) < 42) {
              return;
            }

            if (distance > 0) {
              goToPrevious();
            } else {
              goToNext();
            }
          }}
        >
          <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]">
            {slides.map((slide, index) => (
              <div
                aria-hidden={index !== activeSlideIndex}
                className={`absolute inset-0 transition duration-700 ease-out ${
                  index === activeSlideIndex ? "translate-x-0 opacity-100" : index < activeSlideIndex ? "-translate-x-6 opacity-0" : "translate-x-6 opacity-0"
                }`}
                key={slide.id}
              >
                <Image
                  alt={slide.alt ?? "Foto de Rustic Pub"}
                  className="object-cover"
                  fill
                  priority={index === 0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 92vw, 1120px"
                  src={slide.imageUrl}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,4,.06),rgba(7,5,4,.62))]" />
              </div>
            ))}
          </div>

          {slides.length > 1 ? (
            <>
              <button
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-amber-200/20 bg-black/50 text-xl font-black text-amber-50 shadow-xl backdrop-blur transition hover:bg-black/70 sm:grid"
                onClick={goToPrevious}
                type="button"
              >
                {"<"}
              </button>
              <button
                aria-label="Foto siguiente"
                className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-amber-200/20 bg-black/50 text-xl font-black text-amber-50 shadow-xl backdrop-blur transition hover:bg-black/70 sm:grid"
                onClick={goToNext}
                type="button"
              >
                {">"}
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {slides.map((slide, index) => (
                  <button
                    aria-label={`Ver foto ${index + 1}`}
                    className={`h-2.5 rounded-full transition ${
                      index === activeSlideIndex ? "w-9 bg-amber-300" : "w-2.5 bg-white/45 hover:bg-white/70"
                    }`}
                    key={slide.id}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
