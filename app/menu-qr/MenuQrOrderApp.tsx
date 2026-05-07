"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { OrderProduct } from "./order-products";
import { MenuImage } from "../components/MenuImage";
import { MENU_CATEGORY_OPTIONS, type MenuCategory } from "../../lib/menu-types";
import type { TableAccessView } from "../../lib/tables";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type OrderState = "pendiente" | "preparando" | "entregado";

type PedidoView = {
  id: string;
  mesa: number;
  estado: OrderState;
  total: number;
  completedAt: string | null;
  createdAt: string;
  items: {
    id: string;
    nombre: string;
    precio: number;
    cantidad: number;
  }[];
};

type PedidoResponse = {
  pedido?: PedidoView;
  message?: string;
};

type TableOrdersResponse = {
  pedidos?: PedidoView[];
  message?: string;
};

const keywordSuggestions = [
  "Fogon",
  "Barril",
  "Malta",
  "Brasa",
  "Lupulo",
  "Vaso",
  "Trago",
  "Barra",
  "Norte",
  "Patio",
  "Roble",
  "Cobre",
  "Ambar",
  "Cedro",
  "Pampa",
  "Ronda",
  "Mesa",
  "Noche",
  "Ritmo",
  "Salsa",
  "Picada",
  "Fuego",
  "Tango",
  "Ruta",
  "Arena",
  "Piedra",
  "Luna",
  "Sol",
  "Cima",
  "Valle",
  "Campo",
  "Hierro",
  "Madera",
  "Cactus",
  "Rayo",
  "Tribu",
  "Bosque",
  "Cerro",
  "Rio",
  "Brillo",
  "Sombra",
  "Chispa",
  "Humo",
  "Oeste",
  "Este",
  "Sur",
  "Corona",
  "Guinda",
  "Cereza",
  "Menta",
  "Limon",
  "Pomelo",
  "Mora",
  "Canela",
  "Vainilla",
  "Naranja",
  "Caramelo",
  "Cacao",
  "Cafe",
  "Crema",
  "Dorado",
  "Rojo",
  "Verde",
  "Azul",
  "Negro",
  "Blanco",
  "Fresco",
  "Claro",
  "Bravo",
  "Firme",
  "Listo",
  "Nuevo",
  "Libre",
  "Borde",
  "Centro",
  "Esquina",
  "Puerta",
  "Llave",
  "Chapa",
  "Farol",
  "Sillon",
  "Disco",
  "Vinilo",
  "Rock",
  "Jazz",
  "Fiesta",
  "Banda",
  "Tambor",
  "Guitarra",
  "Voz",
  "Eco",
  "Pulso",
  "Brinde",
  "Copa",
  "Jarra",
  "Lata",
  "Hielos",
  "Tapas",
  "Papas",
  "Pancho",
];

export function MenuQrOrderApp({ products, table }: { products: OrderProduct[]; table: TableAccessView | null }) {
  const mesa = table?.mesa ?? null;
  const tableToken = table?.token ?? "";
  const storageKey = mesa ? `rustic-cart-${tableToken}` : "rustic-cart-invalid";
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("comida");
  const [cart, setCart] = useState<CartItem[]>(() => readInitialCart(mesa, storageKey));
  const [customerName, setCustomerName] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [trackedOrders, setTrackedOrders] = useState<PedidoView[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [lastOrdersSync, setLastOrdersSync] = useState("");

  const categories = useMemo(
    () => MENU_CATEGORY_OPTIONS.filter((category) => products.some((product) => product.categorySlug === category.value)),
    [products],
  );
  const selectedCategory = categories.some((category) => category.value === activeCategory)
    ? activeCategory
    : categories[0]?.value ?? activeCategory;
  const filteredProducts = products.filter((product) => product.categorySlug === selectedCategory);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currentCustomerName = sanitizeCustomerName(customerName);
  const visibleOrders = useMemo(() => [...trackedOrders].sort(sortTrackedOrders), [trackedOrders]);

  const loadTableOrders = useCallback(
    async (silent = false) => {
      if (!mesa) {
        return;
      }

      if (!silent) {
        setIsLoadingOrders(true);
      }

      try {
        const response = await fetch(`/api/pedidos?tableToken=${encodeURIComponent(tableToken)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as TableOrdersResponse;

        if (!response.ok) {
          throw new Error(data.message ?? "No pudimos cargar el estado de tus pedidos.");
        }

        setTrackedOrders(data.pedidos ?? []);
        setOrdersError("");
        setLastOrdersSync(new Date().toISOString());
      } catch (error) {
        setOrdersError(error instanceof Error ? error.message : "No pudimos cargar el estado de tus pedidos.");
      } finally {
        if (!silent) {
          setIsLoadingOrders(false);
        }
      }
    },
    [mesa, tableToken],
  );

  useEffect(() => {
    if (!mesa) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, mesa, storageKey]);

  useEffect(() => {
    if (!mesa) {
      return;
    }

    const initialLoad = window.setTimeout(() => {
      void loadTableOrders();
    }, 0);
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadTableOrders(true);
      }
    }, 8000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadTableOrders, mesa]);

  const groupedCart = useMemo(() => cart, [cart]);

  if (!mesa) {
    return (
      <main className="min-h-screen bg-[#070504] px-4 py-10 text-amber-50">
        <section className="mx-auto grid min-h-[80svh] max-w-md place-items-center text-center">
          <div className="rounded-3xl border border-red-300/20 bg-red-500/10 p-6 shadow-2xl shadow-black/40">
            <p className="text-sm font-black uppercase text-red-200">Acceso denegado</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none text-white">QR no valido</h1>
            <p className="mt-4 leading-7 text-amber-50/70">
              Escanea el QR original de tu mesa. Por seguridad, los numeros de mesa ya no abren pedidos.
            </p>
          </div>
        </section>
      </main>
    );
  }

  function addProduct(product: OrderProduct) {
    setError("");
    setSuccess("");
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(id: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function rollKeywordSuggestion() {
    setError("");
    setSuccess("");
    setCustomerName((current) => {
      const availableKeywords = keywordSuggestions.filter((keyword) => keyword !== current);
      const keywordPool = availableKeywords.length ? availableKeywords : keywordSuggestions;

      return keywordPool[Math.floor(Math.random() * keywordPool.length)] ?? "";
    });
  }

  async function sendOrder() {
    if (!mesa || cart.length === 0 || isSubmitting) {
      setError("Agrega productos al carrito antes de enviar.");
      return;
    }

    const sanitizedCustomerName = sanitizeCustomerName(customerName);

    if (sanitizedCustomerName.length < 3) {
      setError("Antes de enviar, ingresa una sola palabra de al menos 3 caracteres.");
      return;
    }

    const confirmed = window.confirm(
      `Enviar este pedido para la mesa ${mesa}?\nIdentificacion: ${sanitizedCustomerName}\n\n${cart
        .map((item) => `${item.quantity}x ${item.name}`)
        .join("\n")}\n\nTotal: ${formatPrice(total)}`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pedidos", {
        body: JSON.stringify({
          items: cart.map((item) => ({
            cantidad: item.quantity,
            nombre: item.name,
            precio: item.price,
          })),
          customerName: sanitizedCustomerName,
          tableToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as PedidoResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "No pudimos enviar el pedido.");
      }

      setCart([]);
      setCustomerName("");
      window.localStorage.removeItem(storageKey);
      setIsCartOpen(false);
      const createdPedido = data.pedido;

      if (createdPedido) {
        setTrackedOrders((current) => mergePedido(createdPedido, current));
      }
      setSuccess("Pedido enviado a barra. Podes seguir agregando productos cuando quieras.");
      void loadTableOrders(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos enviar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070504] pb-28 text-amber-50">
      <header className="sticky top-0 z-30 border-b border-amber-200/10 bg-[#070504]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-amber-300">Rustic Pub</p>
            <h1 className="text-2xl font-black uppercase leading-none text-white">Mesa {mesa}</h1>
            <p className="mt-1 text-xs font-bold text-amber-50/55">Te vamos a pedir identificacion en cada pedido</p>
          </div>
          <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-100 sm:block">
            QR activo
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-4xl px-4 py-5 pr-8 sm:pr-4">
        <div className="rounded-3xl border border-amber-200/15 bg-[linear-gradient(135deg,rgba(216,197,170,.22),rgba(18,12,8,.96)_46%),#120c08] p-5 shadow-2xl shadow-black/30">
          <p className="text-sm font-black uppercase text-amber-300">Pedi desde tu mesa</p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-none text-white">Menu QR</h2>
          <p className="mt-3 max-w-full break-words leading-7 text-amber-50/70">
            Agrega productos, revisa el carrito y manda el pedido directo a barra.
          </p>
        </div>

        {success ? (
          <p className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/15 px-4 py-3 text-sm font-bold text-emerald-50">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-2xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
            {error}
          </p>
        ) : null}

        <OrderTrackingPanel
          error={ordersError}
          isLoading={isLoadingOrders}
          lastSync={lastOrdersSync}
          orders={visibleOrders}
        />

        <nav className="sticky top-[73px] z-20 -mx-4 mt-5 flex gap-2 overflow-x-auto border-y border-amber-200/10 bg-[#070504]/90 px-4 py-3 pr-8 backdrop-blur-xl sm:pr-4">
          {categories.map((category) => (
            <button
              className={`min-h-11 flex-none rounded-full px-5 text-sm font-black transition ${
                selectedCategory === category.value
                  ? "bg-amber-300 text-[#130b04]"
                  : "border border-amber-200/20 text-amber-100"
              }`}
              key={category.value}
              onClick={() => setActiveCategory(category.value)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </nav>

        <div className="mt-5 grid gap-4">
          {filteredProducts.length ? filteredProducts.map((product) => (
            <article
              className="grid max-w-full grid-cols-1 overflow-hidden rounded-2xl border border-amber-200/12 bg-[#120c08] shadow-xl shadow-black/20 sm:grid-cols-[116px_minmax(0,1fr)]"
              key={product.id}
            >
              <div className="relative h-40 bg-black sm:h-auto sm:min-h-32">
                <MenuImage alt={product.name} sizes="(max-width: 640px) 100vw, 116px" src={product.image} />
              </div>
              <div className="grid min-w-0 gap-3 p-4">
                <div>
                  <h3 className="text-lg font-black uppercase leading-tight text-white">{product.name}</h3>
                  <p className="mt-1 line-clamp-2 min-w-0 text-sm leading-5 text-amber-50/62">
                    {product.description}
                  </p>
                </div>
                <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                  <strong className="text-lg font-black text-amber-200">{formatPrice(product.price)}</strong>
                  <button
                    className="min-h-11 rounded-xl bg-amber-300 px-3 text-sm font-black text-[#130b04] transition hover:bg-amber-200 sm:w-auto"
                    onClick={() => addProduct(product)}
                    type="button"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </article>
          )) : (
            <p className="rounded-2xl border border-amber-200/10 bg-white/[.04] p-5 text-center text-sm font-bold text-amber-50/60">
              Todavia no hay productos activos en esta categoria.
            </p>
          )}
        </div>
      </section>

      <button
        className="fixed bottom-4 left-4 right-8 z-40 mx-auto flex min-h-16 max-w-md items-center justify-between rounded-2xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 text-[#130b04] shadow-[0_20px_70px_rgba(0,0,0,.55)] transition disabled:cursor-not-allowed disabled:opacity-55 sm:right-4"
        onClick={() => setIsCartOpen(true)}
        type="button"
      >
        <span className="font-black">Ver carrito</span>
        <span className="rounded-full bg-black/12 px-3 py-1 text-sm font-black">
          {itemCount} / {formatPrice(total)}
        </span>
      </button>

      {isCartOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button className="absolute inset-0 cursor-default" onClick={() => setIsCartOpen(false)} type="button" />
          <section className="absolute bottom-0 left-0 right-0 mx-auto max-h-[86svh] max-w-md overflow-y-auto rounded-t-3xl border border-amber-200/15 bg-[#0b0705] p-5 shadow-2xl shadow-black">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-amber-300">Mesa {mesa}</p>
                <h2 className="text-2xl font-black uppercase text-white">Tu pedido</h2>
              </div>
              <button
                className="rounded-full border border-amber-200/20 px-4 py-2 text-sm font-black text-amber-100"
                onClick={() => setIsCartOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {groupedCart.length ? (
                groupedCart.map((item) => (
                  <article className="rounded-2xl border border-amber-200/10 bg-white/[.04] p-4" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-white">{item.name}</h3>
                        <p className="mt-1 text-sm text-amber-50/62">{formatPrice(item.price)} c/u</p>
                      </div>
                      <strong className="text-amber-200">{formatPrice(item.price * item.quantity)}</strong>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-xl border border-amber-200/15">
                        <button
                          className="h-11 w-12 text-xl font-black text-amber-100"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          type="button"
                        >
                          -
                        </button>
                        <span className="min-w-10 text-center font-black text-white">{item.quantity}</span>
                        <button
                          className="h-11 w-12 text-xl font-black text-amber-100"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="rounded-xl border border-red-200/20 px-3 py-2 text-sm font-black text-red-50"
                        onClick={() => updateQuantity(item.id, 0)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-amber-200/10 bg-white/[.04] p-4 text-amber-50/62">
                  Todavia no agregaste productos.
                </p>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200/12 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.16),transparent_34%),rgba(255,255,255,.04)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-amber-300">Identificacion del pedido</p>
                  <h3 className="mt-1 text-lg font-black uppercase leading-tight text-white">
                    Usa una sola palabra
                  </h3>
                </div>
                <span className="flex-none rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase text-[#130b04]">
                  Obligatorio
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-50/62">
                Te lo pedimos cada vez que envies un pedido. Puede ser tu nombre, apodo o una palabra clave.
              </p>
              <label className="mt-4 block">
                <span className="sr-only">Palabra de identificacion</span>
                <input
                  className="min-h-12 w-full rounded-xl border border-amber-200/15 bg-black/35 px-4 text-sm font-bold text-white outline-none transition placeholder:text-amber-50/32 focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                  maxLength={24}
                  minLength={3}
                  onChange={(event) => {
                    setCustomerName(sanitizeCustomerNameDraft(event.target.value));
                    setError("");
                  }}
                  placeholder="Ej: Rodrigo, Fogon, Brinde"
                  value={customerName}
                />
              </label>
              {error ? (
                <p className="mt-3 rounded-xl border border-red-300/20 bg-red-500/15 px-3 py-2 text-sm font-bold text-red-50">
                  {error}
                </p>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-300/10"
                  onClick={rollKeywordSuggestion}
                  type="button"
                >
                  Tirar palabra clave al azar
                </button>
                <p className="text-xs font-bold leading-5 text-amber-50/50 sm:text-right">
                  {currentCustomerName
                    ? `Se enviara como: ${currentCustomerName}`
                    : "Tambien podes tirar una palabra del pool."}
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 mt-5 border-t border-amber-200/10 bg-[#0b0705] pt-4">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-50/70">Total</span>
                <strong className="text-2xl font-black text-white">{formatPrice(total)}</strong>
              </div>
              <button
                className="mt-4 min-h-14 w-full rounded-xl bg-amber-300 px-6 font-black text-[#130b04] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-55"
                disabled={cart.length === 0 || isSubmitting}
                onClick={sendOrder}
                type="button"
              >
                {isSubmitting ? "Enviando..." : "Enviar pedido"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function OrderTrackingPanel({
  error,
  isLoading,
  lastSync,
  orders,
}: {
  error: string;
  isLoading: boolean;
  lastSync: string;
  orders: PedidoView[];
}) {
  const activeCount = orders.filter((order) => order.estado !== "entregado").length;

  return (
    <section className="mt-4 rounded-3xl border border-amber-200/15 bg-black/30 p-4 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-amber-300">Estado de la mesa</p>
          <h2 className="mt-1 text-2xl font-black uppercase leading-none text-white">
            {activeCount ? `${activeCount} pedido${activeCount === 1 ? "" : "s"} en curso` : "Sin pedidos en curso"}
          </h2>
        </div>
        <p className="rounded-full border border-amber-200/15 px-3 py-2 text-xs font-black uppercase text-amber-100">
          {lastSync ? `Actualizado ${formatTime(lastSync)}` : isLoading ? "Conectando..." : "En vivo"}
        </p>
      </div>

      <p className="mt-3 text-sm leading-6 text-amber-50/62">
        Podes mandar otro pedido cuando quieras. Este panel se actualiza solo hasta que barra lo marque como completado.
      </p>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-50">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        {orders.length ? (
          orders.map((pedido) => <OrderStatusCard key={pedido.id} pedido={pedido} />)
        ) : (
          <p className="rounded-2xl border border-amber-200/10 bg-white/[.04] p-4 text-sm leading-6 text-amber-50/62">
            Cuando envies un pedido, vas a ver aca si esta pendiente, en preparacion o completado.
          </p>
        )}
      </div>
    </section>
  );
}

function OrderStatusCard({ pedido }: { pedido: PedidoView }) {
  const meta = orderStatusMeta(pedido.estado);

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white/[.04] ${meta.borderClass}`}>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${meta.pillClass}`}>
              {meta.label}
            </span>
            <span className="text-xs font-black uppercase text-amber-50/45">#{pedido.id.slice(0, 6)}</span>
          </div>
          <h3 className="mt-3 text-lg font-black uppercase leading-tight text-white">{meta.title}</h3>
          <p className="mt-1 text-sm leading-5 text-amber-50/62">{meta.description}</p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs font-black uppercase text-amber-50/45">Pedido {formatTime(pedido.createdAt)}</p>
          <strong className="mt-1 block text-xl font-black text-amber-100">{formatPrice(pedido.total)}</strong>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${meta.barClass}`} style={{ width: meta.progress }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-black uppercase text-amber-50/45">
          <span className={pedido.estado === "pendiente" ? "text-red-100" : "text-amber-50/45"}>Pendiente</span>
          <span className={pedido.estado === "preparando" ? "text-amber-100" : "text-amber-50/45"}>
            Preparando
          </span>
          <span className={pedido.estado === "entregado" ? "text-emerald-100" : "text-amber-50/45"}>
            Completado
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-amber-50/62">
          {pedido.items.map((item) => `${item.cantidad}x ${item.nombre}`).join(" / ")}
        </p>
      </div>
    </article>
  );
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mergePedido(pedido: PedidoView, current: PedidoView[]) {
  const withoutDuplicated = current.filter((item) => item.id !== pedido.id);

  return [pedido, ...withoutDuplicated];
}

function sortTrackedOrders(a: PedidoView, b: PedidoView) {
  const stateDifference = stateWeight(a.estado) - stateWeight(b.estado);

  if (stateDifference !== 0) {
    return stateDifference;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function stateWeight(estado: OrderState) {
  if (estado === "pendiente") {
    return 0;
  }

  if (estado === "preparando") {
    return 1;
  }

  if (estado === "entregado") {
    return 2;
  }

  return 0;
}

function orderStatusMeta(estado: OrderState) {
  if (estado === "pendiente") {
    return {
      barClass: "bg-red-300",
      borderClass: "border-red-300/25",
      description: "El pedido ya entro a barra y esta esperando que lo tomen.",
      label: "Pendiente",
      pillClass: "bg-red-300 text-red-950",
      progress: "33%",
      title: "Recibimos tu pedido",
    };
  }

  if (estado === "preparando") {
    return {
      barClass: "bg-amber-300",
      borderClass: "border-amber-300/25",
      description: "Barra o cocina ya lo esta preparando.",
      label: "Preparando",
      pillClass: "bg-amber-300 text-amber-950",
      progress: "66%",
      title: "Tu pedido esta en marcha",
    };
  }

  return {
    barClass: "bg-emerald-300",
    borderClass: "border-emerald-300/25",
    description: "El pedido fue marcado como entregado. Se va a ocultar automaticamente.",
    label: "Completado",
    pillClass: "bg-emerald-300 text-emerald-950",
    progress: "100%",
    title: "Pedido completado",
  };
}

function readInitialCart(mesa: number | null, storageKey: string): CartItem[] {
  if (!mesa || typeof window === "undefined") {
    return [];
  }

  try {
    const savedCart = window.localStorage.getItem(storageKey);

    return savedCart ? (JSON.parse(savedCart) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function sanitizeCustomerName(value: string) {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .slice(0, 24);
}

function sanitizeCustomerNameDraft(value: string) {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, "")
    .slice(0, 24);
}
