"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Availability, ReservationView } from "../../lib/reservations";

type AdminDashboardProps = {
  initialAvailability: Availability;
  initialReservations: ReservationView[];
  today: string;
};

type AdminReservationsResponse = {
  availability: Availability | null;
  reservations: ReservationView[];
  message?: string;
};

type MutationResponse = {
  availability: Availability;
  reservation: ReservationView;
  message?: string;
};

type FormState = {
  date: string;
  name: string;
  people: string;
  phone: string;
};

const emptyMessage = "Todavia no hay reservas para mostrar.";

export function AdminDashboard({ initialAvailability, initialReservations, today }: AdminDashboardProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialReservations);
  const [availability, setAvailability] = useState(initialAvailability);
  const [filterDate, setFilterDate] = useState("");
  const [form, setForm] = useState<FormState>({ date: today, name: "", people: "2", phone: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const futureReservations = useMemo(
    () => reservations.filter((reservation) => reservation.date >= today),
    [reservations, today],
  );
  const historicalReservations = useMemo(
    () => reservations.filter((reservation) => reservation.date < today),
    [reservations, today],
  );
  const occupancy = Math.round((availability.reserved / availability.capacity) * 100);

  async function loadReservations(date = filterDate) {
    setIsLoading(true);
    setError("");

    try {
      const query = date ? `?date=${date}` : "";
      const response = await fetch(`/api/admin/reservas${query}`, { cache: "no-store" });
      const data = (await response.json()) as AdminReservationsResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos cargar reservas.");
      }

      setReservations(data.reservations);

      if (data.availability) {
        setAvailability(data.availability);
      } else {
        await loadAvailability(today);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos cargar reservas.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAvailability(date: string) {
    const response = await fetch(`/api/availability?date=${date}`, { cache: "no-store" });
    const data = (await response.json()) as Availability;

    if (response.ok) {
      setAvailability(data);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const response = await fetch(editingId ? `/api/admin/reservas/${editingId}` : "/api/admin/reservas", {
        body: JSON.stringify({
          date: form.date,
          name: form.name,
          people: Number(form.people),
          phone: form.phone,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: editingId ? "PATCH" : "POST",
      });
      const data = (await response.json()) as MutationResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos guardar la reserva.");
      }

      setAvailability(data.availability);
      setNotice(editingId ? "Reserva actualizada." : "Reserva creada.");
      resetForm();
      await loadReservations(filterDate);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos guardar la reserva.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(reservation: ReservationView) {
    const confirmed = window.confirm(`Eliminar la reserva de ${reservation.name}?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/reservas/${reservation.id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos eliminar la reserva.");
      }

      setNotice("Reserva eliminada.");
      await loadReservations(filterDate);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos eliminar la reserva.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  function startEditing(reservation: ReservationView) {
    setEditingId(reservation.id);
    setForm({
      date: reservation.date,
      name: reservation.name,
      people: String(reservation.people),
      phone: reservation.phone,
    });
    setNotice("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm({ date: today, name: "", people: "2", phone: "" });
  }

  return (
    <div className="min-h-screen bg-[#070504] px-4 py-6 text-amber-50 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-amber-200/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-amber-300">Rustic Pub</p>
            <h1 className="mt-2 text-4xl font-black uppercase leading-none text-white sm:text-5xl">
              Reservas
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
              href="/"
            >
              Ver web
            </Link>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200/20 px-4 text-sm font-black text-red-50 transition hover:bg-red-400/10"
              onClick={handleLogout}
              type="button"
            >
              Salir
            </button>
          </div>
        </header>

        <section className="grid gap-4 py-6 lg:grid-cols-[320px_1fr]">
          <aside className="grid gap-4">
            <article className="rounded-3xl border border-amber-200/15 bg-[#120c08] p-5">
              <p className="text-sm font-black uppercase text-amber-300">Ocupacion diaria</p>
              <div className="mt-4 flex items-end justify-between">
                <strong className="text-4xl font-black text-white">
                  {availability.reserved}/{availability.capacity}
                </strong>
                <span className="text-sm font-black text-amber-50/65">{occupancy}%</span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-200 to-amber-500"
                  style={{ width: `${Math.min(occupancy, 100)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-amber-50/60">{availability.date}</p>
            </article>

            <form className="rounded-3xl border border-amber-200/15 bg-black/35 p-5" onSubmit={handleSubmit}>
              <p className="text-sm font-black uppercase text-amber-300">
                {editingId ? "Editar reserva" : "Crear reserva"}
              </p>
              <div className="mt-4 grid gap-3">
                <AdminInput label="Nombre" onChange={(name) => setForm((current) => ({ ...current, name }))} value={form.name} />
                <AdminInput
                  label="Telefono"
                  onChange={(phone) => setForm((current) => ({ ...current, phone }))}
                  type="tel"
                  value={form.phone}
                />
                <AdminInput
                  label="Fecha"
                  onChange={(date) => setForm((current) => ({ ...current, date }))}
                  type="date"
                  value={form.date}
                />
                <AdminInput
                  label="Personas"
                  max="40"
                  min="1"
                  onChange={(people) => setForm((current) => ({ ...current, people }))}
                  type="number"
                  value={form.people}
                />
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  className="min-h-12 rounded-xl bg-amber-300 px-4 font-black text-[#140b04] transition hover:bg-amber-200 disabled:opacity-60"
                  disabled={isLoading}
                  type="submit"
                >
                  {editingId ? "Guardar cambios" : "Crear reserva"}
                </button>
                {editingId ? (
                  <button
                    className="min-h-11 rounded-xl border border-amber-200/20 px-4 font-black text-amber-100 transition hover:bg-amber-200/10"
                    onClick={resetForm}
                    type="button"
                  >
                    Cancelar edicion
                  </button>
                ) : null}
              </div>
            </form>
          </aside>

          <section className="rounded-3xl border border-amber-200/15 bg-black/35 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-amber-300">Listado</p>
                <h2 className="mt-1 text-2xl font-black uppercase text-white">Todas las reservas</h2>
              </div>
              <div className="grid gap-2 sm:flex">
                <input
                  className="min-h-11 rounded-xl border border-amber-200/20 bg-white/10 px-3 text-sm text-white outline-none focus:border-amber-300/70"
                  onChange={(event) => setFilterDate(event.target.value)}
                  type="date"
                  value={filterDate}
                />
                <button
                  className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
                  disabled={isLoading}
                  onClick={() => loadReservations(filterDate)}
                  type="button"
                >
                  Filtrar
                </button>
                <button
                  className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
                  disabled={isLoading}
                  onClick={() => {
                    setFilterDate("");
                    loadReservations("");
                  }}
                  type="button"
                >
                  Todas
                </button>
              </div>
            </div>

            {notice ? (
              <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-400/15 px-4 py-3 text-sm font-bold text-emerald-50">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
                {error}
              </p>
            ) : null}

            <ReservationTable
              emptyLabel={emptyMessage}
              onDelete={handleDelete}
              onEdit={startEditing}
              reservations={filterDate ? reservations : futureReservations}
              title={filterDate ? "Reservas del dia" : "Proximas reservas"}
            />

            {!filterDate ? (
              <ReservationTable
                emptyLabel="No hay reservas historicas."
                isHistorical
                onDelete={handleDelete}
                onEdit={startEditing}
                reservations={historicalReservations}
                title="Historial"
              />
            ) : null}
          </section>
        </section>
      </div>
    </div>
  );
}

function AdminInput({
  label,
  max,
  min,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-amber-50/80">
      {label}
      <input
        className="min-h-11 rounded-xl border border-amber-200/20 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-amber-300/70"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

function ReservationTable({
  emptyLabel,
  isHistorical = false,
  onDelete,
  onEdit,
  reservations,
  title,
}: {
  emptyLabel: string;
  isHistorical?: boolean;
  onDelete: (reservation: ReservationView) => void;
  onEdit: (reservation: ReservationView) => void;
  reservations: ReservationView[];
  title: string;
}) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-black uppercase text-amber-300">{title}</h3>
      <div className="mt-3 overflow-hidden rounded-2xl border border-amber-200/10">
        {reservations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-amber-200">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Telefono</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Personas</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr
                    className={`border-t border-amber-200/10 ${
                      isHistorical ? "bg-white/[.02] text-amber-50/55" : "text-amber-50/86"
                    }`}
                    key={reservation.id}
                  >
                    <td className="px-4 py-3 font-black text-white">{reservation.name}</td>
                    <td className="px-4 py-3">{reservation.phone}</td>
                    <td className="px-4 py-3">{reservation.date}</td>
                    <td className="px-4 py-3">{reservation.people}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg border border-amber-200/20 px-3 py-2 font-black text-amber-100 transition hover:bg-amber-200/10"
                          onClick={() => onEdit(reservation)}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-lg border border-red-200/20 px-3 py-2 font-black text-red-50 transition hover:bg-red-400/10"
                          onClick={() => onDelete(reservation)}
                          type="button"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-5 text-amber-50/60">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
