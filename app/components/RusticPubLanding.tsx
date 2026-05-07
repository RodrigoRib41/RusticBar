/* eslint-disable @next/next/no-html-link-for-pages */

import { SiteFooter } from "./SiteFooter";

const MAP_DIRECTIONS_URL = "https://maps.app.goo.gl/yfZzvNXGbASTPVUH8";
const MAP_EMBED_URL =
  "https://www.google.com/maps?q=Gobernador%20Crespo%2C%20Santa%20Fe%2C%20Argentina&z=14&output=embed";

const benefits = [
  ["01", "Reserva simple", "Elegis fecha, cantidad de personas y confirmas tu lugar online."],
  ["02", "Ambiente premium", "Luces calidas, buena musica y energia de pub para disfrutar sin apuro."],
  ["03", "Plan redondo", "Tragos, comida y mesa lista para venir con amigos o pareja."],
];

export function RusticPubLanding() {
  return (
    <main className="min-h-screen scroll-smooth bg-[#070504] text-[#fff6e7]">
      <style>{`
        @keyframes rusticFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes rusticFloat {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: .4; }
          50% { transform: translate3d(18px, -20px, 0); opacity: .85; }
        }

        .rustic-fade-up { animation: rusticFadeUp .75s ease both; }
        .rustic-delay-1 { animation-delay: .12s; }
        .rustic-delay-2 { animation-delay: .24s; }
        .rustic-delay-3 { animation-delay: .36s; }
        .rustic-float { animation: rusticFloat 8s ease-in-out infinite; }
      `}</style>

      <HeroSection />
      <BenefitsSection />
      <ReservationSection />
      <LocationSection />
      <SiteFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-[#d4c2a8] px-4 pb-8 pt-5 sm:px-6 lg:px-10">
      <div
        className="absolute inset-0 -z-20 bg-[length:780px_auto] bg-[center_92px] bg-no-repeat will-change-transform sm:scale-[1.03] sm:bg-cover sm:bg-center"
        style={{
          backgroundImage: "url('/hero.png')",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,5,4,.06)_0%,rgba(7,5,4,.18)_34%,rgba(7,5,4,.72)_68%,rgba(7,5,4,.98)_100%),linear-gradient(90deg,rgba(7,5,4,.58),rgba(7,5,4,.05)_42%,rgba(7,5,4,.62))]" />
      <div className="absolute inset-0 -z-10 opacity-[.18] [background-image:linear-gradient(rgba(17,16,13,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(17,16,13,.18)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="rustic-float absolute left-[12%] top-[16%] h-28 w-28 rounded-full bg-black/10 blur-3xl" />
      <div className="rustic-float absolute right-[8%] top-[24%] h-44 w-44 rounded-full bg-amber-700/20 blur-3xl [animation-delay:1.4s]" />

      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <a href="/" className="flex items-center gap-3 rounded-full border border-black/10 bg-[#d8c5aa]/80 px-2 py-1 shadow-xl shadow-black/10 backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-12 w-12 rounded-full object-cover shadow-[0_0_40px_rgba(245,158,11,.25)]"
            src="/logo-rustic.png"
            alt=""
          />
          <span className="text-sm font-black uppercase tracking-normal text-[#14110d]">Rustic Pub</span>
        </a>
        <a
          className="hidden rounded-full border border-black/15 bg-[#d8c5aa]/80 px-4 py-2 text-sm font-black text-[#14110d] shadow-xl shadow-black/10 backdrop-blur transition hover:bg-amber-200 sm:inline-flex"
          href="/reserva"
        >
          Reservar
        </a>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div className="max-w-3xl">
          <p className="rustic-fade-up mb-4 w-fit rounded-full border border-amber-300/25 bg-black/35 px-3 py-2 text-xs font-black uppercase tracking-normal text-amber-200 backdrop-blur">
            Tu nuevo pub favorito
          </p>
          <h1 className="rustic-fade-up rustic-delay-1 text-5xl font-black uppercase leading-[.88] text-white drop-shadow-[0_6px_0_rgba(91,43,10,.55)] sm:text-6xl lg:text-8xl">
            Vivi la experiencia Rustic
          </h1>
          <p className="rustic-fade-up rustic-delay-2 mt-5 max-w-xl text-lg font-semibold leading-7 text-amber-50/88 sm:text-xl">
            Tragos, musica y noches que no se olvidan en Gobernador Crespo.
          </p>
          <div className="rustic-fade-up rustic-delay-3 mt-7 grid gap-3 sm:flex">
            <a
              className="inline-flex min-h-14 items-center justify-center rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-6 text-base font-black text-[#130b04] shadow-[0_18px_45px_rgba(245,158,11,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(245,158,11,.38)]"
              href="/reserva"
            >
              Reservar
            </a>
          </div>
        </div>

        <div className="hidden rounded-2xl border border-[#d8c5aa]/25 bg-black/50 p-5 backdrop-blur-xl lg:block">
          <p className="text-xs font-black uppercase text-amber-300">Hoy en Rustic</p>
          <p className="mt-3 text-3xl font-black leading-tight text-white">Mesa lista, barra prendida y buena energia.</p>
          <p className="mt-4 text-sm leading-6 text-amber-50/70">
            Reserva online y llega directo a disfrutar.
          </p>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="border-y border-[#d8c5aa]/15 bg-[linear-gradient(180deg,rgba(216,197,170,.08),rgba(12,8,6,1)_42%),#0c0806] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="max-w-3xl text-2xl font-black leading-tight text-white sm:text-4xl">
          Nada mejor que buenos tragos, comida y amigos para compartir tu momento Rustic.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {benefits.map(([number, title, copy]) => (
            <article
              className="rounded-2xl border border-[#d8c5aa]/18 bg-[linear-gradient(180deg,rgba(216,197,170,.09),rgba(18,12,8,.96)),#120c08] p-5 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-300/40 hover:bg-[#1b1008]"
              key={title}
            >
              <span className="text-sm font-black text-amber-300">{number}</span>
              <h3 className="mt-5 text-xl font-black uppercase text-amber-100">{title}</h3>
              <p className="mt-3 leading-6 text-amber-50/66">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReservationSection() {
  return (
    <section
      className="border-y border-[#d8c5aa]/15 bg-[linear-gradient(135deg,rgba(216,197,170,.24),rgba(18,12,8,.98)_40%,rgba(7,5,4,1))] px-4 py-14 sm:px-6 lg:px-10 lg:py-20"
      id="reserva"
    >
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-xs font-black uppercase text-amber-300">Reserva</p>
        <h2 className="text-4xl font-black uppercase leading-none text-white sm:text-6xl">Reserva tu lugar</h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-amber-50/78">
          La reserva se hace en una pagina separada para que el proceso sea claro, rapido y sin distracciones.
          Capacidad diaria maxima: 40 personas.
        </p>
        <div className="mt-7 grid gap-3 sm:flex">
          <a
            className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#d8c5aa] px-6 text-base font-black text-[#130b04] shadow-[0_18px_45px_rgba(216,197,170,.18)] transition hover:-translate-y-0.5 hover:bg-amber-200"
            href="/reserva"
          >
            Ir a reserva
          </a>
        </div>
      </div>
    </section>
  );
}

function LocationSection() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-10 lg:py-20" id="ubicacion">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
        <div>
          <p className="mb-3 text-xs font-black uppercase text-amber-400">Ubicacion</p>
          <h2 className="text-3xl font-black uppercase leading-none text-white sm:text-4xl">
            E. Lopez 353, Gobernador Crespo
          </h2>
          <p className="mt-4 text-lg leading-7 text-amber-50/72">
            Te esperamos en Santa Fe para vivir noches unicas.
          </p>
          <a
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-5 font-black text-[#130b04] transition hover:-translate-y-0.5 hover:bg-amber-200"
            href={MAP_DIRECTIONS_URL}
            rel="noreferrer"
            target="_blank"
          >
            Como llegar
          </a>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/14 bg-[#140d08] shadow-[0_30px_80px_rgba(0,0,0,.35)]">
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-2xl border border-amber-200/25 bg-black/70 px-4 py-3 text-sm font-black text-amber-50 shadow-xl backdrop-blur">
            Gobernador Crespo / Santa Fe
          </div>
          <iframe
            className="h-[320px] w-full sm:h-[420px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={MAP_EMBED_URL}
            title="Mapa de Rustic Pub"
          />
        </div>
      </div>
    </section>
  );
}
