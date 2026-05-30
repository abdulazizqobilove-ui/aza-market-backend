"use client";
import { useEffect, useState, useRef } from "react";
import {
  Plus, Search, Package, Edit2, Trash2, Eye, EyeOff,
  Upload, X, ChevronDown, RefreshCw, Image as ImageIcon,
  AlertCircle, Check,
} from "lucide-react";
import api, { Product, Category, imgUrl } from "@/lib/api";
import { clsx } from "clsx";

// ── Helpers ────────────────────────────────────────────────────────────
function genSKU() { return "SKU-" + Math.random().toString(36).substring(2, 10).toUpperCase(); }

const DELIVERY_MODES = [
  { value: "service", label: "Через службу доставки" },
  { value: "pickup", label: "Самовывоз" },
  { value: "both", label: "Оба варианта" },
];

// ── Product Form Modal ─────────────────────────────────────────────────
interface FormState {
  title: string; description: string; about: string;
  price: string; original_price: string; stock: string;
  brand: string; category_id: string; sku: string; barcode: string;
  shop_tag: string; delivery_price: string; delivery_price_other: string;
  delivery_mode: string; is_active: boolean;
}

const BLANK: FormState = {
  title: "", description: "", about: "", price: "", original_price: "",
  stock: "", brand: "", category_id: "", sku: genSKU(), barcode: "",
  shop_tag: "", delivery_price: "0", delivery_price_other: "0",
  delivery_mode: "service", is_active: true,
};

function ProductModal({
  product, categories, onClose, onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState<FormState>(
    product ? {
      title: product.title, description: product.description || "",
      about: product.about || "", price: String(product.price),
      original_price: product.original_price ? String(product.original_price) : "",
      stock: String(product.stock), brand: product.brand || "",
      category_id: String(product.category.id),
      sku: (product as any).sku || genSKU(),
      barcode: product.barcode || "",
      shop_tag: product.shop_tag || "",
      delivery_price: String(product.delivery_price ?? 0),
      delivery_price_other: String(product.delivery_price_other ?? 0),
      delivery_mode: product.delivery_mode || "service",
      is_active: product.is_active,
    } : { ...BLANK }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedId, setUploadedId] = useState<number | null>(product?.id ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const roots = categories.filter((c) => !c.parent_id);
  const subs  = categories.filter((c) => c.parent_id != null);
  const rootOfSelected = form.category_id
    ? categories.find((c) => c.id === parseInt(form.category_id))?.parent_id ?? null
    : null;
  const [selectedRoot, setSelectedRoot] = useState<number | null>(
    product ? (categories.find((c) => c.id === product.category.id)?.parent_id ?? null) : null
  );
  const subCats = selectedRoot ? subs.filter((c) => c.parent_id === selectedRoot) : [];

  const set = (k: keyof FormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.price || !form.stock || !form.category_id) {
      setError("Заполните обязательные поля: название, цена, количество, категория"); return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim() || undefined,
        about: form.about.trim() || undefined, price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : undefined,
        stock: parseInt(form.stock), brand: form.brand.trim() || undefined,
        category_id: parseInt(form.category_id), sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined, shop_tag: form.shop_tag.trim() || undefined,
        delivery_price: parseFloat(form.delivery_price) || 0,
        delivery_price_other: parseFloat(form.delivery_price_other) || 0,
        delivery_mode: form.delivery_mode, is_active: form.is_active,
      };

      let productId = uploadedId;
      if (isEdit) {
        await api.patch(`/products/${product!.id}`, payload);
        productId = product!.id;
      } else {
        const res = await api.post<Product>("/products", payload);
        productId = res.data.id;
        setUploadedId(productId);
      }

      // Upload photos
      if (photos.length > 0 && productId) {
        setUploading(true);
        for (const file of photos) {
          const fd = new FormData();
          fd.append("file", file);
          await api.post(`/products/${productId}/images`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        setUploading(false);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Ошибка сохранения");
      setSaving(false); setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Редактировать товар" : "Новый товар"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700">Товар активен</span>
            <button
              onClick={() => set("is_active", !form.is_active)}
              className={clsx("w-12 h-6 rounded-full transition relative", form.is_active ? "bg-blue-600" : "bg-gray-300")}
            >
              <div className={clsx("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all", form.is_active ? "left-6" : "left-0.5")} />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Название *</label>
            <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Название товара" />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Цена * (сом.)</label>
              <input className="input" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Старая цена</label>
              <input className="input" type="number" value={form.original_price} onChange={(e) => set("original_price", e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Кол-во * (шт.)</label>
              <input className="input" type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Раздел *</label>
              <select className="input" value={selectedRoot ?? ""} onChange={(e) => { setSelectedRoot(parseInt(e.target.value)); set("category_id", ""); }}>
                <option value="">Выберите...</option>
                {roots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Категория *</label>
              <select className="input" value={form.category_id} onChange={(e) => set("category_id", e.target.value)} disabled={!selectedRoot}>
                <option value="">Выберите...</option>
                {subCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Brand & SKU & Barcode */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Бренд</label>
              <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Nike, Apple..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Артикул (SKU)</label>
              <input className="input font-mono text-xs" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="SKU-..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Штрихкод</label>
              <input className="input font-mono text-xs" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="4607..." />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Описание</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Краткое описание товара..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">О товаре</label>
            <textarea className="input resize-none" rows={3} value={form.about} onChange={(e) => set("about", e.target.value)} placeholder="Подробное описание, состав, особенности..." />
          </div>

          {/* Delivery */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Вид доставки</label>
              <select className="input" value={form.delivery_mode} onChange={(e) => set("delivery_mode", e.target.value)}>
                {DELIVERY_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Доставка (сом.)</label>
              <input className="input" type="number" value={form.delivery_price} onChange={(e) => set("delivery_price", e.target.value)} placeholder="0 = бесплатно" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">В другой город</label>
              <input className="input" type="number" value={form.delivery_price_other} onChange={(e) => set("delivery_price_other", e.target.value)} placeholder="0 = бесплатно" />
            </div>
          </div>

          {/* Shop tag */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Метка магазина</label>
            <input className="input" value={form.shop_tag} onChange={(e) => set("shop_tag", e.target.value)} placeholder="Футболки, Летняя коллекция..." />
          </div>

          {/* Photos */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Фотографии</label>
            {isEdit && product && product.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {product.images.map((img) => (
                  <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                    <img src={imgUrl(img.url) ?? ""} className="w-full h-full object-cover" alt="" />
                    {img.is_main && <span className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-center text-[9px] py-0.5">Главное</span>}
                  </div>
                ))}
              </div>
            )}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition group"
            >
              <ImageIcon className="w-7 h-7 text-gray-300 mx-auto mb-2 group-hover:text-blue-400" />
              <p className="text-sm text-gray-500">Нажмите чтобы выбрать фото</p>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG до 10 МБ</p>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              />
            </div>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photos.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs">
                    {f.name}
                    <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Отмена</button>
          <button onClick={submit} disabled={saving || uploading} className="btn-primary flex items-center gap-2">
            {(saving || uploading) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {uploading ? "Загружаем фото..." : saving ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editProduct, setEditProduct] = useState<Product | "new" | null>(null);

  const load = async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.allSettled([
      api.get<Product[]>("/seller/products"),
      api.get<Category[]>("/products/categories"),
    ]);
    if (pRes.status === "fulfilled") setProducts(pRes.value.data);
    if (cRes.status === "fulfilled") setCategories(cRes.value.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (p: Product) => {
    await api.patch(`/products/${p.id}`, { is_active: !p.is_active });
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
  };

  const del = async (id: number) => {
    if (!confirm("Удалить товар?")) return;
    await api.delete(`/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = products.filter((p) =>
    !q || p.title.toLowerCase().includes(q.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Товары</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} товаров в вашем магазине</p>
        </div>
        <button onClick={() => setEditProduct("new")} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Добавить товар
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию или бренду..." />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">Товаров не найдено</p>
            <button onClick={() => setEditProduct("new")} className="btn-primary mt-4 text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Добавить первый товар
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Товар</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Категория</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Цена</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Остаток</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Продано</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const img = p.images.find((i) => i.is_main) ?? p.images[0];
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {img ? <img src={imgUrl(img.url) ?? ""} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 max-w-[200px] truncate">{p.title}</p>
                          {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{p.category.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-gray-900">{p.price.toLocaleString()} сом.</p>
                      {p.original_price && <p className="text-xs text-gray-400 line-through">{p.original_price.toLocaleString()}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx("text-sm font-semibold", p.stock === 0 ? "text-red-500" : p.stock <= 5 ? "text-yellow-600" : "text-gray-800")}>
                        {p.stock} шт.
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-600">{p.sales_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggle(p)} className={clsx("badge", p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                        {p.is_active ? "Активен" : "Скрыт"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => toggle(p)} title={p.is_active ? "Скрыть" : "Показать"}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-400">
                          {p.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditProduct(p)} title="Редактировать"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition text-gray-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => del(p.id)} title="Удалить"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {editProduct !== null && (
        <ProductModal
          product={editProduct === "new" ? null : editProduct}
          categories={categories}
          onClose={() => setEditProduct(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
