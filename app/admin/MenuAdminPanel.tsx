"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  type MenuAdminView,
  type MenuCategory,
  type MenuItemView,
  type MenuSubcategoryView,
} from "../../lib/menu-types";
import { MenuImage } from "../components/MenuImage";

type MenuAdminPanelProps = {
  initialMenu: MenuAdminView;
  onMenuChange?: (menu: MenuAdminView) => void;
};

type MenuApiResponse = {
  item?: MenuItemView;
  menu?: MenuAdminView;
  message?: string;
  subcategory?: MenuSubcategoryView;
};

type ImageUploadResponse = {
  image?: {
    imagePublicId: string;
    imageUrl: string;
  };
  message?: string;
};

type ProductFormState = {
  active: boolean;
  category: MenuCategory;
  description: string;
  imagePublicId: string;
  imageUrl: string;
  price: string;
  subcategoryId: string;
  title: string;
};

type SubcategoryFormState = {
  category: MenuCategory;
  id: string | null;
  name: string;
};

type ConfirmDialogState = {
  confirmLabel: string;
  message: string;
  onConfirm: () => Promise<void>;
  title: string;
};

const pageSize = 12;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxImageSize = 5 * 1024 * 1024;

export function MenuAdminPanel({ initialMenu, onMenuChange }: MenuAdminPanelProps) {
  const [menu, setMenu] = useState(initialMenu);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MenuCategory | "todas">("todas");
  const [page, setPage] = useState(1);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(
    !initialMenu.items.length && !initialMenu.subcategories.length,
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormState>({
    category: "comida",
    id: null,
    name: "",
  });
  const [subcategoryCategoryFilter, setSubcategoryCategoryFilter] = useState<MenuCategory | "todas">("todas");
  const [isSavingSubcategory, setIsSavingSubcategory] = useState(false);
  const [isDeletingSubcategory, setIsDeletingSubcategory] = useState<string | null>(null);
  const [isSubcategoryManagerOpen, setIsSubcategoryManagerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filteredItems = useMemo(() => {
    const query = normalizeText(search);

    return menu.items.filter((item) => {
      const matchesCategory = categoryFilter === "todas" || item.category === categoryFilter;
      const matchesSearch =
        !query ||
        normalizeText(`${item.title} ${item.description} ${item.subcategoryName ?? ""}`).includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, menu.items, search]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeItems = menu.items.filter((item) => item.active).length;
  const productSubcategories = menu.subcategories.filter(
    (subcategory) => subcategory.category === productForm.category,
  );
  const filteredSubcategories =
    subcategoryCategoryFilter === "todas"
      ? menu.subcategories
      : menu.subcategories.filter((subcategory) => subcategory.category === subcategoryCategoryFilter);

  useEffect(() => {
    if (!notice && !error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4600);

    return () => window.clearTimeout(timeout);
  }, [error, notice]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  async function refreshMenu(silent = false) {
    if (!silent) {
      setIsRefreshing(true);
      setError("");
    }

    try {
      const response = await fetch("/api/admin/menu", { cache: "no-store" });
      const data = (await response.json()) as MenuApiResponse;

      if (!response.ok || !data.menu) {
        throw new Error(data.message ?? "No pudimos actualizar el menu.");
      }

      commitMenu(data.menu);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos actualizar el menu.");
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  }

  function commitMenu(nextMenu: MenuAdminView) {
    setMenu(nextMenu);
    onMenuChange?.(nextMenu);
  }

  useEffect(() => {
    if (initialMenu.items.length || initialMenu.subcategories.length) {
      return;
    }

    let cancelled = false;

    async function loadInitialMenu() {
      try {
        const response = await fetch("/api/admin/menu", { cache: "no-store" });
        const data = (await response.json()) as MenuApiResponse;

        if (!response.ok || !data.menu) {
          throw new Error(data.message ?? "No pudimos cargar el menu.");
        }

        if (!cancelled) {
          setMenu(data.menu);
          onMenuChange?.(data.menu);
        }
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "No pudimos cargar el menu.");
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void loadInitialMenu();

    return () => {
      cancelled = true;
    };
  }, [initialMenu.items.length, initialMenu.subcategories.length, onMenuChange]);

  function openNewProduct() {
    const defaultCategory = categoryFilter === "todas" ? "comida" : categoryFilter;

    setProductForm(emptyProductForm(defaultCategory));
    setEditingProductId(null);
    setImagePreviewUrl(null);
    setError("");
    setNotice("");
    setIsProductModalOpen(true);
  }

  function openEditProduct(item: MenuItemView) {
    setProductForm({
      active: item.active,
      category: item.category,
      description: item.description,
      imagePublicId: item.imagePublicId ?? "",
      imageUrl: item.imageUrl ?? "",
      price: String(item.priceCents),
      subcategoryId: item.subcategoryId ?? "",
      title: item.title,
    });
    setEditingProductId(item.id);
    setImagePreviewUrl(item.imageUrl);
    setError("");
    setNotice("");
    setIsProductModalOpen(true);
  }

  function closeProductModal() {
    setIsProductModalOpen(false);
    setEditingProductId(null);
    setProductForm(emptyProductForm());
    setImagePreviewUrl(null);
    setIsUploadingImage(false);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProduct(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        editingProductId ? `/api/admin/menu/${editingProductId}` : "/api/admin/menu",
        {
          body: JSON.stringify({
            active: productForm.active,
            category: productForm.category,
            description: productForm.description,
            imagePublicId: productForm.imagePublicId || null,
            imageUrl: productForm.imageUrl || null,
            price: productForm.price,
            subcategoryId: productForm.subcategoryId || null,
            title: productForm.title,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: editingProductId ? "PATCH" : "POST",
        },
      );
      const data = (await response.json()) as MenuApiResponse;

      if (!response.ok || !data.menu) {
        throw new Error(data.message ?? "No pudimos guardar el producto.");
      }

      commitMenu(data.menu);
      setNotice(editingProductId ? "Producto actualizado." : "Producto creado.");
      closeProductModal();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos guardar el producto.");
    } finally {
      setIsSavingProduct(false);
    }
  }

  function requestDeleteProduct(item: MenuItemView) {
    setConfirmDialog({
      confirmLabel: "Eliminar producto",
      message: `"${item.title}" se ocultara de la carta y dejara de estar disponible en los QR.`,
      onConfirm: () => deleteProduct(item),
      title: "Eliminar menu",
    });
  }

  async function deleteProduct(item: MenuItemView) {
    setIsDeletingProduct(item.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/menu/${item.id}`, { method: "DELETE" });
      const data = (await response.json()) as MenuApiResponse;

      if (!response.ok || !data.menu) {
        throw new Error(data.message ?? "No pudimos eliminar el producto.");
      }

      commitMenu(data.menu);
      setNotice(`"${item.title}" eliminado del menu.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos eliminar el producto.");
    } finally {
      setIsDeletingProduct(null);
    }
  }

  async function uploadImage(file: File) {
    if (!imageTypes.has(file.type)) {
      setError("Usa una imagen JPG, PNG, WebP o AVIF.");
      return;
    }

    if (file.size > maxImageSize) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
    setIsUploadingImage(true);
    setError("");

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/admin/menu/upload", {
        body,
        method: "POST",
      });
      const data = (await response.json()) as ImageUploadResponse;

      if (!response.ok || !data.image) {
        throw new Error(data.message ?? "No pudimos subir la imagen.");
      }

      setProductForm((current) => ({
        ...current,
        imagePublicId: data.image?.imagePublicId ?? "",
        imageUrl: data.image?.imageUrl ?? "",
      }));
      setImagePreviewUrl(data.image.imageUrl);
      setNotice("Imagen subida y optimizada.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos subir la imagen.");
      setImagePreviewUrl(productForm.imageUrl || null);
    } finally {
      setIsUploadingImage(false);
    }
  }

  function removeProductImage() {
    setProductForm((current) => ({
      ...current,
      imagePublicId: "",
      imageUrl: "",
    }));
    setImagePreviewUrl(null);
  }

  async function saveSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSubcategory(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        subcategoryForm.id
          ? `/api/admin/menu/subcategories/${subcategoryForm.id}`
          : "/api/admin/menu/subcategories",
        {
          body: JSON.stringify({
            category: subcategoryForm.category,
            name: subcategoryForm.name,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: subcategoryForm.id ? "PATCH" : "POST",
        },
      );
      const data = (await response.json()) as MenuApiResponse;

      if (!response.ok || !data.menu) {
        throw new Error(data.message ?? "No pudimos guardar la subcategoria.");
      }

      commitMenu(data.menu);
      setNotice(subcategoryForm.id ? "Subcategoria actualizada." : "Subcategoria creada.");
      setSubcategoryForm({ category: subcategoryForm.category, id: null, name: "" });
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos guardar la subcategoria.");
    } finally {
      setIsSavingSubcategory(false);
    }
  }

  function requestDeleteSubcategory(subcategory: MenuSubcategoryView) {
    setConfirmDialog({
      confirmLabel: "Eliminar subcategoria",
      message: `"${subcategory.name}" se eliminara. Los ${subcategory.itemCount} producto${subcategory.itemCount === 1 ? "" : "s"} asociado${subcategory.itemCount === 1 ? "" : "s"} quedaran en General.`,
      onConfirm: () => deleteSubcategory(subcategory),
      title: "Eliminar subcategoria",
    });
  }

  async function deleteSubcategory(subcategory: MenuSubcategoryView) {
    setIsDeletingSubcategory(subcategory.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/menu/subcategories/${subcategory.id}`, { method: "DELETE" });
      const data = (await response.json()) as MenuApiResponse;

      if (!response.ok || !data.menu) {
        throw new Error(data.message ?? "No pudimos eliminar la subcategoria.");
      }

      commitMenu(data.menu);
      setNotice(`Subcategoria "${subcategory.name}" eliminada.`);
      if (subcategoryForm.id === subcategory.id) {
        setSubcategoryForm({ category: subcategory.category, id: null, name: "" });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pudimos eliminar la subcategoria.");
    } finally {
      setIsDeletingSubcategory(null);
    }
  }

  async function confirmCurrentDialog() {
    if (!confirmDialog || isConfirming) {
      return;
    }

    setIsConfirming(true);

    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="overflow-hidden rounded-3xl border border-amber-200/15 bg-black/35 shadow-2xl shadow-black/25">
        <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0))] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-amber-300">Gestion de menus</p>
              <h2 className="mt-1 text-3xl font-black uppercase leading-none text-white">Carta dinamica</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-50/60">
                Los cambios se publican automaticamente en la carta de mesa y en todos los QR activos.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[460px]">
              <MenuMetric label="Productos" value={String(menu.items.length)} />
              <MenuMetric label="Activos" value={String(activeItems)} />
              <MenuMetric label="Subcategorias" value={String(menu.subcategories.length)} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid content-start gap-4">
            <div className="grid gap-3 rounded-3xl border border-amber-200/10 bg-[#0c0805] p-4 lg:grid-cols-[minmax(240px,1fr)_200px] 2xl:grid-cols-[minmax(260px,1fr)_220px_auto] 2xl:items-end">
              <label className="grid gap-2 text-sm font-black text-amber-50/80">
                Buscar producto
                <input
                  className="min-h-12 rounded-2xl border border-amber-200/20 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Brownie, burger, cerveza..."
                  value={search}
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-amber-50/80">
                Categoria
                <select
                  className="min-h-12 rounded-2xl border border-amber-200/20 bg-[#1a110b] px-4 text-base text-white outline-none transition focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                  onChange={(event) => {
                    setCategoryFilter(event.target.value as MenuCategory | "todas");
                    setPage(1);
                  }}
                  value={categoryFilter}
                >
                  <option value="todas">Todas</option>
                  {MENU_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {MENU_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:col-span-2 2xl:col-span-1 2xl:min-w-[390px]">
                <button
                  className="min-h-12 rounded-2xl border border-amber-200/20 px-4 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isRefreshing}
                  onClick={() => void refreshMenu()}
                  type="button"
                >
                  {isRefreshing ? "Actualizando..." : "Actualizar"}
                </button>
                <button
                  className="min-h-12 rounded-2xl border border-amber-200/20 px-4 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-200/10"
                  onClick={() => {
                    setSubcategoryCategoryFilter(categoryFilter === "todas" ? "todas" : categoryFilter);
                    setIsSubcategoryManagerOpen(true);
                  }}
                  type="button"
                >
                  Ver subcategorias
                </button>
                <button
                  className="min-h-12 rounded-2xl bg-amber-300 px-4 text-xs font-black uppercase text-[#140b04] transition hover:bg-amber-200"
                  onClick={openNewProduct}
                  type="button"
                >
                  Nuevo producto
                </button>
              </div>
            </div>

            {notice ? <ToastMessage tone="success" message={notice} /> : null}
            {error ? <ToastMessage tone="error" message={error} /> : null}

            {isRefreshing ? (
              <MenuSkeletonList />
            ) : visibleItems.length ? (
              <div className="grid gap-3">
                {visibleItems.map((item) => (
                  <ProductRow
                    isDeleting={isDeletingProduct === item.id}
                    item={item}
                    key={item.id}
                    onDelete={() => requestDeleteProduct(item)}
                    onEdit={() => openEditProduct(item)}
                  />
                ))}
              </div>
            ) : (
              <EmptyMenuState onCreate={openNewProduct} />
            )}

            {pageCount > 1 ? (
              <div className="flex flex-col gap-3 rounded-3xl border border-amber-200/10 bg-[#0c0805] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-amber-50/60">
                  Pagina {currentPage} de {pageCount} - {filteredItems.length} producto
                  {filteredItems.length === 1 ? "" : "s"}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    type="button"
                  >
                    Anterior
                  </button>
                  <button
                    className="min-h-11 rounded-xl border border-amber-200/20 px-4 text-sm font-black text-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                    type="button"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </div>

        </div>
      </div>

      {isProductModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 px-4 py-5 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button className="absolute inset-0 cursor-default" onClick={closeProductModal} type="button" />
          <form
            className="relative mx-auto grid max-h-[92svh] max-w-3xl overflow-y-auto rounded-3xl border border-amber-200/15 bg-[#0b0705] shadow-2xl shadow-black"
            onSubmit={saveProduct}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-amber-200/10 bg-[#0b0705]/95 p-5 backdrop-blur-xl">
              <div>
                <p className="text-sm font-black uppercase text-amber-300">
                  {editingProductId ? "Editar producto" : "Nuevo producto"}
                </p>
                <h3 className="mt-1 text-2xl font-black uppercase text-white">Datos del menu</h3>
              </div>
              <button
                className="rounded-full border border-amber-200/20 px-4 py-2 text-sm font-black text-amber-100"
                onClick={closeProductModal}
                type="button"
              >
                Cerrar
              </button>
            </div>

            {(error || notice) ? (
              <div className="px-5 pt-5">
                {error ? <ToastMessage tone="error" message={error} /> : null}
                {notice ? <ToastMessage tone="success" message={notice} /> : null}
              </div>
            ) : null}

            <div className="grid gap-5 p-5 lg:grid-cols-[260px_1fr]">
              <section className="grid content-start gap-3">
                <div className="overflow-hidden rounded-3xl border border-amber-200/12 bg-black/35">
                  <div className="aspect-[4/3] bg-[#120c08]">
                    {imagePreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="h-full w-full object-cover" src={imagePreviewUrl} alt="" />
                    ) : (
                      <div className="grid h-full place-items-center p-5 text-center text-sm font-bold text-amber-50/45">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2 p-3">
                    <label className="grid min-h-11 cursor-pointer place-items-center rounded-xl bg-amber-300 px-4 text-center text-xs font-black uppercase text-[#140b04] transition hover:bg-amber-200">
                      {isUploadingImage ? "Subiendo..." : imagePreviewUrl ? "Reemplazar imagen" : "Subir imagen"}
                      <input
                        accept="image/avif,image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={isUploadingImage}
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            void uploadImage(file);
                          }

                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    {imagePreviewUrl ? (
                      <button
                        className="min-h-11 rounded-xl border border-red-200/25 px-4 text-xs font-black uppercase text-red-50 transition hover:bg-red-500/12"
                        onClick={removeProductImage}
                        type="button"
                      >
                        Eliminar imagen
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="rounded-2xl border border-amber-200/10 bg-white/[.04] p-3 text-xs font-bold leading-5 text-amber-50/55">
                  Formatos validos: JPG, PNG, WebP o AVIF. Maximo 5 MB. Cloudinary entrega la imagen optimizada.
                </p>
              </section>

              <section className="grid content-start gap-3">
                <AdminMenuInput
                  label="Titulo"
                  onChange={(title) => setProductForm((current) => ({ ...current, title }))}
                  placeholder="Ej: Brownie"
                  value={productForm.title}
                />
                <label className="grid gap-2 text-sm font-black text-amber-50/80">
                  Descripcion
                  <textarea
                    className="min-h-28 resize-y rounded-xl border border-amber-200/20 bg-white/10 px-3 py-3 text-sm text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70"
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Con helado de crema americana y salsa de chocolate."
                    required
                    value={productForm.description}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminMenuInput
                    inputMode="numeric"
                    label="Precio"
                    onChange={(price) => setProductForm((current) => ({ ...current, price }))}
                    placeholder="5500"
                    value={productForm.price}
                  />
                  <label className="grid gap-2 text-sm font-black text-amber-50/80">
                    Categoria
                    <select
                      className="min-h-11 rounded-xl border border-amber-200/20 bg-[#1a110b] px-3 text-sm text-white outline-none transition focus:border-amber-300/70"
                      onChange={(event) => {
                        const category = event.target.value as MenuCategory;
                        setProductForm((current) => ({
                          ...current,
                          category,
                          subcategoryId: "",
                        }));
                      }}
                      value={productForm.category}
                    >
                      {MENU_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {MENU_CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="grid gap-2 text-sm font-black text-amber-50/80">
                    Subcategoria
                    <select
                      className="min-h-11 rounded-xl border border-amber-200/20 bg-[#1a110b] px-3 text-sm text-white outline-none transition focus:border-amber-300/70"
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          subcategoryId: event.target.value,
                        }))
                      }
                      value={productForm.subcategoryId}
                    >
                      <option value="">General</option>
                      {productSubcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-200/15 bg-white/[.04] px-3 text-sm font-black text-amber-50/80">
                    <input
                      checked={productForm.active}
                      className="h-4 w-4 accent-amber-300"
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          active: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    Activo
                  </label>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 grid gap-2 border-t border-amber-200/10 bg-[#0b0705]/95 p-5 backdrop-blur-xl sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-sm font-bold text-amber-50/55">
                {editingProductId ? "Al guardar se actualiza en las mesas y QR." : "Se publica al guardar el producto."}
              </p>
              <button
                className="min-h-12 rounded-xl bg-amber-300 px-6 text-sm font-black uppercase text-[#140b04] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingProduct || isUploadingImage}
                type="submit"
              >
                {isSavingProduct ? "Guardando..." : "Guardar producto"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isSubcategoryManagerOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/70 px-4 py-5 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button
            aria-label="Cerrar subcategorias"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsSubcategoryManagerOpen(false)}
            type="button"
          />
          <section className="relative mx-auto grid max-h-[92svh] w-full max-w-5xl overflow-hidden rounded-3xl border border-amber-200/15 bg-[#0b0705] shadow-2xl shadow-black">
            <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-amber-200/10 bg-[#0b0705]/95 p-5 backdrop-blur-xl sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-amber-300">Gestion de subcategorias</p>
                <h3 className="mt-1 text-2xl font-black uppercase leading-tight text-white">
                  Crear, editar y eliminar
                </h3>
                <p className="mt-2 text-sm leading-6 text-amber-50/58">
                  Las categorias principales siguen fijas. Aca organizas las subcategorias que usan los productos.
                </p>
              </div>
              <button
                className="min-h-11 rounded-full border border-amber-200/20 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-200/10"
                onClick={() => setIsSubcategoryManagerOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-4 overflow-y-auto p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <section className="rounded-3xl border border-amber-200/12 bg-[#120c08] p-4 shadow-xl shadow-black/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-amber-300">Subcategoria</p>
                    <h4 className="mt-1 text-xl font-black uppercase text-white">
                      {subcategoryForm.id ? "Editar" : "Crear"}
                    </h4>
                  </div>
                  {subcategoryForm.id ? (
                    <button
                      className="rounded-xl border border-amber-200/20 px-3 py-2 text-xs font-black uppercase text-amber-100"
                      onClick={() => setSubcategoryForm({ category: subcategoryForm.category, id: null, name: "" })}
                      type="button"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>

                <form className="mt-4 grid gap-3" onSubmit={saveSubcategory}>
                  <label className="grid gap-2 text-sm font-black text-amber-50/80">
                    Categoria fija
                    <select
                      className="min-h-11 rounded-xl border border-amber-200/20 bg-[#1a110b] px-3 text-sm text-white outline-none transition focus:border-amber-300/70"
                      onChange={(event) => {
                        const category = event.target.value as MenuCategory;
                        setSubcategoryForm((current) => ({
                          ...current,
                          category,
                        }));
                        setSubcategoryCategoryFilter(category);
                      }}
                      value={subcategoryForm.category}
                    >
                      {MENU_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {MENU_CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-black text-amber-50/80">
                    Nombre
                    <input
                      className="min-h-11 rounded-xl border border-amber-200/20 bg-white/10 px-3 text-sm text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70"
                      onChange={(event) =>
                        setSubcategoryForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ej: Hamburguesas"
                      required
                      value={subcategoryForm.name}
                    />
                  </label>
                  <button
                    className="min-h-12 rounded-xl bg-amber-300 px-4 text-sm font-black uppercase text-[#140b04] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingSubcategory}
                    type="submit"
                  >
                    {isSavingSubcategory
                      ? "Guardando..."
                      : subcategoryForm.id
                        ? "Guardar cambios"
                        : "Crear subcategoria"}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-amber-200/12 bg-black/30 p-4 shadow-xl shadow-black/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-amber-300">Listado</p>
                    <h4 className="mt-1 text-xl font-black uppercase text-white">
                      {filteredSubcategories.length} subcategoria{filteredSubcategories.length === 1 ? "" : "s"}
                    </h4>
                  </div>
                  <label className="grid gap-2 text-xs font-black uppercase text-amber-50/70 sm:min-w-48">
                    Filtrar categoria
                    <select
                      className="min-h-11 rounded-xl border border-amber-200/20 bg-[#1a110b] px-3 text-sm normal-case text-white outline-none transition focus:border-amber-300/70"
                      onChange={(event) => setSubcategoryCategoryFilter(event.target.value as MenuCategory | "todas")}
                      value={subcategoryCategoryFilter}
                    >
                      <option value="todas">Todas</option>
                      {MENU_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {MENU_CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 max-h-[min(58svh,560px)] overflow-y-auto pr-1">
                  <div className="grid gap-2 md:grid-cols-2">
                  {filteredSubcategories.length ? (
                    filteredSubcategories.map((subcategory) => (
                      <article
                        className="rounded-2xl border border-amber-200/10 bg-white/[.04] p-3"
                        key={subcategory.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h5 className="truncate font-black text-white">{subcategory.name}</h5>
                            <p className="mt-1 text-xs font-bold uppercase text-amber-50/50">
                              {subcategory.categoryLabel} - {subcategory.itemCount} producto
                              {subcategory.itemCount === 1 ? "" : "s"}
                            </p>
                          </div>
                          <span className="rounded-full bg-amber-300/12 px-2 py-1 text-[10px] font-black uppercase text-amber-100">
                            {subcategory.slug}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            className="min-h-10 rounded-xl border border-amber-200/20 px-3 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-200/10"
                            onClick={() => {
                              setSubcategoryForm({
                                category: subcategory.category,
                                id: subcategory.id,
                                name: subcategory.name,
                              });
                              setSubcategoryCategoryFilter(subcategory.category);
                            }}
                            type="button"
                          >
                            Editar
                          </button>
                          <button
                            className="min-h-10 rounded-xl border border-red-200/25 px-3 text-xs font-black uppercase text-red-50 transition hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isDeletingSubcategory === subcategory.id}
                            onClick={() => requestDeleteSubcategory(subcategory)}
                            type="button"
                          >
                            {isDeletingSubcategory === subcategory.id ? "Borrando..." : "Eliminar"}
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-amber-200/10 bg-white/[.04] p-4 text-sm leading-6 text-amber-50/60 md:col-span-2">
                      No hay subcategorias para la categoria seleccionada.
                    </p>
                  )}
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {confirmDialog ? (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          isConfirming={isConfirming}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => void confirmCurrentDialog()}
          title={confirmDialog.title}
        />
      ) : null}
    </section>
  );
}

function ProductRow({
  isDeleting,
  item,
  onDelete,
  onEdit,
}: {
  isDeleting: boolean;
  item: MenuItemView;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="grid overflow-hidden rounded-3xl border border-amber-200/12 bg-[#120c08] shadow-xl shadow-black/20 xl:grid-cols-[108px_minmax(0,1fr)_120px_150px] xl:items-center">
      <div className="relative h-44 bg-black xl:h-full xl:min-h-28">
        <MenuImage alt={item.title} sizes="(max-width: 1024px) 100vw, 108px" src={item.imageUrl} />
      </div>

      <div className="min-w-0 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-lg font-black uppercase leading-tight text-white">
            {item.title}
          </h3>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
              item.active ? "bg-emerald-400/15 text-emerald-100" : "bg-red-400/15 text-red-100"
            }`}
          >
            {item.active ? "Activo" : "Oculto"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-amber-50/60">{item.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase">
          <span className="rounded-full border border-amber-200/15 px-3 py-1 text-amber-100">
            {item.categoryLabel}
          </span>
          <span className="rounded-full border border-amber-200/15 px-3 py-1 text-amber-100">
            {item.subcategoryName ?? "General"}
          </span>
        </div>
      </div>

      <strong className="px-4 pb-2 text-xl font-black text-amber-200 xl:p-4 xl:text-right">{item.price}</strong>

      <div className="grid grid-cols-2 gap-2 p-4 pt-2 xl:grid-cols-1 xl:pt-4">
        <button
          className="min-h-10 rounded-xl border border-amber-200/20 px-3 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-200/10"
          onClick={onEdit}
          type="button"
        >
          Editar
        </button>
        <button
          className="min-h-10 rounded-xl border border-red-200/25 px-3 text-xs font-black uppercase text-red-50 transition hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isDeleting}
          onClick={onDelete}
          type="button"
        >
          {isDeleting ? "Borrando..." : "Eliminar"}
        </button>
      </div>
    </article>
  );
}

function MenuMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-amber-200/12 bg-black/30 p-4">
      <p className="text-[11px] font-black uppercase text-amber-50/50">{label}</p>
      <strong className="mt-2 block text-2xl font-black leading-none text-white">{value}</strong>
    </article>
  );
}

function ToastMessage({ message, tone }: { message: string; tone: "error" | "success" }) {
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm font-bold ${
        tone === "success"
          ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-50"
          : "border-red-300/25 bg-red-500/15 text-red-50"
      }`}
    >
      {message}
    </p>
  );
}

function ConfirmDialog({
  confirmLabel,
  isConfirming,
  message,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel: string;
  isConfirming: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center" role="dialog" aria-modal="true">
      <button aria-label="Cerrar confirmacion" className="absolute inset-0 cursor-default" onClick={onCancel} type="button" />
      <section className="relative w-full max-w-md rounded-3xl border border-amber-200/15 bg-[#0b0705] p-5 shadow-2xl shadow-black">
        <div className="mx-auto h-1 w-12 rounded-full bg-amber-200/30 sm:hidden" />
        <p className="mt-4 text-sm font-black uppercase text-red-200 sm:mt-0">Confirmacion</p>
        <h3 className="mt-2 text-2xl font-black uppercase leading-tight text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-amber-50/65">{message}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-2xl border border-amber-200/20 px-4 text-sm font-black uppercase text-amber-100 transition hover:bg-amber-200/10"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="min-h-12 rounded-2xl bg-red-300 px-4 text-sm font-black uppercase text-red-950 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function EmptyMenuState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-amber-200/20 bg-[#120c08]/70 p-8 text-center">
      <div>
        <p className="text-sm font-black uppercase text-amber-300">Sin resultados</p>
        <h3 className="mt-2 text-3xl font-black uppercase leading-none text-white">No hay productos visibles</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-amber-50/60">
          Ajusta la busqueda o crea un nuevo producto para publicarlo en la carta dinamica.
        </p>
        <button
          className="mt-5 min-h-12 rounded-2xl bg-amber-300 px-5 text-sm font-black uppercase text-[#140b04] transition hover:bg-amber-200"
          onClick={onCreate}
          type="button"
        >
          Crear producto
        </button>
      </div>
    </section>
  );
}

function MenuSkeletonList() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="grid animate-pulse rounded-3xl border border-amber-200/10 bg-[#120c08] lg:grid-cols-[108px_1fr]" key={index}>
          <div className="h-36 bg-white/10 lg:h-auto" />
          <div className="grid gap-3 p-4">
            <span className="h-5 w-2/5 rounded-full bg-white/10" />
            <span className="h-4 w-4/5 rounded-full bg-white/10" />
            <span className="h-4 w-2/3 rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminMenuInput({
  inputMode,
  label,
  onChange,
  placeholder,
  value,
}: {
  inputMode?: "decimal" | "email" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-amber-50/80">
      {label}
      <input
        className="min-h-11 rounded-xl border border-amber-200/20 bg-white/10 px-3 text-sm text-white outline-none transition placeholder:text-amber-50/35 focus:border-amber-300/70"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        value={value}
      />
    </label>
  );
}

function emptyProductForm(category: MenuCategory = "comida"): ProductFormState {
  return {
    active: true,
    category,
    description: "",
    imagePublicId: "",
    imageUrl: "",
    price: "",
    subcategoryId: "",
    title: "",
  };
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
