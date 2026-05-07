"use client";

import * as Popover from "@radix-ui/react-popover";
import { DayPicker, type Matcher } from "react-day-picker";

type DatePickerProps = {
  allowedDates?: string[];
  allowedWeekDays?: number[];
  dayStatusByDate?: Record<string, "available" | "disabled" | "full" | "past">;
  disabledAfter?: string;
  disabledBefore?: string;
  label?: string;
  onChange: (value: string) => void;
  showAvailabilityLegend?: boolean;
  value: string;
};

export function DatePicker({
  allowedDates,
  allowedWeekDays,
  dayStatusByDate,
  disabledAfter,
  disabledBefore,
  label = "Fecha",
  onChange,
  showAvailabilityLegend = false,
  value,
}: DatePickerProps) {
  const selected = value ? dateStringToDate(value) : undefined;
  const minDate = disabledBefore ? dateStringToDate(disabledBefore) : undefined;
  const maxDate = disabledAfter ? dateStringToDate(disabledAfter) : undefined;
  const allowedDateSet = Array.isArray(allowedDates) ? new Set(allowedDates) : null;
  const allowedWeekDaySet = Array.isArray(allowedWeekDays) ? new Set(allowedWeekDays) : null;
  const disabledDays: Matcher[] = [];

  if (minDate) {
    disabledDays.push({ before: minDate });
  }

  if (maxDate) {
    disabledDays.push({ after: maxDate });
  }

  if (allowedDateSet) {
    disabledDays.push((day) => !allowedDateSet.has(dateToString(day)));
  }

  if (allowedWeekDaySet) {
    disabledDays.push((day) => !allowedWeekDaySet.has(day.getDay()));
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="min-h-12 rounded-2xl border border-amber-200/20 bg-white/10 px-4 text-left text-sm font-black text-white outline-none transition hover:bg-white/[.14] focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
          type="button"
        >
          <span className="block text-[10px] uppercase tracking-wide text-amber-200/70">{label}</span>
          <span className="mt-1 block text-base">{value ? formatDisplayDate(value) : "Seleccionar fecha"}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-[80] rounded-3xl border border-amber-200/20 bg-[#100b07] p-3 text-amber-50 shadow-2xl shadow-black/50"
          sideOffset={8}
        >
          <DayPicker
            classNames={{
              button_next:
                "inline-flex items-center justify-center rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-amber-100 opacity-100 transition hover:bg-amber-200/20",
              button_previous:
                "inline-flex items-center justify-center rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-amber-100 opacity-100 transition hover:bg-amber-200/20",
              caption_label: "text-sm font-black uppercase text-amber-200",
              chevron: "h-5 w-5 fill-current stroke-current text-amber-100 opacity-100",
              day: "rounded-xl text-sm font-bold transition hover:bg-amber-300/15",
              day_button: "grid h-9 w-9 place-items-center rounded-xl",
              disabled: "cursor-not-allowed text-amber-50/20 opacity-30 hover:bg-transparent",
              month_grid: "border-separate border-spacing-1",
              month_caption: "mb-3 flex justify-center",
              months: "grid gap-3",
              nav: "absolute left-3 right-3 top-3 flex justify-between",
              selected: "bg-amber-300 text-[#140b04] hover:bg-amber-300",
              today: "text-emerald-200",
              weekday: "pb-2 text-xs font-black uppercase text-amber-50/45",
            }}
            disabled={disabledDays.length ? disabledDays : undefined}
            formatters={{
              formatCaption: (date) =>
                capitalize(
                  new Intl.DateTimeFormat("es-AR", {
                    month: "long",
                    year: "numeric",
                  }).format(date),
                ),
              formatWeekdayName: (date) =>
                new Intl.DateTimeFormat("es-AR", {
                  weekday: "short",
                })
                  .format(date)
                  .replace(".", ""),
            }}
            labels={{
              labelNext: () => "Mes siguiente",
              labelPrevious: () => "Mes anterior",
            }}
            modifiers={{
              available: (day) => dayStatusByDate?.[dateToString(day)] === "available",
              full: (day) => dayStatusByDate?.[dateToString(day)] === "full",
              past: (day) => dayStatusByDate?.[dateToString(day)] === "past",
            }}
            modifiersClassNames={{
              available: "text-emerald-100 ring-1 ring-emerald-300/35",
              full: "bg-red-400/10 text-red-100 line-through",
              past: "text-amber-50/20",
            }}
            mode="single"
            onSelect={(day) => {
              if (day) {
                onChange(dateToString(day));
              }
            }}
            selected={selected}
            showOutsideDays
            weekStartsOn={1}
          />
          {showAvailabilityLegend ? (
            <div className="mt-3 rounded-2xl border border-amber-200/10 bg-white/[.04] p-3">
              <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase">
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-100">Disponible</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-amber-50/55">No disponible</span>
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-amber-50/55">
                Solo se muestran días disponibles para reservas.
              </p>
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateStringToDate(value));
}

function dateStringToDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function dateToString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
