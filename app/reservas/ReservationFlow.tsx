"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

export type Availability = {
  date: string;
  capacity: number;
  reserved: number;
  available: number;
};

type ReservationView = {
  id: string;
  name: string;
  phone: string;
  date: string;
  people: number;
  createdAt: string;
};

type CreateReservationResponse = {
  reservation: ReservationView;
  availability: Availability;
  message?: string;
};

const today = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
}).format(new Date());

export function ReservationFlow({ initialAvailability }: { initialAvailability: Availability }) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [availability, setAvailability] = useState(initialAvailability);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(initialAvailability.date || today);
  const [people, setPeople] = useState("2");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ReservationView | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const peopleNumber = useMemo(() => Number(people), [people]);
  const isOverCapacity = Number.isFinite(peopleNumber) && peopleNumber > availability.available;

  function openDatePicker() {
    const input = dateInputRef.current;

    if (!input) {
      return;
    }

    const datePickerInput = input as HTMLInputElement & { showPicker?: () => void };

    if (typeof datePickerInput.showPicker === "function") {
      datePickerInput.showPicker();
      return;
    }

    input.focus();
  }

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
    const interval = window.setInterval(refreshAvailability, 6000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [date]);

  async function handleCreateReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reservas", {
        body: JSON.stringify({
          date,
          name,
          people: peopleNumber,
          phone,
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
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos crear la reserva.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-black/45 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3">
        <span className="text-sm font-black text-emerald-100">Lugares disponibles</span>
        <strong className="text-2xl font-black text-white">{availability.available}</strong>
      </div>

      <form className="grid gap-4" onSubmit={handleCreateReservation}>
        <label className="grid gap-2 text-sm font-black text-amber-50/85">
          Nombre
          <input
            autoComplete="name"
            className="min-h-12 rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
            maxLength={80}
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre"
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
            <input
              className="min-h-12 cursor-pointer rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
              min={today}
              onClick={openDatePicker}
              onChange={(event) => {
                setDate(event.target.value);
                setSuccess(null);
              }}
              ref={dateInputRef}
              required
              type="date"
              value={date}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-amber-50/85">
            Personas
            <input
              className="min-h-12 rounded-xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
              max={40}
              min={1}
              onChange={(event) => setPeople(event.target.value)}
              required
              type="number"
              value={people}
            />
          </label>
        </div>

        {isOverCapacity ? (
          <p className="rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
            Para esa fecha quedan {availability.available} lugares. Proba con menos personas u otro dia.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
            {error}
          </p>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/15 px-4 py-4 text-emerald-50">
            <p className="text-xs font-black uppercase text-emerald-200">Reserva confirmada</p>
            <p className="mt-1 text-lg font-black">
              {success.name}, mesa para {success.people} {success.people === 1 ? "persona" : "personas"}.
            </p>
          </div>
        ) : null}

        <button
          className="min-h-14 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-6 text-base font-black text-[#140b04] shadow-[0_18px_45px_rgba(245,158,11,.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isSubmitting || isOverCapacity}
          type="submit"
        >
          {isSubmitting ? "Reservando..." : "Confirmar reserva"}
        </button>
      </form>
    </section>
  );
}
