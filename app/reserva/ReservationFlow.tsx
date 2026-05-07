"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "../components/DatePicker";

export type Availability = {
  date: string;
  capacity: number;
  reserved: number;
  available: number;
  dayLabel: string;
  isHabitualOpenDay: boolean;
  isReservationDayEnabled: boolean;
  enabledDateStrings: string[];
  weekEndDate: string;
  weekStartDate: string;
  weekDays: {
    available: number;
    capacity: number;
    date: string;
    dayLabel: string;
    enabled: boolean;
    isFull: boolean;
    isPast: boolean;
    reserved: number;
    selectable: boolean;
  }[];
};

type ReservationView = {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  people: number;
  status: "canceled" | "confirmed" | "pending";
  createdAt: string;
  updatedAt: string;
  userEmail: string | null;
};

type CreateReservationResponse = {
  reservation: ReservationView;
  availability: Availability;
  message?: string;
};

type RecaptchaApi = {
  render: (
    element: HTMLElement,
    options: {
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      sitekey: string;
      theme?: "dark" | "light";
    },
  ) => number;
  reset: (widgetId?: number) => void;
};

declare global {
  interface Window {
    __rusticRecaptchaReady?: () => void;
    grecaptcha?: RecaptchaApi;
  }
}

const today = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
}).format(new Date());

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
const contactWhatsApp = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "").replace(/[^\d]/g, "");
const reservationWhatsAppUrl = contactWhatsApp
  ? `https://wa.me/${contactWhatsApp}?text=${encodeURIComponent(
      "Hola Rustic Pub, quiero solicitar una reserva.",
    )}`
  : "";
const blockedMessage = "Tu cuenta no tiene permisos para realizar reservas.";

export function ReservationFlow({ initialAvailability }: { initialAvailability: Availability }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [availability, setAvailability] = useState(initialAvailability);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(initialAvailability.date || today);
  const [time, setTime] = useState("21:00");
  const [people, setPeople] = useState("2");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaMessage, setRecaptchaMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ReservationView | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);
  const isBlockedRedirect = searchParams.get("blocked") === "1";

  const peopleNumber = useMemo(() => Number(people), [people]);
  const isOverCapacity = Number.isFinite(peopleNumber) && peopleNumber > availability.available;
  const allowedDates = useMemo(() => availability.weekDays.filter((day) => day.selectable).map((day) => day.date), [availability.weekDays]);
  const dayStatusByDate = useMemo(() => {
    const statuses: Record<string, "available" | "disabled" | "full" | "past"> = {};

    availability.weekDays.forEach((day) => {
      statuses[day.date] = day.isPast ? "past" : day.isFull ? "full" : day.selectable ? "available" : "disabled";
    });

    return statuses;
  }, [availability.weekDays]);
  const selectedDateIsEnabled = availability.isReservationDayEnabled && date >= today && date >= availability.weekStartDate && date <= availability.weekEndDate;
  const selectedDateIsFull = availability.isReservationDayEnabled && availability.available <= 0;
  const isAuthenticated = status === "authenticated";
  const userName = session?.user?.name || "invitado";
  const userImage = session?.user?.image;
  const canSubmit =
    isAuthenticated &&
    Boolean(recaptchaToken) &&
    Boolean(recaptchaSiteKey) &&
    selectedDateIsEnabled &&
    !selectedDateIsFull &&
    !isOverCapacity &&
    !success;

  useEffect(() => {
    let isMounted = true;

    const refreshAvailability = async () => {
      try {
        const response = await fetch(`/api/availability?date=${date}`, { cache: "no-store" });
        const data = (await response.json()) as Availability;

        if (isMounted && response.ok) {
          setAvailability(data);
        }
      } catch {
        if (isMounted) {
          setError("No pudimos actualizar la disponibilidad.");
        }
      }
    };

    refreshAvailability();
    const interval = window.setInterval(refreshAvailability, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [date]);

  useEffect(() => {
    if (!isAuthenticated || !recaptchaSiteKey) {
      return;
    }

    let isMounted = true;

    const renderRecaptcha = () => {
      if (!isMounted || !recaptchaContainerRef.current || !window.grecaptcha || recaptchaWidgetIdRef.current !== null) {
        return;
      }

      recaptchaWidgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
        callback: (token) => {
          setRecaptchaToken(token);
          setRecaptchaMessage("");
        },
        "error-callback": () => {
          setRecaptchaToken("");
          setRecaptchaMessage("No pudimos cargar reCAPTCHA. Actualiza la pagina e intentalo otra vez.");
        },
        "expired-callback": () => {
          setRecaptchaToken("");
          setRecaptchaMessage("El reCAPTCHA vencio. Marcalo de nuevo para continuar.");
        },
        sitekey: recaptchaSiteKey,
        theme: "dark",
      });
    };

    if (window.grecaptcha) {
      renderRecaptcha();
    } else {
      window.__rusticRecaptchaReady = renderRecaptcha;

      if (!document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]')) {
        const script = document.createElement("script");
        script.async = true;
        script.defer = true;
        script.src = "https://www.google.com/recaptcha/api.js?onload=__rusticRecaptchaReady&render=explicit";
        document.head.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace("/");
    }, 3200);

    return () => {
      window.clearTimeout(redirectTimer);
    };
  }, [router, success]);

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError("");
    await signIn("google", { redirectTo: "/reserva" });
  }

  async function handleCreateReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!isAuthenticated) {
      await handleGoogleSignIn();
      return;
    }

    if (!recaptchaSiteKey) {
      setError("Falta configurar reCAPTCHA para habilitar la reserva.");
      return;
    }

    if (!recaptchaToken) {
      setError("Completa el reCAPTCHA para confirmar la reserva.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reservas", {
        body: JSON.stringify({
          date,
          name,
          people: peopleNumber,
          phone,
          recaptchaToken,
          time,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as CreateReservationResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos crear la reserva.");
      }

      setAvailability(data.availability);
      setSuccess(data.reservation);
      setName("");
      setPhone("");
      setPeople("2");
      setTime("21:00");
      resetRecaptcha();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos crear la reserva.");
      resetRecaptcha();
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetRecaptcha() {
    setRecaptchaToken("");

    if (window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
      window.grecaptcha.reset(recaptchaWidgetIdRef.current);
    }
  }

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-black/45 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-6">
      {success ? <ReservationThanksOverlay reservation={success} /> : null}

      <div className="mb-5 grid gap-3">
        <div className="rounded-2xl border border-amber-200/15 bg-white/[.04] p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-black text-amber-50/85">
              Elegí un día de esta semana
              <DatePicker
                allowedDates={allowedDates}
                dayStatusByDate={dayStatusByDate}
                disabledAfter={availability.weekEndDate}
                disabledBefore={today}
                label="Disponibilidad"
                onChange={(value) => {
                  setDate(value);
                  setSuccess(null);
                }}
                showAvailabilityLegend
                value={date}
              />
              <span className="text-xs font-bold leading-5 text-amber-50/55">
                Solo se muestran días disponibles para reservas.
              </span>
            </label>
            <div className="rounded-2xl border border-amber-200/15 bg-[#120c08] px-4 py-3 text-right">
              <p className="text-xs font-black uppercase text-amber-300">Disponibilidad</p>
              <strong className="text-3xl font-black text-white">{availability.available}</strong>
            </div>
          </div>
          <p className="mt-4 text-base font-black text-white">
            Disponibilidad para {availability.dayLabel} {formatLongDisplayDate(availability.date)}: {availability.available} lugares
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase">
            <span className="rounded-full border border-amber-200/15 px-3 py-1 text-amber-100">
              {availability.dayLabel} {formatDisplayDate(availability.date)}
            </span>
            <span
              className={`rounded-full px-3 py-1 ${
                availability.isReservationDayEnabled
                  ? "bg-emerald-400/15 text-emerald-100"
                  : "bg-white/10 text-amber-50/55"
              }`}
            >
              {availability.isReservationDayEnabled ? "Disponible" : "No disponible"}
            </span>
            {selectedDateIsFull ? (
              <span className="rounded-full bg-red-400/12 px-3 py-1 text-red-100">Completo</span>
            ) : null}
            <span className="rounded-full border border-amber-200/15 px-3 py-1 text-amber-100">
              Cupo {availability.capacity} - Reservados {availability.reserved}
            </span>
          </div>
        </div>
      </div>

      {status === "loading" ? (
        <div className="grid gap-3">
          <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-14 animate-pulse rounded-xl bg-amber-200/20" />
        </div>
      ) : !isAuthenticated ? (
        <div className="grid gap-4 rounded-3xl border border-amber-200/10 bg-white/[.04] p-4">
          {isBlockedRedirect ? (
            <p className="rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
              {blockedMessage}
            </p>
          ) : null}
          <div>
            <p className="text-xs font-black uppercase text-amber-300">Login seguro</p>
            <h2 className="mt-1 text-2xl font-black text-white">Reserva con tu cuenta Google</h2>
          </div>
          <button
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-5 text-base font-black text-[#140b04] shadow-[0_18px_45px_rgba(255,255,255,.16)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
            disabled={isSigningIn}
            onClick={handleGoogleSignIn}
            type="button"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full border border-black/10 bg-white text-lg font-black text-[#4285f4]">
              G
            </span>
            {isSigningIn ? "Abriendo Google..." : "Continuar con Google"}
          </button>
          {reservationWhatsAppUrl ? (
            <div className="grid gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
              <p className="text-sm font-bold leading-6 text-emerald-50/80">
                Si no tenes cuenta Google, tambien podes solicitar la reserva por WhatsApp.
              </p>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#25d366] px-5 text-sm font-black text-[#07130b] shadow-[0_16px_38px_rgba(37,211,102,.22)] transition hover:-translate-y-0.5 hover:bg-[#5bf08f]"
                href={reservationWhatsAppUrl}
                rel="noreferrer"
                target="_blank"
              >
                Solicitar por WhatsApp
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <details className="group mb-5 rounded-2xl border border-amber-200/15 bg-white/[.04] p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-11 w-11 rounded-full border border-amber-200/25 object-cover"
                    referrerPolicy="no-referrer"
                    src={userImage}
                  />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-amber-200/25 bg-amber-300 text-lg font-black text-[#140b04]">
                    {userName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-xs font-black uppercase text-amber-300">Continuar como</span>
                  <span className="block truncate text-base font-black text-white">{userName}</span>
                </span>
              </span>
              <span className="rounded-full border border-amber-200/15 px-3 py-1 text-xs font-black text-amber-100 transition group-open:bg-amber-200/10">
                Cuenta
              </span>
            </summary>
            <div className="mt-3 grid gap-3 border-t border-amber-200/10 pt-3">
              <p className="truncate text-sm font-bold text-amber-50/62">{session.user?.email}</p>
              <button
                className="min-h-10 rounded-xl border border-red-200/20 px-4 text-sm font-black text-red-50 transition hover:bg-red-400/10"
                onClick={() => signOut({ redirectTo: "/reserva" })}
                type="button"
              >
                Cerrar sesion
              </button>
            </div>
          </details>

          <form className="grid gap-4" onSubmit={handleCreateReservation}>
            <label className="grid gap-2 text-sm font-black text-amber-50/85">
              Nombre
              <input
                autoComplete="name"
                className="min-h-12 rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                maxLength={80}
                minLength={2}
                onChange={(event) => setName(event.target.value)}
                placeholder={session.user?.name ?? "Tu nombre"}
                required
                type="text"
                value={name}
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-amber-50/85">
              Telefono
              <input
                autoComplete="tel"
                className="min-h-12 rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="3498 438728"
                required
                type="tel"
                value={phone}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-amber-50/85">
                Fecha
                <DatePicker
                  allowedDates={allowedDates}
                  dayStatusByDate={dayStatusByDate}
                  disabledAfter={availability.weekEndDate}
                  disabledBefore={today}
                  label="Reserva"
                  onChange={(value) => {
                    setDate(value);
                    setSuccess(null);
                  }}
                  showAvailabilityLegend
                  value={date}
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-amber-50/85">
                Horario
                <input
                  className="min-h-12 rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                  onChange={(event) => setTime(event.target.value)}
                  required
                  type="time"
                  value={time}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-amber-50/85">
                Personas
                <input
                  className="min-h-12 rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                  max={availability.capacity}
                  min={1}
                  onChange={(event) => setPeople(event.target.value)}
                  required
                  type="number"
                  value={people}
                />
              </label>
            </div>

            <div className="grid gap-2 rounded-2xl border border-amber-200/10 bg-white/[.04] p-3">
              {recaptchaSiteKey ? (
                <div className="min-h-[78px]" ref={recaptchaContainerRef} />
              ) : (
                <p className="rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
                  Falta configurar NEXT_PUBLIC_RECAPTCHA_SITE_KEY.
                </p>
              )}
              {recaptchaMessage ? <p className="text-xs font-bold text-amber-100">{recaptchaMessage}</p> : null}
            </div>

            {isOverCapacity ? (
              <p className="rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
                Para esa fecha quedan {availability.available} lugares. Proba con menos personas u otro dia.
              </p>
            ) : null}

            {!selectedDateIsEnabled ? (
              <p className="rounded-xl border border-amber-200/20 bg-white/10 px-4 py-3 text-sm font-bold text-amber-50/70">
                Ese día no está habilitado para reservas o está fuera de la semana actual.
              </p>
            ) : null}

            {selectedDateIsFull ? (
              <p className="rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
                Ese día está completo. Elegí otro día disponible de esta semana.
              </p>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
                {error}
              </p>
            ) : null}

            <button
              className="min-h-14 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-6 text-base font-black text-[#140b04] shadow-[0_18px_45px_rgba(245,158,11,.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isSubmitting || !canSubmit}
              type="submit"
            >
              {isSubmitting ? "Reservando..." : "Confirmar reserva"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function formatLongDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function ReservationThanksOverlay({ reservation }: { reservation: ReservationView }) {
  return (
    <div className="reservation-thanks" role="status" aria-live="polite">
      <div className="reservation-thanks__card">
        <div className="reservation-thanks__logo">
          <Image src="/logo-rustic.png" alt="Rustic Pub" width={148} height={148} priority />
        </div>
        <p>Reserva confirmada</p>
        <h2>Gracias, {reservation.name}</h2>
        <span>
          Te esperamos a las {reservation.time}. Volviendo al inicio...
        </span>
      </div>
    </div>
  );
}
