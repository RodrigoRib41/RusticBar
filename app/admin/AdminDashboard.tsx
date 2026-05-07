"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DatePicker } from "../components/DatePicker";
import type { BalanceView } from "../../lib/balance";
import type { BlockedEmailView } from "../../lib/blocked-emails";
import type { HomeGalleryImageView } from "../../lib/home-gallery";
import type { MenuAdminView } from "../../lib/menu-types";
import type { OrderState, PedidoView } from "../../lib/orders";
import type { Availability, ReservationSettingsView, ReservationView } from "../../lib/reservations";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";
import { MenuAdminPanel } from "./MenuAdminPanel";

type AdminDashboardProps = {
  initialAvailability: Availability;
  initialBalance: BalanceView;
  initialBlockedEmails: BlockedEmailView[];
  initialHomeGallery: HomeGalleryImageView[];
  initialMenu: MenuAdminView;
  initialPedidos: PedidoView[];
  initialReservations: ReservationView[];
  initialReservationSettings: ReservationSettingsView;
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

type AdminPedidosResponse = {
  pedidos: PedidoView[];
  message?: string;
};

type OrderMutationResponse = {
  pedido: PedidoView;
  message?: string;
};

type ResetMesaResponse = {
  deletedCount?: number;
  mesa?: number;
  message?: string;
  revenueAmount?: number;
  revenueOrderCount?: number;
  revenueDate?: string;
};

type AdminBalanceResponse = {
  balance: BalanceView;
  message?: string;
};

type BalanceResetResponse = {
  deletedCount?: number;
  message?: string;
};

type DeleteReservationsDayResponse = {
  availability?: Availability;
  deletedCount?: number;
  message?: string;
};

type ReservationCapacityResponse = {
  availability?: Availability;
  capacity?: {
    capacity: number;
    date: string;
  };
  message?: string;
};

type ReservationSettingsResponse = {
  message?: string;
  settings?: ReservationSettingsView;
};

type BlockedEmailsResponse = {
  blockedEmail?: BlockedEmailView;
  blockedEmails?: BlockedEmailView[];
  message?: string;
};

type HomeGalleryResponse = {
  image?: HomeGalleryImageView;
  images?: HomeGalleryImageView[];
  message?: string;
};

type FormState = {
  date: string;
  name: string;
  people: string;
  phone: string;
  time: string;
};

type ReservationDateFilters = {
  endDate?: string;
  startDate?: string;
  user?: string;
};

const orderStates: OrderState[] = ["pendiente", "preparando", "entregado"];
const allOrderStateFilters: Record<OrderState, boolean> = {
  entregado: true,
  pendiente: true,
  preparando: true,
};
const MAX_DAILY_RESERVATION_CAPACITY = 500;

type AdminSection = "balance" | "home" | "menu" | "pedidos" | "reservas";

type MesaPedidosGroup = {
  activeCount: number;
  delivered: number;
  deliveredTotal: number;
  lastActivity: string;
  mesa: number;
  pedidos: PedidoView[];
  pending: number;
  preparing: number;
  total: number;
};

export function AdminDashboard({
  initialAvailability,
  initialBalance,
  initialBlockedEmails,
  initialHomeGallery,
  initialMenu,
  initialPedidos,
  initialReservations,
  initialReservationSettings,
  today,
}: AdminDashboardProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>("reservas");
  const [reservations, setReservations] = useState(initialReservations);
  const [pedidos, setPedidos] = useState(initialPedidos);
  const [balance, setBalance] = useState(initialBalance);
  const [blockedEmails, setBlockedEmails] = useState(initialBlockedEmails);
  const [blockedEmailSearch, setBlockedEmailSearch] = useState("");
  const [blockedEmailForm, setBlockedEmailForm] = useState({ email: "", reason: "" });
  const [homeGallery, setHomeGallery] = useState(initialHomeGallery);
  const [isHomeUploading, setIsHomeUploading] = useState(false);
  const [menu, setMenu] = useState(initialMenu);
  const [balanceStartDate, setBalanceStartDate] = useState(initialBalance.startDate);
  const [balanceEndDate, setBalanceEndDate] = useState(initialBalance.endDate);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isResettingBalance, setIsResettingBalance] = useState(false);
  const [availability, setAvailability] = useState(initialAvailability);
  const [capacityDraft, setCapacityDraft] = useState(String(initialAvailability.capacity));
  const [isSavingCapacity, setIsSavingCapacity] = useState(false);
  const [reservationSettings, setReservationSettings] = useState(initialReservationSettings);
  const [savingReservationDay, setSavingReservationDay] = useState<string | null>(null);
  const [reservationSettingsDate, setReservationSettingsDate] = useState(today);
  const initialReservationStartDate = getWeekStart(today);
  const [reservationStartDate, setReservationStartDate] = useState(initialReservationStartDate);
  const [reservationEndDate, setReservationEndDate] = useState(() => shiftDateString(initialReservationStartDate, 6));
  const [reservationUserFilter, setReservationUserFilter] = useState("");
  const [form, setForm] = useState<FormState>({
    date: getNextEnabledReservationDate(today, initialReservationSettings.enabledDateStrings) ?? today,
    name: "",
    people: "2",
    phone: "",
    time: "21:00",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [feedbackSection, setFeedbackSection] = useState<AdminSection>("reservas");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingReservationDate, setDeletingReservationDate] = useState<string | null>(null);
  const [deletingPedidoId, setDeletingPedidoId] = useState<string | null>(null);
  const [resettingMesa, setResettingMesa] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<PedidoView | null>(null);
  const knownPedidoIds = useRef(new Set(initialPedidos.map((pedido) => pedido.id)));
  const audioCooldownRef = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);

  const applyAvailability = useCallback((nextAvailability: Availability) => {
    setAvailability(nextAvailability);
    setCapacityDraft(String(nextAvailability.capacity));
  }, []);

  const occupancy = availability.capacity > 0 ? Math.round((availability.reserved / availability.capacity) * 100) : 0;
  const capacityAllowedDates = useMemo(
    () => reservationSettings.days.filter((day) => day.enabled && !day.isPast).map((day) => day.date),
    [reservationSettings.days],
  );
  const visibleError = feedbackSection === activeSection ? error : "";
  const visibleNotice = feedbackSection === activeSection ? notice : "";

  function selectAdminSection(section: AdminSection) {
    setActiveSection(section);
    setFeedbackSection(section);
    setError("");
    setNotice("");
  }

  const loadBalance = useCallback(
    async (filters: { endDate?: string; startDate?: string } = {}, silent = false) => {
      if (!silent) {
        setIsBalanceLoading(true);
      }

      try {
        const query = balanceQueryString(filters.startDate, filters.endDate);
        const response = await fetch(`/api/admin/balance${query}`, { cache: "no-store" });
        const data = (await response.json()) as AdminBalanceResponse;

        if (!response.ok) {
          throw new Error(data.message ?? "No pudimos cargar el balance.");
        }

        setBalance(data.balance);
        if (!silent) {
          setFeedbackSection("balance");
          setError("");
        }
      } catch (error) {
        if (!silent) {
          setFeedbackSection("balance");
          setError(error instanceof Error ? error.message : "No pudimos cargar el balance.");
        }
      } finally {
        if (!silent) {
          setIsBalanceLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const triggerNewOrderAlert = useCallback((pedido: PedidoView) => {
    setNewOrderAlert(pedido);

    if (soundEnabledRef.current) {
      playOrderBell(audioCooldownRef);
    }

    window.setTimeout(() => {
      setNewOrderAlert((current) => (current?.id === pedido.id ? null : current));
    }, 8500);
  }, []);

  const loadPedidos = useCallback(
    async (options: { notify?: boolean } = {}) => {
      try {
        const response = await fetch("/api/admin/pedidos", { cache: "no-store" });
        const data = (await response.json()) as AdminPedidosResponse;

        if (!response.ok) {
          throw new Error(data.message ?? "No pudimos cargar pedidos.");
        }

        const newPedidos = data.pedidos.filter((pedido) => !knownPedidoIds.current.has(pedido.id)).reverse();

        data.pedidos.forEach((pedido) => knownPedidoIds.current.add(pedido.id));
        setPedidos(data.pedidos);

        if (options.notify && newPedidos.length) {
          newPedidos.forEach((pedido, index) => {
            window.setTimeout(() => triggerNewOrderAlert(pedido), index * 1800);
          });
        }
      } catch (error) {
        setFeedbackSection("pedidos");
        setError(error instanceof Error ? error.message : "No pudimos cargar pedidos.");
      }
    },
    [triggerNewOrderAlert],
  );

  useEffect(() => {
    if (activeSection !== "pedidos") {
      return;
    }

    const initialLoad = window.setTimeout(() => {
      void loadPedidos();
    }, 0);
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadPedidos({ notify: true });
      }
    }, 12000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [activeSection, loadPedidos]);

  useEffect(() => {
    if (activeSection !== "pedidos") {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("rustic-admin-order-signals")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "OrderSignal",
        },
        () => {
          void loadPedidos({ notify: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeSection, loadPedidos]);

  useEffect(() => {
    if (activeSection !== "balance") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadBalance({ endDate: balanceEndDate, startDate: balanceStartDate });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeSection, balanceEndDate, balanceStartDate, loadBalance]);

  const loadAvailability = useCallback(async (date: string) => {
    const response = await fetch(`/api/admin/reservas?date=${date}`, { cache: "no-store" });
    const data = (await response.json()) as AdminReservationsResponse;

    if (response.ok && data.availability) {
      applyAvailability(data.availability);
    }
  }, [applyAvailability]);

  const loadReservationSettings = useCallback(async (silent = false, date = reservationSettingsDate) => {
    try {
      const response = await fetch(`/api/admin/reservas/settings?date=${date}`, { cache: "no-store" });
      const data = (await response.json()) as ReservationSettingsResponse;

      if (!response.ok || !data.settings) {
        throw new Error(data.message ?? "No pudimos cargar los dias habilitados.");
      }

      setReservationSettings(data.settings);
    } catch (error) {
      if (!silent) {
        setFeedbackSection("reservas");
        setError(error instanceof Error ? error.message : "No pudimos cargar los dias habilitados.");
      }
    }
  }, [reservationSettingsDate]);

  const loadReservations = useCallback(
    async (filters: ReservationDateFilters = {}) => {
      const startDate = filters.startDate ?? reservationStartDate;
      const endDate = filters.endDate ?? reservationEndDate;
      const user = filters.user ?? reservationUserFilter;

      setIsLoading(true);
      setFeedbackSection("reservas");
      setError("");

      try {
        const query = reservationQueryString(startDate, endDate, user);
        const response = await fetch(`/api/admin/reservas${query}`, { cache: "no-store" });
        const data = (await response.json()) as AdminReservationsResponse;

        if (!response.ok) {
          throw new Error(data.message ?? "No pudimos cargar reservas.");
        }

        setReservations(data.reservations);

        if (data.availability) {
          applyAvailability(data.availability);
        }
      } catch (error) {
        setFeedbackSection("reservas");
        setError(error instanceof Error ? error.message : "No pudimos cargar reservas.");
      } finally {
        setIsLoading(false);
      }
    },
    [applyAvailability, reservationEndDate, reservationStartDate, reservationUserFilter],
  );

  useEffect(() => {
    if (activeSection !== "reservas") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadReservations();
    }, 0);
    const settingsInterval = window.setInterval(() => {
      void loadReservationSettings(true);
      void loadAvailability(availability.date);
    }, 30000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(settingsInterval);
    };
  }, [activeSection, availability.date, loadAvailability, loadReservations, loadReservationSettings]);

  async function changePedidoState(pedido: PedidoView, estado: OrderState) {
    if (pedido.estado === estado) {
      return;
    }

    const confirmed = window.confirm(
      `Cambiar el pedido #${pedido.id.slice(0, 6)} de mesa ${pedido.mesa} a "${stateAdminLabel(estado)}"?`,
    );

    if (!confirmed) {
      return;
    }

    setFeedbackSection("pedidos");
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/pedidos/${pedido.id}`, {
        body: JSON.stringify({ estado }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = (await response.json()) as OrderMutationResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos actualizar el pedido.");
      }

      setPedidos((current) => current.map((item) => (item.id === pedido.id ? data.pedido : item)));
      setNotice(`Pedido de mesa ${pedido.mesa} actualizado a ${stateAdminLabel(estado)}.`);
    } catch (error) {
      setFeedbackSection("pedidos");
      setError(error instanceof Error ? error.message : "No pudimos actualizar el pedido.");
    }
  }

  async function resetMesaPedidos(mesa: number, orderCount: number) {
    const confirmed = window.confirm(
      `Reiniciar la mesa ${mesa}? Se eliminaran ${orderCount} pedido${orderCount === 1 ? "" : "s"} de esta mesa. Solo los pedidos entregados se sumaran al balance.`,
    );

    if (!confirmed) {
      return;
    }

    setFeedbackSection("pedidos");
    setError("");
    setNotice("");
    setResettingMesa(mesa);

    try {
      const response = await fetch(`/api/admin/pedidos?mesa=${mesa}`, { method: "DELETE" });
      const data = (await response.json()) as ResetMesaResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos reiniciar los pedidos de la mesa.");
      }

      const deletedCount = data.deletedCount ?? orderCount;
      const revenueAmount = data.revenueAmount ?? 0;
      const revenueOrderCount = data.revenueOrderCount ?? 0;

      setPedidos((current) => current.filter((pedido) => pedido.mesa !== mesa));
      setNotice(
        `Mesa ${mesa} reiniciada. ${deletedCount} pedido${deletedCount === 1 ? "" : "s"} eliminado${deletedCount === 1 ? "" : "s"} y ${formatMoney(revenueAmount)} sumado al balance desde ${revenueOrderCount} pedido${revenueOrderCount === 1 ? "" : "s"} entregado${revenueOrderCount === 1 ? "" : "s"}.`,
      );
      await loadBalance({ endDate: balanceEndDate, startDate: balanceStartDate }, true);
    } catch (error) {
      setFeedbackSection("pedidos");
      setError(error instanceof Error ? error.message : "No pudimos reiniciar los pedidos de la mesa.");
    } finally {
      setResettingMesa(null);
    }
  }

  async function deletePedidoManually(pedido: PedidoView) {
    const confirmed = window.confirm(
      `Eliminar manualmente el pedido #${pedido.id.slice(0, 6)} de mesa ${pedido.mesa}? Esta accion no suma al balance.`,
    );

    if (!confirmed) {
      return;
    }

    setFeedbackSection("pedidos");
    setError("");
    setNotice("");
    setDeletingPedidoId(pedido.id);

    try {
      const response = await fetch(`/api/admin/pedidos/${pedido.id}`, { method: "DELETE" });
      const data = (await response.json()) as OrderMutationResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos eliminar el pedido.");
      }

      setPedidos((current) => current.filter((item) => item.id !== pedido.id));
      setNotice(`Pedido de mesa ${pedido.mesa} eliminado manualmente.`);
    } catch (error) {
      setFeedbackSection("pedidos");
      setError(error instanceof Error ? error.message : "No pudimos eliminar el pedido.");
    } finally {
      setDeletingPedidoId(null);
    }
  }

  async function resetBalance() {
    const confirmation = window.prompt(
      'Esta accion borra todo el historial de balance de la base de datos. Escribi "Confirmar" para continuar.',
    );

    if (confirmation !== "Confirmar") {
      setFeedbackSection("balance");
      setError('No se reinicio el balance. Tenes que escribir exactamente "Confirmar".');
      return;
    }

    setFeedbackSection("balance");
    setError("");
    setNotice("");
    setIsResettingBalance(true);

    try {
      const response = await fetch("/api/admin/balance", {
        body: JSON.stringify({ confirmation }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
      const data = (await response.json()) as BalanceResetResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos reiniciar el balance.");
      }

      setBalance({
        days: [],
        endDate: balanceEndDate,
        startDate: balanceStartDate,
        total: 0,
      });
      setNotice(`Balance reiniciado. ${data.deletedCount ?? 0} registro${data.deletedCount === 1 ? "" : "s"} eliminado${data.deletedCount === 1 ? "" : "s"}.`);
    } catch (error) {
      setFeedbackSection("balance");
      setError(error instanceof Error ? error.message : "No pudimos reiniciar el balance.");
    } finally {
      setIsResettingBalance(false);
    }
  }

  function setReservationRange(startDate: string) {
    const endDate = shiftDateString(startDate, 6);

    setReservationStartDate(startDate);
    setReservationEndDate(endDate);
  }

  function setReservationToday() {
    setReservationStartDate(today);
    setReservationEndDate(today);
  }

  function handleReservationStartDateChange(startDate: string) {
    setReservationStartDate(startDate);

    if (startDate > reservationEndDate) {
      setReservationEndDate(startDate);
    }
  }

  function handleReservationEndDateChange(endDate: string) {
    setReservationEndDate(endDate);

    if (endDate < reservationStartDate) {
      setReservationStartDate(endDate);
    }
  }

  function handleFormDateChange(date: string) {
    setForm((current) => ({ ...current, date }));
    void loadAvailability(date);
  }

  async function saveDailyCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const capacity = Number(capacityDraft);

    setFeedbackSection("reservas");
    setError("");
    setNotice("");

    if (!Number.isInteger(capacity) || capacity < 0 || capacity > MAX_DAILY_RESERVATION_CAPACITY) {
      setError(`El cupo debe ser un numero entre 0 y ${MAX_DAILY_RESERVATION_CAPACITY}.`);
      return;
    }

    setIsSavingCapacity(true);

    try {
      const response = await fetch(`/api/admin/reservas?date=${availability.date}`, {
        body: JSON.stringify({
          capacity,
          date: availability.date,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = (await response.json()) as ReservationCapacityResponse;

      if (!response.ok || !data.availability) {
        throw new Error(data.message ?? "No pudimos actualizar el cupo del dia.");
      }

      applyAvailability(data.availability);
      setNotice(`Cupo actualizado a ${data.availability.capacity} lugares para ${formatShortDate(data.availability.date)}.`);
    } catch (error) {
      setFeedbackSection("reservas");
      setError(error instanceof Error ? error.message : "No pudimos actualizar el cupo del dia.");
    } finally {
      setIsSavingCapacity(false);
    }
  }

  async function setReservationDayEnabled(date: string, enabled: boolean) {
    const previousSettings = reservationSettings;
    const dayLabel = formatShortDate(date);
    const nextSettings = {
      ...reservationSettings,
      days: reservationSettings.days.map((day) => (day.date === date ? { ...day, enabled, selectable: enabled && !day.isPast && !day.isFull } : day)),
      enabledDateStrings: reservationSettings.days
        .map((day) => (day.date === date ? { ...day, enabled, selectable: enabled && !day.isPast && !day.isFull } : day))
        .filter((day) => day.selectable)
        .map((day) => day.date),
    };

    setFeedbackSection("reservas");
    setError("");
    setNotice("");
    setReservationSettings(nextSettings);
    setSavingReservationDay(date);

    try {
      const response = await fetch("/api/admin/reservas/settings", {
        body: JSON.stringify({ date, enabled }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = (await response.json()) as ReservationSettingsResponse;

      if (!response.ok || !data.settings) {
        throw new Error(data.message ?? "No pudimos actualizar ese dia.");
      }

      setReservationSettings(data.settings);
      let availabilityDateToLoad = availability.date;
      if (!isDateSelectable(form.date, data.settings.enabledDateStrings)) {
        const nextDate = getNextEnabledReservationDate(today, data.settings.enabledDateStrings);

        if (nextDate) {
          setForm((current) => ({ ...current, date: nextDate }));
          availabilityDateToLoad = nextDate;
        }
      }
      setNotice(`${dayLabel} ${enabled ? "habilitado" : "deshabilitado"} para reservas.`);
      await loadReservationSettings(true, date);
      await loadAvailability(availabilityDateToLoad);
    } catch (error) {
      setReservationSettings(previousSettings);
      setFeedbackSection("reservas");
      setError(error instanceof Error ? error.message : "No pudimos actualizar ese dia.");
    } finally {
      setSavingReservationDay(null);
    }
  }


  async function loadBlockedEmails(search = blockedEmailSearch) {
    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const response = await fetch(`/api/admin/reservas/blocked-emails${query}`, { cache: "no-store" });
      const data = (await response.json()) as BlockedEmailsResponse;

      if (!response.ok || !data.blockedEmails) {
        throw new Error(data.message ?? "No pudimos cargar emails bloqueados.");
      }

      setBlockedEmails(data.blockedEmails);
    } catch (error) {
      setFeedbackSection("reservas");
      setError(error instanceof Error ? error.message : "No pudimos cargar emails bloqueados.");
    }
  }

  async function addBlockedEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackSection("reservas");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/reservas/blocked-emails", {
        body: JSON.stringify(blockedEmailForm),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as BlockedEmailsResponse;

      if (!response.ok || !data.blockedEmail) {
        throw new Error(data.message ?? "No pudimos bloquear ese email.");
      }

      setBlockedEmails((current) => [data.blockedEmail as BlockedEmailView, ...current]);
      setBlockedEmailForm({ email: "", reason: "" });
      setNotice(`${data.blockedEmail.email} bloqueado para reservas.`);
    } catch (error) {
      setFeedbackSection("reservas");
      setError(error instanceof Error ? error.message : "No pudimos bloquear ese email.");
    }
  }

  async function removeBlockedEmail(blocked: BlockedEmailView) {
    if (!window.confirm(`Desbloquear ${blocked.email}?`)) {
      return;
    }

    setFeedbackSection("reservas");
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/reservas/blocked-emails?id=${blocked.id}`, { method: "DELETE" });
      const data = (await response.json()) as BlockedEmailsResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos desbloquear ese email.");
      }

      setBlockedEmails((current) => current.filter((item) => item.id !== blocked.id));
      setNotice(`${blocked.email} desbloqueado.`);
    } catch (error) {
      setFeedbackSection("reservas");
      setError(error instanceof Error ? error.message : "No pudimos desbloquear ese email.");
    }
  }

  async function uploadHomeGalleryImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    setFeedbackSection("home");
    setError("");
    setNotice("");
    setIsHomeUploading(true);

    try {
      const response = await fetch("/api/admin/home/gallery", { body: formData, method: "POST" });
      const data = (await response.json()) as HomeGalleryResponse;

      if (!response.ok || !data.image) {
        throw new Error(data.message ?? "No pudimos cargar la foto.");
      }

      setHomeGallery((current) => [...current, data.image as HomeGalleryImageView].slice(0, 10));
      formElement.reset();
      setNotice("Foto agregada a HOME.");
    } catch (error) {
      setFeedbackSection("home");
      setError(error instanceof Error ? error.message : "No pudimos cargar la foto.");
    } finally {
      setIsHomeUploading(false);
    }
  }

  async function replaceHomeGalleryImage(id: string, file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setFeedbackSection("home");
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/home/gallery?id=${id}`, { body: formData, method: "PATCH" });
      const data = (await response.json()) as HomeGalleryResponse;

      if (!response.ok || !data.image) {
        throw new Error(data.message ?? "No pudimos reemplazar la foto.");
      }

      setHomeGallery((current) => current.map((image) => (image.id === id ? data.image as HomeGalleryImageView : image)));
      setNotice("Foto reemplazada.");
    } catch (error) {
      setFeedbackSection("home");
      setError(error instanceof Error ? error.message : "No pudimos reemplazar la foto.");
    }
  }

  async function deleteHomeGalleryImage(id: string) {
    if (!window.confirm("Eliminar esta foto de HOME?")) return;
    setFeedbackSection("home");
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/home/gallery?id=${id}`, { method: "DELETE" });
      const data = (await response.json()) as HomeGalleryResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos eliminar la foto.");
      }

      setHomeGallery((current) => current.filter((image) => image.id !== id));
      setNotice("Foto eliminada de HOME.");
    } catch (error) {
      setFeedbackSection("home");
      setError(error instanceof Error ? error.message : "No pudimos eliminar la foto.");
    }
  }


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackSection("reservas");
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
          time: form.time,
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

      applyAvailability(data.availability);
      setNotice(editingId ? "Reserva actualizada." : "Reserva creada.");
      resetForm();
      await loadReservations();
    } catch (error) {
      setFeedbackSection("reservas");
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

    setFeedbackSection("reservas");
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/reservas/${reservation.id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string; reservation?: ReservationView };

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos eliminar la reserva.");
      }

      setNotice("Reserva eliminada.");
      if (data.reservation?.date === availability.date) {
        await loadAvailability(data.reservation.date);
      }
      await loadReservations();
    } catch (error) {
      setFeedbackSection("reservas");
      setError(error instanceof Error ? error.message : "No pudimos eliminar la reserva.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteDay(date: string, reservationCount: number) {
    const confirmation = window.prompt(
      `Esta accion elimina ${reservationCount} reserva${reservationCount === 1 ? "" : "s"} del dia ${formatShortDate(
        date,
      )}. Escribi "Confirmar" para continuar.`,
    );

    if (confirmation !== "Confirmar") {
      setFeedbackSection("reservas");
      setError('No se eliminaron reservas. Tenes que escribir exactamente "Confirmar".');
      return;
    }

    setFeedbackSection("reservas");
    setError("");
    setNotice("");
    setDeletingReservationDate(date);

    try {
      const response = await fetch(`/api/admin/reservas?date=${date}`, {
        body: JSON.stringify({ confirmation }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
      const data = (await response.json()) as DeleteReservationsDayResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos eliminar las reservas del dia.");
      }

      if (data.availability) {
        applyAvailability(data.availability);
      }

      const deletedCount = data.deletedCount ?? reservationCount;
      setNotice(
        `${deletedCount} reserva${deletedCount === 1 ? "" : "s"} eliminada${deletedCount === 1 ? "" : "s"} del ${formatShortDate(
          date,
        )}.`,
      );
      await loadReservations();
    } catch (error) {
      setFeedbackSection("reservas");
      setError(error instanceof Error ? error.message : "No pudimos eliminar las reservas del dia.");
    } finally {
      setDeletingReservationDate(null);
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
      time: reservation.time,
    });
    setNotice("");
    setFeedbackSection("reservas");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      date: getNextEnabledReservationDate(today, reservationSettings.enabledDateStrings) ?? today,
      name: "",
      people: "2",
      phone: "",
      time: "21:00",
    });
  }

  return (
    <div className="min-h-screen bg-[#070504] px-4 py-6 text-amber-50 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-amber-200/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-amber-300">Rustic Pub</p>
            <h1 className="mt-2 text-4xl font-black uppercase leading-none text-white sm:text-5xl">
              Panel admin
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
          <aside className="grid content-start gap-4 self-start">
            <nav className="grid content-start gap-2 rounded-3xl border border-amber-200/15 bg-black/35 p-3">
              <AdminNavButton
                active={activeSection === "reservas"}
                label="Reservas"
                onClick={() => selectAdminSection("reservas")}
              />
              <AdminNavButton
                active={activeSection === "home"}
                label="Home"
                onClick={() => selectAdminSection("home")}
              />
              <AdminNavButton
                active={activeSection === "pedidos"}
                label="Pedidos"
                onClick={() => selectAdminSection("pedidos")}
              />
              <AdminNavButton
                active={activeSection === "menu"}
                label="Menu"
                onClick={() => selectAdminSection("menu")}
              />
              <AdminNavButton
                active={activeSection === "balance"}
                label="Balance"
                onClick={() => selectAdminSection("balance")}
              />
            </nav>

            {activeSection === "reservas" ? (
              <>
                <article className="rounded-3xl border border-amber-200/15 bg-[#120c08] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-sm font-black uppercase text-amber-300">Ocupacion diaria</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                        availability.isReservationDayEnabled
                          ? "bg-emerald-400/15 text-emerald-100"
                          : "bg-white/10 text-amber-50/55"
                      }`}
                    >
                      {availability.isReservationDayEnabled ? "Disponible" : "No disponible"}
                    </span>
                  </div>
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
                  <p className="mt-3 text-sm capitalize text-amber-50/60">
                    {availability.dayLabel} {formatShortDate(availability.date)}
                  </p>
                </article>

                <form className="rounded-3xl border border-amber-200/15 bg-black/35 p-5" onSubmit={saveDailyCapacity}>
                  <p className="text-sm font-black uppercase text-amber-300">Cupo del dia</p>
                  <p className="mt-2 text-sm leading-6 text-amber-50/55">
                    Viernes, sabados y domingos abren con 40 lugares por defecto. Los demas dias quedan cerrados salvo que los habilites.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2 text-sm font-black text-amber-50/80">
                      Dia
                      <DatePicker
                        allowedDates={capacityAllowedDates}
                        disabledBefore={today}
                        label="Dia del cupo"
                        onChange={(date) => {
                          void loadAvailability(date);
                        }}
                        value={availability.date}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-black text-amber-50/80">
                      Lugares
                      <input
                        className="min-h-11 rounded-xl border border-amber-200/20 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-amber-300/70"
                        max={MAX_DAILY_RESERVATION_CAPACITY}
                        min="0"
                        onChange={(event) => setCapacityDraft(event.target.value)}
                        type="number"
                        value={capacityDraft}
                      />
                    </label>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black uppercase text-amber-50/65">
                    <span className="rounded-xl border border-amber-200/10 bg-white/[.04] px-3 py-2">
                      {availability.reserved} reservados
                    </span>
                    <span className="rounded-xl border border-emerald-200/15 bg-emerald-400/10 px-3 py-2 text-emerald-100">
                      {availability.available} libres
                    </span>
                  </div>
                  <button
                    className="mt-4 min-h-12 w-full rounded-xl bg-amber-300 px-4 font-black text-[#140b04] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingCapacity}
                    type="submit"
                  >
                    {isSavingCapacity ? "Guardando..." : "Guardar cupo"}
                  </button>
                </form>

                <ReservationEnabledDaysCard
                  onDateChange={(date) => {
                    setReservationSettingsDate(date);
                    void loadReservationSettings(false, date);
                  }}
                  onToggle={setReservationDayEnabled}
                  savingDay={savingReservationDay}
                  selectedDate={reservationSettingsDate}
                  settings={reservationSettings}
                />

                <form className="rounded-3xl border border-amber-200/15 bg-black/35 p-5" onSubmit={handleSubmit}>
                  <p className="text-sm font-black uppercase text-amber-300">
                    {editingId ? "Editar reserva" : "Crear reserva"}
                  </p>
                  <div className="mt-4 grid gap-3">
                    <AdminInput label="Nombre" onChange={(name) => setForm((current) => ({ ...current, name }))} value={form.name} />
                    <AdminInput
                      label="Telefono (opcional)"
                      onChange={(phone) => setForm((current) => ({ ...current, phone }))}
                      required={false}
                      type="tel"
                      value={form.phone}
                    />
                    <AdminInput
                      allowedDates={reservationSettings.enabledDateStrings}
                      label="Fecha"
                      onChange={handleFormDateChange}
                      type="date"
                      value={form.date}
                    />
                    <AdminInput
                      label="Horario"
                      onChange={(time) => setForm((current) => ({ ...current, time }))}
                      type="time"
                      value={form.time}
                    />
                    <AdminInput
                      label="Personas"
                      max={String(MAX_DAILY_RESERVATION_CAPACITY)}
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
              </>
            ) : activeSection === "home" ? (
              <HomeSummary images={homeGallery} />
            ) : activeSection === "pedidos" ? (
              <OrdersSummary pedidos={pedidos} />
            ) : activeSection === "menu" ? (
              <MenuSummary menu={menu} />
            ) : (
              <BalanceSummary balance={balance} />
            )}
          </aside>

          {activeSection === "reservas" ? (
          <section className="rounded-3xl border border-amber-200/15 bg-black/35 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-amber-300">Reservas</p>
                <h2 className="mt-1 text-2xl font-black uppercase text-white">Vista por fechas</h2>
              </div>
              <div className="grid gap-2 sm:flex">
                <button
                  className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
                  onClick={() => setReservationRange(shiftDateString(reservationStartDate, -7))}
                  type="button"
                >
                  Semana anterior
                </button>
                <button
                  className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
                  onClick={setReservationToday}
                  type="button"
                >
                  Hoy
                </button>
                <button
                  className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
                  onClick={() => setReservationRange(shiftDateString(reservationStartDate, 7))}
                  type="button"
                >
                  Semana siguiente
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-3xl border border-amber-200/10 bg-[#0c0805] p-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label className="grid gap-2 text-sm font-black text-amber-50/80">
                  Desde
                  <DatePicker label="Desde" onChange={handleReservationStartDateChange} value={reservationStartDate} />
                </label>
                <label className="grid gap-2 text-sm font-black text-amber-50/80">
                  Hasta
                  <DatePicker label="Hasta" onChange={handleReservationEndDateChange} value={reservationEndDate} />
                </label>
                <label className="grid gap-2 text-sm font-black text-amber-50/80">
                  Usuario
                  <input
                    className="min-h-12 rounded-2xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                    onChange={(event) => setReservationUserFilter(event.target.value)}
                    placeholder="Nombre Google"
                    value={reservationUserFilter}
                  />
                </label>
              </div>
              <p className="rounded-full border border-amber-200/15 px-4 py-3 text-center text-xs font-black uppercase text-amber-100">
                {isLoading ? "Actualizando..." : `${reservations.length} reservas visibles`}
              </p>
            </div>

            {visibleNotice ? (
              <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-400/15 px-4 py-3 text-sm font-bold text-emerald-50">
                {visibleNotice}
              </p>
            ) : null}
            {visibleError ? (
              <p className="mt-4 rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
                {visibleError}
              </p>
            ) : null}

            <WeeklyReservationsBoard
              deletingDate={deletingReservationDate}
              endDate={reservationEndDate}
              onDeleteDay={handleDeleteDay}
              onDelete={handleDelete}
              onEdit={startEditing}
              reservations={reservations}
              startDate={reservationStartDate}
            />
            <BlockedEmailsPanel
              blockedEmails={blockedEmails}
              form={blockedEmailForm}
              onFormChange={setBlockedEmailForm}
              onReload={loadBlockedEmails}
              onRemove={removeBlockedEmail}
              onSearchChange={setBlockedEmailSearch}
              onSubmit={addBlockedEmail}
              search={blockedEmailSearch}
            />
          </section>
          ) : activeSection === "home" ? (
            <HomeAdminPanel
              error={visibleError}
              images={homeGallery}
              isUploading={isHomeUploading}
              notice={visibleNotice}
              onDelete={deleteHomeGalleryImage}
              onReplace={replaceHomeGalleryImage}
              onUpload={uploadHomeGalleryImage}
            />
          ) : activeSection === "pedidos" ? (
            <>
              {newOrderAlert ? <NewOrderScreenFlash key={newOrderAlert.id} pedido={newOrderAlert} /> : null}
            <OrdersBoard
                deletingPedidoId={deletingPedidoId}
                error={visibleError}
                newOrderAlert={newOrderAlert}
                notice={visibleNotice}
                onChangeState={changePedidoState}
                onDeletePedido={deletePedidoManually}
                onResetMesa={resetMesaPedidos}
                onSoundToggle={() => setSoundEnabled((current) => !current)}
                pedidos={pedidos}
                resettingMesa={resettingMesa}
                soundEnabled={soundEnabled}
              />
            </>
          ) : activeSection === "menu" ? (
            <MenuAdminPanel initialMenu={menu} onMenuChange={setMenu} />
          ) : (
            <BalanceBoard
              balance={balance}
              endDate={balanceEndDate}
              error={visibleError}
              isLoading={isBalanceLoading}
              isResettingBalance={isResettingBalance}
              notice={visibleNotice}
              onEndDateChange={setBalanceEndDate}
              onResetBalance={resetBalance}
              onStartDateChange={setBalanceStartDate}
              startDate={balanceStartDate}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function AdminInput({
  allowedDates,
  label,
  max,
  min,
  onChange,
  required = true,
  type = "text",
  value,
}: {
  allowedDates?: string[];
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  if (type === "date") {
    return (
      <label className="grid gap-2 text-sm font-black text-amber-50/80">
        {label}
        <DatePicker
          allowedDates={allowedDates}
          label={label}
          onChange={onChange}
          showAvailabilityLegend={Boolean(allowedDates)}
          value={value}
        />
      </label>
    );
  }

  return (
    <label className="grid gap-2 text-sm font-black text-amber-50/80">
      {label}
      <input
        className="min-h-11 rounded-xl border border-amber-200/20 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-amber-300/70"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function HomeAdminPanel({
  error,
  images,
  isUploading,
  notice,
  onDelete,
  onReplace,
  onUpload,
}: {
  error: string;
  images: HomeGalleryImageView[];
  isUploading: boolean;
  notice: string;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File | null) => void;
  onUpload: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const remaining = Math.max(10 - images.length, 0);

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-black/35 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-amber-300">Home</p>
          <h2 className="mt-1 text-2xl font-black uppercase text-white">Galería principal</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/60">
            Estas fotos alimentan la pasarela de la página de inicio. Máximo 10 imágenes optimizadas por Cloudinary.
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-200/15 px-4 py-2 text-xs font-black uppercase text-amber-100">
          {images.length}/10 fotos
        </span>
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

      <form className="mt-5 grid gap-3 rounded-3xl border border-amber-200/10 bg-[#0c0805] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={onUpload}>
        <label className="grid gap-2 text-sm font-black text-amber-50/80">
          Imagen
          <input
            accept="image/avif,image/jpeg,image/png,image/webp"
            className="min-h-12 rounded-2xl border border-amber-200/20 bg-white/10 px-4 py-3 text-sm text-amber-50 file:mr-3 file:rounded-xl file:border-0 file:bg-amber-300 file:px-3 file:py-2 file:text-sm file:font-black file:text-[#140b04]"
            disabled={images.length >= 10 || isUploading}
            name="file"
            required
            type="file"
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-amber-50/80">
          Texto alternativo
          <input
            className="min-h-12 rounded-2xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70"
            maxLength={120}
            name="alt"
            placeholder="Barra, mesas, tragos..."
          />
        </label>
        <button
          className="min-h-12 rounded-2xl bg-amber-300 px-5 text-sm font-black uppercase text-[#140b04] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={images.length >= 10 || isUploading}
          type="submit"
        >
          {isUploading ? "Subiendo..." : remaining > 0 ? "Agregar foto" : "Límite completo"}
        </button>
      </form>

      {images.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <article className="overflow-hidden rounded-3xl border border-amber-200/12 bg-[#120c08] shadow-xl shadow-black/20" key={image.id}>
              <div className="relative aspect-[4/3] bg-white/[.04]">
                <Image
                  alt={image.alt ?? "Foto de Rustic Pub"}
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  src={image.imageUrl}
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-black text-white backdrop-blur">
                  #{index + 1}
                </span>
              </div>
              <div className="grid gap-3 p-4">
                <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-amber-50/70">
                  {image.alt || "Sin texto alternativo"}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-amber-200/20 px-3 text-center text-sm font-black text-amber-100 transition hover:bg-amber-200/10">
                    Reemplazar
                    <input
                      accept="image/avif,image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        onReplace(image.id, event.currentTarget.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  <button
                    className="min-h-11 rounded-xl border border-red-300/20 px-3 text-sm font-black text-red-50 transition hover:bg-red-400/10"
                    onClick={() => onDelete(image.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-amber-200/20 bg-white/[.03] p-8 text-center">
          <p className="text-lg font-black text-white">Todavía no hay fotos para la home.</p>
          <p className="mt-2 text-sm leading-6 text-amber-50/55">Cargá la primera imagen para activar la pasarela visual del inicio.</p>
        </div>
      )}
    </section>
  );
}

function BlockedEmailsPanel({
  blockedEmails,
  form,
  onFormChange,
  onReload,
  onRemove,
  onSearchChange,
  onSubmit,
  search,
}: {
  blockedEmails: BlockedEmailView[];
  form: { email: string; reason: string };
  onFormChange: (form: { email: string; reason: string }) => void;
  onReload: (search?: string) => void;
  onRemove: (blocked: BlockedEmailView) => void;
  onSearchChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  search: string;
}) {
  return (
    <section className="mt-5 rounded-3xl border border-amber-200/15 bg-[#120c08] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-amber-300">Usuarios bloqueados</p>
          <h3 className="mt-1 text-2xl font-black uppercase text-white">Emails sin permiso de reserva</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/58">
            Si un email figura acá, no puede iniciar el flujo de reserva ni confirmar una reserva desde Google.
          </p>
        </div>
        <form
          className="grid gap-2 sm:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onReload(search);
          }}
        >
          <input
            className="min-h-11 rounded-xl border border-amber-200/20 bg-white/10 px-4 text-sm text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar email"
            type="search"
            value={search}
          />
          <button className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-200/10" type="submit">
            Buscar
          </button>
        </form>
      </div>

      <form className="mt-5 grid gap-3 rounded-3xl border border-amber-200/10 bg-black/35 p-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-end" onSubmit={onSubmit}>
        <label className="grid gap-2 text-sm font-black text-amber-50/80">
          Email Google
          <input
            autoComplete="off"
            className="min-h-12 rounded-2xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70"
            inputMode="email"
            onChange={(event) => onFormChange({ ...form, email: event.target.value })}
            placeholder="usuario@gmail.com"
            required
            type="email"
            value={form.email}
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-amber-50/80">
          Motivo
          <input
            className="min-h-12 rounded-2xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70"
            maxLength={240}
            onChange={(event) => onFormChange({ ...form, reason: event.target.value })}
            placeholder="Reservas falsas, incumplimiento..."
            value={form.reason}
          />
        </label>
        <button className="min-h-12 rounded-2xl bg-amber-300 px-5 text-sm font-black uppercase text-[#140b04] transition hover:bg-amber-200" type="submit">
          Bloquear
        </button>
      </form>

      {blockedEmails.length ? (
        <div className="mt-5 grid gap-3">
          {blockedEmails.map((blocked) => (
            <article className="grid gap-3 rounded-2xl border border-amber-200/10 bg-white/[.04] p-4 lg:grid-cols-[1fr_auto] lg:items-center" key={blocked.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="break-all text-base font-black text-white">{blocked.email}</strong>
                  <span className="rounded-full bg-red-400/15 px-3 py-1 text-xs font-black uppercase text-red-100">Bloqueado</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-50/58">
                  {blocked.reason || "Sin motivo cargado"} · {formatShortDate(blocked.createdAt.slice(0, 10))}
                </p>
                {blocked.blockedBy ? <p className="text-xs font-bold text-amber-50/40">Bloqueado por {blocked.blockedBy}</p> : null}
              </div>
              <button
                className="min-h-11 rounded-xl border border-emerald-300/20 px-4 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/10"
                onClick={() => onRemove(blocked)}
                type="button"
              >
                Desbloquear
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-amber-200/20 bg-white/[.03] p-6 text-center">
          <p className="font-black text-white">No hay emails bloqueados.</p>
          <p className="mt-2 text-sm text-amber-50/55">Los usuarios habilitados pueden reservar normalmente.</p>
        </div>
      )}
    </section>
  );
}

function ReservationEnabledDaysCard({
  onDateChange,
  onToggle,
  savingDay,
  selectedDate,
  settings,
}: {
  onDateChange: (date: string) => void;
  onToggle: (date: string, enabled: boolean) => void;
  savingDay: string | null;
  selectedDate: string;
  settings: ReservationSettingsView;
}) {
  const selectedDay = settings.days.find((day) => day.date === selectedDate);
  const enabledCount = settings.days.filter((day) => day.enabled).length;

  return (
    <article className="rounded-3xl border border-amber-200/15 bg-[#120c08] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-amber-300">Días habilitados</p>
          <h3 className="mt-1 text-lg font-black text-white">Calendario admin</h3>
        </div>
        <span className="rounded-full border border-emerald-200/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase text-emerald-100">
          {enabledCount}/7
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-amber-50/55">
        Seleccioná un día específico y habilitalo o bloquealo. Los días pasados no se pueden editar.
      </p>
      <div className="mt-4 grid gap-3">
        <DatePicker disabledBefore={getTodayDateStringForClient()} label="Día" onChange={onDateChange} value={selectedDate} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {settings.days.map((day) => (
            <button
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                day.date === selectedDate
                  ? "border-amber-300 bg-amber-300 text-[#140b04]"
                  : day.enabled
                    ? "border-emerald-200/25 bg-emerald-400/10 text-emerald-50"
                    : "border-amber-200/10 bg-white/[.04] text-amber-50/58"
              } ${day.isPast ? "cursor-not-allowed opacity-35" : "hover:bg-white/[.08]"}`}
              disabled={day.isPast}
              key={day.date}
              onClick={() => onDateChange(day.date)}
              type="button"
            >
              <span className="block text-xs font-black uppercase">{weekdayLabel(day.date)}</span>
              <span className="mt-1 block text-lg font-black">{new Date(`${day.date}T00:00:00.000Z`).getUTCDate()}</span>
              <span className="mt-1 block text-[10px] font-black uppercase opacity-70">
                {day.isPast ? "Pasado" : day.enabled ? "Disponible" : "No disponible"}
              </span>
            </button>
          ))}
        </div>
        <button
          className={`min-h-12 rounded-2xl px-4 text-sm font-black uppercase transition ${
            selectedDay?.enabled ? "bg-red-400/15 text-red-50 hover:bg-red-400/20" : "bg-emerald-300 text-emerald-950 hover:bg-emerald-200"
          } disabled:cursor-not-allowed disabled:opacity-55`}
          disabled={!selectedDay || selectedDay.isPast || savingDay === selectedDate}
          onClick={() => selectedDay && onToggle(selectedDate, !selectedDay.enabled)}
          type="button"
        >
          {savingDay === selectedDate ? "Guardando..." : selectedDay?.enabled ? "Deshabilitar día" : "Habilitar día"}
        </button>
      </div>
    </article>
  );
}


function AdminNavButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`min-h-12 rounded-2xl px-4 text-left font-black uppercase transition ${
        active ? "bg-amber-300 text-[#140b04]" : "border border-amber-200/12 text-amber-100 hover:bg-amber-200/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function OrdersSummary({ pedidos }: { pedidos: PedidoView[] }) {
  const pending = pedidos.filter((pedido) => pedido.estado === "pendiente").length;
  const preparing = pedidos.filter((pedido) => pedido.estado === "preparando").length;
  const delivered = pedidos.filter((pedido) => pedido.estado === "entregado").length;
  const mesaGroups = groupPedidosByMesa(pedidos);
  const activeMesas = mesaGroups.filter((group) => group.activeCount > 0).length;
  const activePedidos = pending + preparing;

  return (
    <article className="overflow-hidden rounded-3xl border border-amber-200/15 bg-[#120c08] shadow-xl shadow-black/20">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0))] p-5">
        <p className="text-sm font-black uppercase text-amber-300">Pedidos en vivo</p>
        <strong className="mt-4 block text-5xl font-black leading-none text-white">{activePedidos}</strong>
        <p className="mt-2 text-sm font-bold text-amber-50/60">
          {activeMesas} mesa{activeMesas === 1 ? "" : "s"} activa{activeMesas === 1 ? "" : "s"}
        </p>
      </div>
      <div className="grid gap-2 p-5 text-sm font-bold">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-red-500/12 px-3 py-2 text-red-100">
          <span>Pendientes</span>
          <strong>{pending}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-amber-400/12 px-3 py-2 text-amber-100">
          <span>Preparando</span>
          <strong>{preparing}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-emerald-400/12 px-3 py-2 text-emerald-100">
          <span>Entregados</span>
          <strong>{delivered}</strong>
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-50/60">Se actualiza por eventos en vivo y con respaldo periodico.</p>
      </div>
    </article>
  );
}

function MenuSummary({ menu }: { menu: MenuAdminView }) {
  const activeItems = menu.items.filter((item) => item.active).length;
  const hiddenItems = menu.items.length - activeItems;

  return (
    <article className="overflow-hidden rounded-3xl border border-amber-200/15 bg-[#120c08] shadow-xl shadow-black/20">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0))] p-5">
        <p className="text-sm font-black uppercase text-amber-300">Menu dinamico</p>
        <strong className="mt-4 block text-5xl font-black leading-none text-white">{activeItems}</strong>
        <p className="mt-2 text-sm font-bold text-amber-50/60">productos publicados</p>
      </div>
      <div className="grid gap-2 p-5 text-sm font-bold">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-emerald-400/12 px-3 py-2 text-emerald-100">
          <span>Activos</span>
          <strong>{activeItems}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-red-400/12 px-3 py-2 text-red-100">
          <span>Ocultos</span>
          <strong>{hiddenItems}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-amber-400/12 px-3 py-2 text-amber-100">
          <span>Subcategorias</span>
          <strong>{menu.subcategories.length}</strong>
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-50/60">
          La carta se lee desde base de datos en cada vista publica.
        </p>
      </div>
    </article>
  );
}

function HomeSummary({ images }: { images: HomeGalleryImageView[] }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-amber-200/15 bg-[#120c08] shadow-xl shadow-black/20">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0))] p-5">
        <p className="text-sm font-black uppercase text-amber-300">Home</p>
        <strong className="mt-4 block text-5xl font-black leading-none text-white">{images.length}</strong>
        <p className="mt-2 text-sm font-bold text-amber-50/60">fotos publicadas</p>
      </div>
      <div className="grid gap-2 p-5 text-sm font-bold">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-amber-400/12 px-3 py-2 text-amber-100">
          <span>Límite</span>
          <strong>{Math.max(10 - images.length, 0)} libres</strong>
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-50/60">
          La galería se muestra automáticamente en la página principal con imágenes optimizadas.
        </p>
      </div>
    </article>
  );
}

function BalanceSummary({ balance }: { balance: BalanceView }) {
  const closedTables = balance.days.reduce((total, day) => total + day.closedTables, 0);

  return (
    <article className="overflow-hidden rounded-3xl border border-amber-200/15 bg-[#120c08] shadow-xl shadow-black/20">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0))] p-5">
        <p className="text-sm font-black uppercase text-emerald-200">Balance</p>
        <strong className="mt-4 block break-words text-3xl font-black leading-tight text-white">
          {formatMoney(balance.total)}
        </strong>
        <p className="mt-2 text-sm font-bold text-amber-50/60">Historico visible</p>
      </div>
      <div className="grid gap-2 p-5 text-sm font-bold">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-emerald-400/12 px-3 py-2 text-emerald-100">
          <span>Mesas cerradas</span>
          <strong>{closedTables}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-amber-400/12 px-3 py-2 text-amber-100">
          <span>Dias visibles</span>
          <strong>{balance.days.length}</strong>
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-50/60">
          Se suma automaticamente al reiniciar cada mesa.
        </p>
      </div>
    </article>
  );
}

function BalanceBoard({
  balance,
  endDate,
  error,
  isLoading,
  isResettingBalance,
  notice,
  onEndDateChange,
  onResetBalance,
  onStartDateChange,
  startDate,
}: {
  balance: BalanceView;
  endDate: string;
  error: string;
  isLoading: boolean;
  isResettingBalance: boolean;
  notice: string;
  onEndDateChange: (date: string) => void;
  onResetBalance: () => void;
  onStartDateChange: (date: string) => void;
  startDate: string;
}) {
  const closedTables = balance.days.reduce((total, day) => total + day.closedTables, 0);
  const average = balance.days.length ? balance.total / balance.days.length : 0;
  const exportUrl = `/api/admin/balance/export${balanceQueryString(startDate, endDate)}`;

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-black/35 p-4 shadow-2xl shadow-black/25 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-emerald-200">Historico</p>
          <h2 className="mt-1 text-2xl font-black uppercase text-white">Balance del bar</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/60">
            Historial completo de ingresos acumulados al reiniciar mesas. El grafico solo muestra dias con ingresos.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <AdminMetric label="Ingresos" value={formatMoney(balance.total)} />
          <AdminMetric label="Promedio dia" value={formatMoney(average)} />
          <AdminMetric label="Mesas cerradas" value={closedTables} />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-400/15 px-4 py-3 text-sm font-bold text-emerald-50">
          {notice}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 rounded-3xl border border-amber-200/10 bg-[#0c0805] p-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-amber-50/80">
            Desde
            <DatePicker label="Desde" onChange={onStartDateChange} value={startDate} />
          </label>
          <label className="grid gap-2 text-sm font-black text-amber-50/80">
            Hasta
            <DatePicker label="Hasta" onChange={onEndDateChange} value={endDate} />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[auto_auto]">
          <a
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-300 px-4 text-xs font-black uppercase text-emerald-950 transition hover:bg-emerald-200"
            href={exportUrl}
          >
            Exportar Excel
          </a>
          <button
            className="min-h-12 rounded-2xl border border-red-200/25 px-4 text-xs font-black uppercase text-red-50 transition hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isResettingBalance}
            onClick={onResetBalance}
            type="button"
          >
            {isResettingBalance ? "Reiniciando..." : "Reiniciar balance"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[2rem] border border-amber-200/12 bg-[#120c08] p-4 shadow-xl shadow-black/20 sm:p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-emerald-200">Ingresos por dia</p>
            <h3 className="mt-1 text-xl font-black uppercase text-white">
              {formatDateLabel(balance.startDate)} al {formatDateLabel(balance.endDate)}
            </h3>
          </div>
          <p className="rounded-full border border-amber-200/15 px-4 py-2 text-xs font-black uppercase text-amber-100">
            {isLoading ? "Actualizando..." : "Balance diario"}
          </p>
        </div>

        {balance.days.length ? (
          <RevenueChart days={balance.days} />
        ) : (
          <p className="rounded-2xl border border-amber-200/10 bg-white/[.04] px-4 py-8 text-center text-amber-50/60">
            No hay ingresos registrados en el rango seleccionado.
          </p>
        )}
      </div>
    </section>
  );
}

function RevenueChart({ days }: { days: BalanceView["days"] }) {
  const chartWidth = 960;
  const chartHeight = 360;
  const paddingX = 38;
  const paddingBottom = 44;
  const paddingTop = 24;
  const maxTotal = Math.max(...days.map((day) => day.total), 1);
  const barGap = days.length > 14 ? 5 : 12;
  const barWidth = Math.max((chartWidth - paddingX * 2 - barGap * Math.max(days.length - 1, 0)) / days.length, 10);
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <div className="overflow-x-auto">
      <svg
        aria-label="Grafico de ingresos diarios"
        className="min-w-[760px]"
        role="img"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        <line
          stroke="rgba(251, 191, 36, .18)"
          strokeWidth="1"
          x1={paddingX}
          x2={chartWidth - paddingX}
          y1={chartHeight - paddingBottom}
          y2={chartHeight - paddingBottom}
        />
        {days.map((day, index) => {
          const barHeight = Math.max((day.total / maxTotal) * graphHeight, day.total > 0 ? 6 : 0);
          const x = paddingX + index * (barWidth + barGap);
          const y = chartHeight - paddingBottom - barHeight;

          return (
            <g key={day.date}>
              <rect
                fill="url(#revenueGradient)"
                height={barHeight}
                rx="9"
                width={barWidth}
                x={x}
                y={y}
              />
              <title>
                {formatDateLabel(day.date)}: {formatMoney(day.total)}
              </title>
              {day.total > 0 ? (
                <text
                  fill="#FEF3C7"
                  fontSize={days.length > 14 ? "10" : "12"}
                  fontWeight="900"
                  textAnchor="middle"
                  x={x + barWidth / 2}
                  y={Math.max(y - 8, 14)}
                >
                  {compactMoney(day.total)}
                </text>
              ) : null}
              <text
                fill="rgba(255, 251, 235, .55)"
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
                x={x + barWidth / 2}
                y={chartHeight - 16}
              >
                {chartDateLabel(day.date)}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="52%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function OrdersBoard({
  deletingPedidoId,
  error,
  newOrderAlert,
  notice,
  onChangeState,
  onDeletePedido,
  onResetMesa,
  onSoundToggle,
  pedidos,
  resettingMesa,
  soundEnabled,
}: {
  deletingPedidoId: string | null;
  error: string;
  newOrderAlert: PedidoView | null;
  notice: string;
  onChangeState: (pedido: PedidoView, estado: OrderState) => void;
  onDeletePedido: (pedido: PedidoView) => void;
  onResetMesa: (mesa: number, orderCount: number) => void;
  onSoundToggle: () => void;
  pedidos: PedidoView[];
  resettingMesa: number | null;
  soundEnabled: boolean;
}) {
  const [selectedMesa, setSelectedMesa] = useState("all");
  const [stateFilters, setStateFilters] = useState<Record<OrderState, boolean>>(allOrderStateFilters);
  const availableMesas = useMemo(() => getAvailableMesas(pedidos), [pedidos]);
  const initialKeywordByMesa = useMemo(() => getInitialKeywordByMesa(pedidos), [pedidos]);
  const orderCountByMesa = useMemo(() => getOrderCountByMesa(pedidos), [pedidos]);
  const effectiveSelectedMesa =
    selectedMesa === "all" || availableMesas.includes(Number(selectedMesa)) ? selectedMesa : "all";
  const mesaScopedPedidos = useMemo(
    () =>
      pedidos.filter(
        (pedido) => effectiveSelectedMesa === "all" || pedido.mesa === Number(effectiveSelectedMesa),
      ),
    [effectiveSelectedMesa, pedidos],
  );
  const totalByMesa = useMemo(() => getOrderTotalByMesa(mesaScopedPedidos), [mesaScopedPedidos]);
  const deliveredTotalByMesa = useMemo(() => getDeliveredOrderTotalByMesa(mesaScopedPedidos), [mesaScopedPedidos]);
  const filteredPedidos = useMemo(
    () =>
      mesaScopedPedidos.filter((pedido) => stateFilters[pedido.estado]),
    [mesaScopedPedidos, stateFilters],
  );
  const mesaGroups = groupPedidosByMesa(filteredPedidos).map((group) => ({
    ...group,
    deliveredTotal: deliveredTotalByMesa.get(group.mesa) ?? group.deliveredTotal,
    total: totalByMesa.get(group.mesa) ?? group.total,
  }));
  const activePedidos = filteredPedidos.filter((pedido) => pedido.estado !== "entregado").length;
  const suspiciousPedidos = mesaScopedPedidos.filter((pedido) =>
    isKeywordMismatch(pedido, initialKeywordByMesa.get(pedido.mesa)),
  ).length;
  const totalOrdersAmount = mesaScopedPedidos.reduce((total, pedido) => total + pedido.total, 0);
  const visibleStateCount = orderStates.filter((estado) => stateFilters[estado]).length;

  function toggleStateFilter(estado: OrderState) {
    setStateFilters((current) => ({
      ...current,
      [estado]: !current[estado],
    }));
  }

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-black/35 p-4 shadow-2xl shadow-black/25 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-amber-300">Barra</p>
          <h2 className="mt-1 text-2xl font-black uppercase text-white">Pedidos por mesa</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/60">
            Vista agrupada para cerrar mesas rapido: cambia estados con confirmacion y reinicia la mesa cuando se van.
          </p>
        </div>
        <div className="grid gap-2 sm:min-w-[520px] sm:grid-cols-[96px_96px_96px_minmax(210px,1fr)]">
          <AdminMetric label="Mesas" value={mesaGroups.length} />
          <AdminMetric label="Activos" value={activePedidos} />
          <AdminMetric label="Alertas" value={suspiciousPedidos} />
          <AdminMetric label="Total" value={formatMoney(totalOrdersAmount)} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-300/20 bg-amber-300/10 px-4 py-3">
        <div>
          <p className="text-sm font-black uppercase text-amber-200">Alertas de pedidos</p>
        </div>
        <button
          className={`min-h-11 rounded-2xl px-4 text-xs font-black uppercase transition ${
            soundEnabled ? "bg-emerald-300 text-emerald-950" : "border border-amber-200/20 text-amber-100"
          }`}
          onClick={onSoundToggle}
          type="button"
        >
          Sonido {soundEnabled ? "ON" : "OFF"}
        </button>
      </div>

      {newOrderAlert ? <NewOrderBanner pedido={newOrderAlert} /> : null}

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

      <div className="mt-5 grid gap-3 rounded-3xl border border-amber-200/10 bg-[#0c0805] p-4 lg:grid-cols-[minmax(180px,260px)_1fr_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-black text-amber-50/80">
          Mesa visible
          <select
            className="min-h-12 rounded-2xl border border-amber-200/20 bg-black px-4 text-sm font-black text-white outline-none transition focus:border-amber-300/70"
            onChange={(event) => setSelectedMesa(event.target.value)}
            value={effectiveSelectedMesa}
          >
            <option value="all">Todas las mesas</option>
            {availableMesas.map((mesa) => (
              <option key={mesa} value={mesa}>
                Mesa {mesa}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-sm font-black text-amber-50/80">Estados visibles</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {orderStates.map((estado) => (
              <button
                className={`min-h-11 rounded-2xl px-4 text-xs font-black uppercase transition ${
                  stateFilters[estado]
                    ? `${statePillClass(estado)} shadow-lg shadow-black/20`
                    : "border border-amber-200/15 text-amber-100 hover:bg-amber-200/10"
                }`}
                key={estado}
                onClick={() => toggleStateFilter(estado)}
                type="button"
              >
                {stateFilters[estado] ? "Ver " : "Oculto "}
                {stateAdminLabel(estado)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <button
            className="min-h-11 rounded-2xl border border-amber-200/20 px-4 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-200/10"
            onClick={() => setStateFilters(allOrderStateFilters)}
            type="button"
          >
            Ver todos
          </button>
          <p className="rounded-2xl bg-white/[.04] px-4 py-3 text-xs font-black uppercase text-amber-50/55">
            {filteredPedidos.length}/{mesaScopedPedidos.length} pedidos visibles
          </p>
        </div>
      </div>

      {mesaGroups.length ? (
        <div className="mt-5 grid gap-5 2xl:grid-cols-2">
          {mesaGroups.map((group) => (
            <MesaPedidosCard
              deletingPedidoId={deletingPedidoId}
              group={group}
              initialKeywordByMesa={initialKeywordByMesa}
              isResetting={resettingMesa === group.mesa}
              key={group.mesa}
              newOrderId={newOrderAlert?.id}
              onChangeState={onChangeState}
              onDeletePedido={onDeletePedido}
              onResetMesa={onResetMesa}
              resetOrderCount={orderCountByMesa.get(group.mesa) ?? group.pedidos.length}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-amber-200/10 bg-white/[.04] px-4 py-5 text-amber-50/60">
          {visibleStateCount === 0
            ? "Activa al menos un estado para visualizar pedidos."
            : "No hay pedidos para los filtros seleccionados."}
        </p>
      )}
    </section>
  );
}

function AdminMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-amber-200/10 bg-white/[.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-amber-200/70">{label}</p>
      <strong className="mt-1 block break-words text-base font-black leading-tight text-white sm:text-lg">
        {value}
      </strong>
    </div>
  );
}

function NewOrderScreenFlash({ pedido }: { pedido: PedidoView }) {
  return (
    <div
      aria-hidden="true"
      className="order-screen-flash pointer-events-none fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-[#FFD400] px-4 text-[#130b04]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.9),rgba(255,212,0,.9)_36%,rgba(255,193,7,1)_68%)]" />
      <div className="absolute inset-x-0 top-0 h-8 bg-[#130b04]" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-[#130b04]" />
      <div className="relative flex max-w-6xl flex-col items-center text-center">
        <div className="order-screen-flash__logo grid h-44 w-44 place-items-center rounded-full border-8 border-[#130b04] bg-[#130b04] p-5 shadow-[0_24px_80px_rgba(19,11,4,.38)] sm:h-60 sm:w-60">
          <Image
            alt=""
            className="h-full w-full object-contain"
            height={220}
            priority
            src="/logo-rustic.png"
            width={220}
          />
        </div>
        <p className="mt-8 text-3xl font-black uppercase tracking-normal sm:text-5xl">Nuevo pedido</p>
        <h2 className="mt-4 text-7xl font-black uppercase leading-none sm:text-9xl">Mesa {pedido.mesa}</h2>
        <p className="mt-5 rounded-full bg-[#130b04] px-6 py-3 text-2xl font-black uppercase text-[#FFD400] sm:text-4xl">
          {pedido.customerName}
        </p>
      </div>
    </div>
  );
}

function NewOrderBanner({ pedido }: { pedido: PedidoView }) {
  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-amber-200/30 bg-[linear-gradient(135deg,rgba(251,191,36,.26),rgba(239,68,68,.18)),#170d06] p-4 shadow-[0_0_60px_rgba(251,191,36,.18)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-amber-200">Nuevo pedido</p>
          <h3 className="mt-1 text-2xl font-black uppercase text-white">
            Mesa {pedido.mesa} - {pedido.customerName}
          </h3>
          <p className="mt-1 text-sm font-bold text-amber-50/65">
            {pedido.items.map((item) => `${item.cantidad}x ${item.nombre}`).join(" / ")}
          </p>
        </div>
        <strong className="rounded-2xl bg-amber-300 px-4 py-3 text-xl font-black text-amber-950">
          {formatMoney(pedido.total)}
        </strong>
      </div>
    </div>
  );
}

function MesaPedidosCard({
  deletingPedidoId,
  group,
  initialKeywordByMesa,
  isResetting,
  newOrderId,
  onChangeState,
  onDeletePedido,
  onResetMesa,
  resetOrderCount,
}: {
  deletingPedidoId: string | null;
  group: MesaPedidosGroup;
  initialKeywordByMesa: Map<number, string>;
  isResetting: boolean;
  newOrderId?: string;
  onChangeState: (pedido: PedidoView, estado: OrderState) => void;
  onDeletePedido: (pedido: PedidoView) => void;
  onResetMesa: (mesa: number, orderCount: number) => void;
  resetOrderCount: number;
}) {
  const isActive = group.activeCount > 0;
  const hasNewOrder = group.pedidos.some((pedido) => pedido.id === newOrderId);
  const initialKeyword = initialKeywordByMesa.get(group.mesa);
  const keywordMismatchCount = group.pedidos.filter((pedido) => isKeywordMismatch(pedido, initialKeyword)).length;

  return (
    <article
      className={`overflow-hidden rounded-[2rem] border shadow-xl shadow-black/20 transition ${
        isActive ? "border-amber-300/22 bg-[#130d08]" : "border-emerald-300/18 bg-emerald-950/10"
      } ${hasNewOrder ? "ring-4 ring-amber-300/35 shadow-[0_0_70px_rgba(251,191,36,.18)]" : ""}`}
    >
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.18),transparent_35%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0))] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-amber-300">Mesa</p>
            <div className="mt-1 flex items-end gap-3">
              <h3 className="text-5xl font-black leading-none text-white">{group.mesa}</h3>
              <span
                className={`mb-1 rounded-full px-3 py-1 text-xs font-black uppercase ${
                  isActive ? "bg-amber-300 text-amber-950" : "bg-emerald-300 text-emerald-950"
                }`}
              >
                {isActive ? `${group.activeCount} activo${group.activeCount === 1 ? "" : "s"}` : "lista para cerrar"}
              </span>
            </div>
            <p className="mt-3 text-sm font-bold text-amber-50/58">
              Ultimo movimiento {formatTime(group.lastActivity)}
            </p>
          </div>

          <button
            className="min-h-12 rounded-2xl border border-red-200/25 px-4 text-sm font-black uppercase text-red-50 transition hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isResetting}
            onClick={() => onResetMesa(group.mesa, resetOrderCount)}
            type="button"
          >
            {isResetting ? "Reiniciando..." : "Reiniciar mesa"}
          </button>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(110px,1fr))_minmax(190px,1.45fr)]">
          <MesaStat label="Pendientes" tone="red" value={group.pending} />
          <MesaStat label="Preparando" tone="amber" value={group.preparing} />
          <MesaStat label="Entregados" tone="emerald" value={group.delivered} />
          <MesaStat label="Al balance" tone="neutral" value={formatMoney(group.deliveredTotal)} wide />
        </div>
        {keywordMismatchCount ? (
          <p className="mt-4 rounded-2xl border border-red-200/25 bg-red-500/15 px-4 py-3 text-sm font-black text-red-50">
            Alerta: {keywordMismatchCount} pedido{keywordMismatchCount === 1 ? "" : "s"} con palabra distinta a{" "}
            {initialKeyword}.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 p-4">
        {group.pedidos.map((pedido) => (
          <OrderCard
            isDeleting={deletingPedidoId === pedido.id}
            isNew={pedido.id === newOrderId}
            key={pedido.id}
            onChangeState={onChangeState}
            onDelete={onDeletePedido}
            expectedKeyword={initialKeyword}
            pedido={pedido}
          />
        ))}
      </div>
    </article>
  );
}

function MesaStat({
  label,
  tone,
  value,
  wide = false,
}: {
  label: string;
  tone: "amber" | "emerald" | "neutral" | "red";
  value: number | string;
  wide?: boolean;
}) {
  const toneClass = {
    amber: "bg-amber-400/12 text-amber-100",
    emerald: "bg-emerald-400/12 text-emerald-100",
    neutral: "bg-white/[.06] text-white",
    red: "bg-red-500/12 text-red-100",
  }[tone];

  return (
    <div className={`rounded-2xl px-3 py-3 ${toneClass} ${wide ? "md:col-span-2 xl:col-span-1" : ""}`}>
      <p className="text-[10px] font-black uppercase opacity-70">{label}</p>
      <strong className="mt-1 block break-words text-base font-black leading-tight sm:text-lg">{value}</strong>
    </div>
  );
}

function OrderCard({
  expectedKeyword,
  isDeleting = false,
  isNew = false,
  onChangeState,
  onDelete,
  pedido,
}: {
  expectedKeyword?: string;
  isDeleting?: boolean;
  isNew?: boolean;
  onChangeState: (pedido: PedidoView, estado: OrderState) => void;
  onDelete: (pedido: PedidoView) => void;
  pedido: PedidoView;
}) {
  const hasKeywordMismatch = isKeywordMismatch(pedido, expectedKeyword);

  return (
    <article
      className={`rounded-3xl border p-4 shadow-lg shadow-black/15 transition ${
        stateCardClass(pedido.estado)
      } ${isNew ? "animate-pulse ring-4 ring-amber-300/40" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isNew ? (
              <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase text-amber-950">
                Nuevo pedido
              </span>
            ) : null}
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statePillClass(pedido.estado)}`}>
              {stateAdminLabel(pedido.estado)}
            </span>
            {hasKeywordMismatch ? (
              <span className="rounded-full bg-red-300 px-3 py-1 text-xs font-black uppercase text-red-950">
                Palabra distinta
              </span>
            ) : null}
            <span className="text-xs font-black uppercase text-amber-50/45">#{pedido.id.slice(0, 6)}</span>
          </div>
          <p className="mt-2 text-sm font-bold text-amber-50/60">
            Pedido {formatTime(pedido.createdAt)} - {pedido.customerName}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-black uppercase text-amber-50/45">Total</p>
          <strong className="mt-1 block text-xl font-black text-white">{formatMoney(pedido.total)}</strong>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {hasKeywordMismatch ? (
          <p className="rounded-2xl border border-red-200/25 bg-red-500/15 px-3 py-2 text-sm font-black text-red-50">
            Alerta de palabra clave: inicial {expectedKeyword}, recibida {pedido.customerName}.
          </p>
        ) : null}
        {pedido.items.map((item) => (
          <div className="flex justify-between gap-3 rounded-xl bg-black/22 px-3 py-2" key={item.id}>
            <span className="font-bold text-amber-50/86">
              {item.cantidad}x {item.nombre}
            </span>
            <span className="font-black text-amber-100">{formatMoney(item.precio * item.cantidad)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-3 gap-2">
          {orderStates.map((estado) => (
            <button
              className={`min-h-12 rounded-xl px-2 text-xs font-black uppercase transition ${
                pedido.estado === estado
                  ? "bg-white text-[#140b04]"
                  : "border border-white/15 text-white hover:bg-white/10"
              }`}
              disabled={isDeleting || pedido.estado === estado}
              key={estado}
              onClick={() => onChangeState(pedido, estado)}
              type="button"
            >
              {estado === "preparando" ? "Preparar" : stateAdminLabel(estado)}
            </button>
          ))}
        </div>
        <button
          className="min-h-12 rounded-xl border border-red-200/25 px-4 text-xs font-black uppercase text-red-50 transition hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDeleting}
          onClick={() => onDelete(pedido)}
          type="button"
        >
          {isDeleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </article>
  );
}

function WeeklyReservationsBoard({
  deletingDate,
  endDate,
  onDeleteDay,
  onDelete,
  onEdit,
  reservations,
  startDate,
}: {
  deletingDate: string | null;
  endDate: string;
  onDeleteDay: (date: string, reservationCount: number) => void;
  onDelete: (reservation: ReservationView) => void;
  onEdit: (reservation: ReservationView) => void;
  reservations: ReservationView[];
  startDate: string;
}) {
  const visibleDays = getDateRange(startDate, endDate);
  const reservationsByDate = new Map<string, ReservationView[]>();

  visibleDays.forEach((date) => reservationsByDate.set(date, []));
  reservations.forEach((reservation) => {
    if (reservationsByDate.has(reservation.date)) {
      reservationsByDate.get(reservation.date)?.push(reservation);
    }
  });

  reservationsByDate.forEach((dayReservations) => {
    dayReservations.sort((a, b) => a.time.localeCompare(b.time));
  });

  return (
    <div className="mt-5">
      <div className="rounded-3xl border border-amber-200/10 bg-[#0c0805] p-4">
        <p className="text-sm font-black uppercase text-amber-300">
          {formatShortDate(visibleDays[0])} - {formatShortDate(visibleDays[visibleDays.length - 1])}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visibleDays.map((date) => {
            const dayReservations = reservationsByDate.get(date) ?? [];
            const confirmedPeople = dayReservations
              .filter((reservation) => reservation.status === "confirmed")
              .reduce((total, reservation) => total + reservation.people, 0);

            return (
              <section
                className="min-w-0 rounded-3xl border border-amber-200/10 bg-white/[.035] p-3"
                key={date}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-amber-50/45">{weekdayLabel(date)}</p>
                    <h3 className="text-lg font-black text-white">{formatShortDate(date)}</h3>
                  </div>
                  <div className="grid justify-items-end gap-2">
                    <span className="rounded-full bg-amber-300/12 px-2 py-1 text-xs font-black text-amber-100">
                      {dayReservations.length} reserva{dayReservations.length === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-emerald-300/12 px-2 py-1 text-xs font-black text-emerald-100">
                      {confirmedPeople} pers. confirmadas
                    </span>
                    {dayReservations.length ? (
                      <button
                        className="rounded-full border border-red-200/20 px-3 py-1 text-[10px] font-black uppercase text-red-50 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={deletingDate === date}
                        onClick={() => onDeleteDay(date, dayReservations.length)}
                        type="button"
                      >
                        {deletingDate === date ? "Eliminando..." : "Eliminar dia"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2">
                  {dayReservations.length ? (
                    dayReservations.map((reservation) => (
                      <article
                        className="rounded-2xl border border-white/10 bg-black/25 p-3 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:border-amber-200/25"
                        key={reservation.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-black text-white">{reservation.name}</p>
                            <p className="mt-1 text-xs font-bold text-amber-50/58">
                              {reservation.phone || "Sin telefono"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${reservationStatusClass(
                              reservation.status,
                            )}`}
                          >
                            {reservationStatusLabel(reservation.status)}
                          </span>
                        </div>
                        <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl bg-white/[.04] px-2 py-2">
                          {reservation.user?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt=""
                              className="h-8 w-8 rounded-full border border-amber-200/20 object-cover"
                              src={reservation.user.image}
                            />
                          ) : (
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-amber-200/20 bg-amber-300 text-xs font-black text-[#140b04]">
                              {(reservation.user?.name ?? reservation.name).slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-white">
                              {reservation.user?.name ?? "Reserva manual"}
                            </p>
                            <p className="truncate text-[11px] font-bold text-amber-50/50">
                              {reservation.user?.email ?? reservation.userEmail ?? "Sin email Google"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black text-amber-50/70">
                          <span className="rounded-xl bg-white/[.05] px-2 py-2">{reservation.time}</span>
                          <span className="rounded-xl bg-white/[.05] px-2 py-2">
                            {reservation.people} pers.
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            className="min-h-9 rounded-xl border border-amber-200/20 px-2 text-xs font-black text-amber-100 transition hover:bg-amber-200/10"
                            onClick={() => onEdit(reservation)}
                            type="button"
                          >
                            Editar
                          </button>
                          <button
                            className="min-h-9 rounded-xl border border-red-200/20 px-2 text-xs font-black text-red-50 transition hover:bg-red-400/10"
                            onClick={() => onDelete(reservation)}
                            type="button"
                          >
                            Eliminar
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-amber-200/10 px-3 py-5 text-center text-sm text-amber-50/38">
                      Sin reservas
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function reservationStatusClass(status: ReservationView["status"]) {
  if (status === "pending") {
    return "bg-amber-300 text-amber-950";
  }

  if (status === "canceled") {
    return "bg-red-300 text-red-950";
  }

  return "bg-emerald-300 text-emerald-950";
}

function reservationStatusLabel(status: ReservationView["status"]) {
  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "canceled") {
    return "Cancelada";
  }

  return "Confirmada";
}

function groupPedidosByMesa(pedidos: PedidoView[]): MesaPedidosGroup[] {
  const groups = new Map<number, PedidoView[]>();

  pedidos.forEach((pedido) => {
    const current = groups.get(pedido.mesa) ?? [];
    groups.set(pedido.mesa, [...current, pedido]);
  });

  return Array.from(groups.entries())
    .map(([mesa, mesaPedidos]) => {
      const sortedPedidos = [...mesaPedidos].sort(comparePedidosForAdmin);
      const pending = sortedPedidos.filter((pedido) => pedido.estado === "pendiente").length;
      const preparing = sortedPedidos.filter((pedido) => pedido.estado === "preparando").length;
      const delivered = sortedPedidos.filter((pedido) => pedido.estado === "entregado").length;
      const deliveredTotal = sortedPedidos
        .filter((pedido) => pedido.estado === "entregado")
        .reduce((sum, pedido) => sum + pedido.total, 0);

      return {
        activeCount: pending + preparing,
        delivered,
        deliveredTotal,
        lastActivity: sortedPedidos[0]?.createdAt ?? new Date(0).toISOString(),
        mesa,
        pedidos: sortedPedidos,
        pending,
        preparing,
        total: sortedPedidos.reduce((sum, pedido) => sum + pedido.total, 0),
      };
    })
    .sort((a, b) => {
      const activeDifference = Number(b.activeCount > 0) - Number(a.activeCount > 0);

      if (activeDifference !== 0) {
        return activeDifference;
      }

      const pendingDifference = b.pending - a.pending;

      if (pendingDifference !== 0) {
        return pendingDifference;
      }

      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
}

function getAvailableMesas(pedidos: PedidoView[]) {
  return Array.from(new Set(pedidos.map((pedido) => pedido.mesa))).sort((a, b) => a - b);
}

function getInitialKeywordByMesa(pedidos: PedidoView[]) {
  const firstPedidoByMesa = new Map<number, PedidoView>();

  pedidos.forEach((pedido) => {
    const current = firstPedidoByMesa.get(pedido.mesa);

    if (!current || new Date(pedido.createdAt).getTime() < new Date(current.createdAt).getTime()) {
      firstPedidoByMesa.set(pedido.mesa, pedido);
    }
  });

  return new Map(Array.from(firstPedidoByMesa.entries()).map(([mesa, pedido]) => [mesa, pedido.customerName]));
}

function isKeywordMismatch(pedido: PedidoView, expectedKeyword?: string) {
  return Boolean(expectedKeyword && normalizeOrderKeyword(pedido.customerName) !== normalizeOrderKeyword(expectedKeyword));
}

function normalizeOrderKeyword(value: string) {
  return value.replace(/\s+/g, "").trim().toLocaleLowerCase("es-AR");
}

function getOrderCountByMesa(pedidos: PedidoView[]) {
  const counts = new Map<number, number>();

  pedidos.forEach((pedido) => {
    counts.set(pedido.mesa, (counts.get(pedido.mesa) ?? 0) + 1);
  });

  return counts;
}

function getOrderTotalByMesa(pedidos: PedidoView[]) {
  const totals = new Map<number, number>();

  pedidos.forEach((pedido) => {
    totals.set(pedido.mesa, (totals.get(pedido.mesa) ?? 0) + pedido.total);
  });

  return totals;
}

function getDeliveredOrderTotalByMesa(pedidos: PedidoView[]) {
  const totals = new Map<number, number>();

  pedidos.forEach((pedido) => {
    if (pedido.estado === "entregado") {
      totals.set(pedido.mesa, (totals.get(pedido.mesa) ?? 0) + pedido.total);
    }
  });

  return totals;
}

function comparePedidosForAdmin(a: PedidoView, b: PedidoView) {
  const stateDifference = orderStatePriority(a.estado) - orderStatePriority(b.estado);

  if (stateDifference !== 0) {
    return stateDifference;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function orderStatePriority(estado: OrderState) {
  if (estado === "pendiente") {
    return 0;
  }

  if (estado === "preparando") {
    return 1;
  }

  return 2;
}

function stateAdminLabel(estado: OrderState) {
  if (estado === "pendiente") {
    return "Pendiente";
  }

  if (estado === "preparando") {
    return "Preparando";
  }

  return "Entregado";
}

function stateCardClass(estado: OrderState) {
  if (estado === "pendiente") {
    return "border-red-300/22 bg-red-500/12";
  }

  if (estado === "preparando") {
    return "border-amber-300/24 bg-amber-400/12";
  }

  return "border-emerald-300/24 bg-emerald-400/12";
}

function statePillClass(estado: OrderState) {
  if (estado === "pendiente") {
    return "bg-red-400 text-red-950";
  }

  if (estado === "preparando") {
    return "bg-amber-300 text-amber-950";
  }

  return "bg-emerald-300 text-emerald-950";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function balanceQueryString(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();

  if (startDate) {
    params.set("startDate", startDate);
  }

  if (endDate) {
    params.set("endDate", endDate);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

function reservationQueryString(startDate?: string, endDate?: string, user?: string) {
  const params = new URLSearchParams();

  if (startDate) {
    params.set("startDate", startDate);
  }

  if (endDate) {
    params.set("endDate", endDate);
  }

  if (user?.trim()) {
    params.set("user", user.trim());
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function weekdayLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getWeekStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);

  return date.toISOString().slice(0, 10);
}

function shiftDateString(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let current = startDate <= endDate ? startDate : endDate;
  const last = startDate <= endDate ? endDate : startDate;

  while (current <= last && dates.length < 62) {
    dates.push(current);
    current = shiftDateString(current, 1);
  }

  return dates.length ? dates : [startDate];
}

function isDateSelectable(value: string, enabledDateStrings: string[]) {
  return enabledDateStrings.includes(value);
}

function getNextEnabledReservationDate(fromDate: string, enabledDateStrings: string[]) {
  if (!enabledDateStrings.length) {
    return null;
  }

  let current = fromDate;

  for (let index = 0; index < 370; index += 1) {
    if (isDateSelectable(current, enabledDateStrings)) {
      return current;
    }

    current = shiftDateString(current, 1);
  }

  return null;
}

function getTodayDateStringForClient() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function chartDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function playOrderBell(cooldownRef: { current: number }) {
  const now = Date.now();

  if (now - cooldownRef.current < 1200) {
    return;
  }

  cooldownRef.current = now;

  const AudioContextClass =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  void context.resume();

  const compressor = context.createDynamicsCompressor();
  const masterGain = context.createGain();
  const startedAt = context.currentTime;

  compressor.threshold.setValueAtTime(-6, startedAt);
  compressor.knee.setValueAtTime(0, startedAt);
  compressor.ratio.setValueAtTime(18, startedAt);
  compressor.attack.setValueAtTime(0.001, startedAt);
  compressor.release.setValueAtTime(0.06, startedAt);

  masterGain.gain.setValueAtTime(0.0001, startedAt);
  masterGain.gain.exponentialRampToValueAtTime(1, startedAt + 0.012);
  masterGain.gain.setValueAtTime(1, startedAt + 1.12);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 1.28);
  masterGain.connect(compressor);
  compressor.connect(context.destination);

  [0, 0.22, 0.44, 0.66].forEach((offset, pulseIndex) => {
    [880, 1174, 1760].forEach((frequency, toneIndex) => {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      const pulseStart = startedAt + offset;
      const pulseEnd = pulseStart + 0.2;

      oscillator.type = toneIndex === 0 ? "square" : "sawtooth";
      oscillator.frequency.setValueAtTime(frequency + pulseIndex * 22, pulseStart);
      voiceGain.gain.setValueAtTime(toneIndex === 0 ? 0.5 : 0.34, pulseStart);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, pulseEnd);
      oscillator.connect(voiceGain);
      voiceGain.connect(masterGain);
      oscillator.start(pulseStart);
      oscillator.stop(pulseEnd);
    });
  });

  window.setTimeout(() => {
    void context.close();
  }, 1500);
}
