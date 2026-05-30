"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Image as ImageIcon, Check, AlertCircle, Eye, EyeOff,
  Package, Tag, Truck, Layers, Star,
} from "lucide-react";
import api, { Product, Category, imgUrl } from "@/lib/api";
import { clsx } from "clsx";

// ── Constants ──────────────────────────────────────────────────────────
function genSKU() { return "SKU-" + Math.random().toString(36).substring(2, 10).toUpperCase(); }

const COLOR_PALETTE = [
  { name: "Красный",     hex: "#ef4444" },
  { name: "Розовый",     hex: "#ec4899" },
  { name: "Оранжевый",   hex: "#f97316" },
  { name: "Жёлтый",      hex: "#eab308" },
  { name: "Зелёный",     hex: "#22c55e" },
  { name: "Голубой",     hex: "#38bdf8" },
  { name: "Синий",       hex: "#3b82f6" },
  { name: "Тёмно-синий", hex: "#1d4ed8" },
  { name: "Фиолетовый",  hex: "#8b5cf6" },
  { name: "Чёрный",      hex: "#111827" },
  { name: "Тёмно-серый", hex: "#6b7280" },
  { name: "Серый",       hex: "#d1d5db" },
  { name: "Белый",       hex: "#f3f4f6" },
  { name: "Коричневый",  hex: "#92400e" },
  { name: "Бежевый",     hex: "#d4b896" },
  { name: "Бордовый",    hex: "#881337" },
  { name: "Хаки",        hex: "#84754e" },
  { name: "Золотой",     hex: "#d97706" },
  { name: "Серебряный",  hex: "#9ca3af" },
];

const SIZE_PRESETS = ["XS","S","M","L","XL","XXL","3XL","4XL"];
const SHOE_SIZES   = ["35","36","37","38","39","40","41","42","43","44","45","46"];
const DELIVERY_MODES = [
  { value: "service", label: "Через службу доставки" },
  { value: "pickup",  label: "Самовывоз" },
  { value: "both",    label: "Оба варианта" },
];

interface Attr { key: string; value: string; }
interface PhotoFile { file: File; preview: string; }

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

// ── Section wrapper ────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition"
      >
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <span className="font-semibold text-gray-900 flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-50">{children}</div>}
    </div>
  );
}

// ── Color photo uploader ───────────────────────────────────────────────
function ColorPhotoBox({ color, photos, onAdd, onRemove }: {
  color: string; photos: PhotoFile[];
  onAdd: (color: string, files: File[]) => void;
  onRemove: (color: string, idx: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const hex = COLOR_PALETTE.find(c => c.name === color)?.hex ?? "#9ca3af";
  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0" style={{ background: hex }} />
        <span className="text-sm font-medium text-gray-800">{color}</span>
        <span className="text-xs text-gray-400 ml-auto">{photos.length}/8 фото</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden group">
            <img src={p.preview} className="w-full h-full object-cover" alt="" />
            <button
              type="button"
              onClick={() => onRemove(color, i)}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[9px] text-center py-0.5">Главное</span>
            )}
          </div>
        ))}
        {photos.length < 8 && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-blue-300 hover:bg-blue-50 transition"
          >
            <Plus className="w-5 h-5 text-gray-300" />
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { onAdd(color, Array.from(e.target.files ?? [])); e.target.value = ""; }}
      />
    </div>
  );
}

// ── Main Form Component ────────────────────────────────────────────────
export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = !!product;

  // Form state
  const [form, setForm] = useState<FormState>(product ? {
    title: product.title, description: product.description || "",
    about: product.about || "", price: String(product.price),
    original_price: product.original_price ? String(product.original_price) : "",
    stock: String(product.stock), brand: product.brand || "",
    category_id: String(product.category.id),
    sku: (product as any).sku || genSKU(),
    barcode: product.barcode || "", shop_tag: product.shop_tag || "",
    delivery_price: String(product.delivery_price ?? 0),
    delivery_price_other: String(product.delivery_price_other ?? 0),
    delivery_mode: product.delivery_mode || "service",
    is_active: product.is_active,
  } : { ...BLANK });

  const [rootCats, setRootCats] = useState<Category[]>([]);
  const [subCats, setSubCats] = useState<Category[]>([]);
  const [selectedRoot, setSelectedRoot] = useState<number | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState("");

  // Photos (general)
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // Variants
  const [colors, setColors] = useState<string[]>(
    product?.attributes?.["Цвет"]
      ? product.attributes["Цвет"].split(",").map(s => s.trim()).filter(Boolean)
      : []
  );
  const [colorInput, setColorInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPhotos, setColorPhotos] = useState<Record<string, PhotoFile[]>>({});
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>(
    product?.variants ? Object.fromEntries(product.variants.map(v => [v.name, String(v.price)])) : {}
  );
  const [variantOrigPrices, setVariantOrigPrices] = useState<Record<string, string>>(
    product?.variants ? Object.fromEntries(product.variants.filter(v => v.original_price).map(v => [v.name, String(v.original_price)])) : {}
  );
  const [variantStocks, setVariantStocks] = useState<Record<string, string>>(
    product?.variants ? Object.fromEntries(product.variants.map(v => [v.name, String(v.stock ?? 0)])) : {}
  );

  // Sizes
  const [sizes, setSizes] = useState<string[]>(
    product?.attributes?.["Размер"]
      ? product.attributes["Размер"].split(",").map(s => s.trim()).filter(Boolean)
      : []
  );
  const [sizeInput, setSizeInput] = useState("");

  // Custom attributes
  const [attrs, setAttrs] = useState<Attr[]>(() => {
    if (!product?.attributes) return [{ key: "", value: "" }];
    const entries = Object.entries(product.attributes).filter(([k]) => k !== "Размер" && k !== "Цвет");
    return entries.length > 0 ? entries.map(([key, value]) => ({ key, value: String(value) })) : [{ key: "", value: "" }];
  });

  const hasVariants = colors.length > 0;

  // Load root categories on mount
  useEffect(() => {
    api.get<Category[]>("/products/categories").then(r => {
      setRootCats(r.data);
      if (product) {
        // For edit mode: find which root contains this category
        const cat = r.data.find(c => c.id === product.category.id);
        if (cat) {
          // product's category is itself a root → no subcategory
          setSelectedRoot(product.category.id);
          set("category_id", String(product.category.id));
        } else {
          // product's category might be a sub — fetch parent's subs
          // We'll detect parent_id from the product category object
          const parentId = product.category.parent_id;
          if (parentId) {
            setSelectedRoot(parentId);
            loadSubCats(parentId);
          }
        }
      }
    });
  }, []);

  // Load subcategories when root changes
  const loadSubCats = async (rootId: number) => {
    setLoadingSubs(true);
    setSubCats([]);
    try {
      const r = await api.get<Category[]>(`/products/categories/${rootId}/subcategories`);
      setSubCats(r.data);
      // If no subcategories → root itself is the category
      if (r.data.length === 0) {
        set("category_id", String(rootId));
      }
    } catch {
      setSubCats([]);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleRootChange = (rootId: number | null) => {
    setSelectedRoot(rootId);
    set("category_id", "");
    setSubCats([]);
    if (rootId) loadSubCats(rootId);
  };

  const set = (k: keyof FormState, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }));
    if (typeof v === "string" && errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  // Photo handlers
  const addPhotos = (files: File[]) => {
    const newOnes = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...newOnes].slice(0, 10));
  };
  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, j) => j !== i));
    if (swapIdx === i) setSwapIdx(null);
  };
  const tapPhoto = (i: number) => {
    if (swapIdx === null) { setSwapIdx(i); return; }
    if (swapIdx === i) { setSwapIdx(null); return; }
    setPhotos(prev => { const n = [...prev]; [n[swapIdx], n[i]] = [n[i], n[swapIdx]]; return n; });
    setSwapIdx(null);
  };

  // Color handlers
  const addColor = (name: string) => {
    if (!name.trim() || colors.includes(name.trim())) return;
    setColors(prev => [...prev, name.trim()]);
    setColorInput("");
    setShowColorPicker(false);
  };
  const removeColor = (name: string) => {
    setColors(prev => prev.filter(c => c !== name));
    setColorPhotos(prev => { const n = { ...prev }; delete n[name]; return n; });
    setVariantPrices(prev => { const n = { ...prev }; delete n[name]; return n; });
    setVariantStocks(prev => { const n = { ...prev }; delete n[name]; return n; });
  };
  const addColorPhotos = (color: string, files: File[]) => {
    const newOnes = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setColorPhotos(prev => ({ ...prev, [color]: [...(prev[color] || []), ...newOnes].slice(0, 8) }));
  };
  const removeColorPhoto = (color: string, idx: number) => {
    setColorPhotos(prev => ({ ...prev, [color]: (prev[color] || []).filter((_, i) => i !== idx) }));
  };

  // Upload photos to server
  const uploadPhotos = async (productId: number) => {
    const photosToUpload = hasVariants
      ? colors.flatMap(c => colorPhotos[c] || [])
      : photos;
    const variantIndices = hasVariants
      ? colors.flatMap((c, i) => (colorPhotos[c] || []).map(() => i))
      : [];

    if (photosToUpload.length === 0) return;
    setUploadStep(`Загружаем ${photosToUpload.length} фото...`);

    const fd = new FormData();
    photosToUpload.forEach(p => fd.append("files", p.file));
    if (variantIndices.length > 0) fd.append("variant_indices", JSON.stringify(variantIndices));
    await api.post(`/products/${productId}/images`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  // Validate
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Введите название";
    if (!form.category_id) e.category_id = "Выберите категорию";
    if (!hasVariants) {
      if (!form.price || parseFloat(form.price) <= 0) e.price = "Введите цену";
      if (!form.stock) e.stock = "Введите количество";
    } else {
      if (colors.some(c => !variantPrices[c] || parseFloat(variantPrices[c]) <= 0))
        e.price = "Укажите цену для каждого варианта";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Submit
  const submit = async () => {
    if (!validate()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSaving(true); setUploadStep("");

    try {
      const attributes: Record<string, string> = {};
      attrs.forEach(({ key, value }) => {
        if (key.trim() && value.trim() && key !== "Размер" && key !== "Цвет")
          attributes[key.trim()] = value.trim();
      });
      if (sizes.length > 0) attributes["Размер"] = sizes.join(",");
      if (colors.length > 0) attributes["Цвет"] = colors.join(",");

      const variantsArr = hasVariants
        ? colors.map((name, i) => ({
            index: i, name,
            price: parseFloat(variantPrices[name]) || 0,
            original_price: variantOrigPrices[name] ? parseFloat(variantOrigPrices[name]) : null,
            stock: parseInt(variantStocks[name]) || 0,
          }))
        : undefined;

      const mainPrice = hasVariants
        ? Math.min(...colors.map(n => parseFloat(variantPrices[n]) || 0))
        : parseFloat(form.price);
      const mainStock = hasVariants
        ? colors.reduce((s, n) => s + (parseInt(variantStocks[n]) || 0), 0)
        : parseInt(form.stock || "0");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        about: form.about.trim() || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        price: mainPrice,
        original_price: form.original_price ? parseFloat(form.original_price) : undefined,
        stock: mainStock,
        brand: form.brand.trim() || undefined,
        category_id: parseInt(form.category_id),
        variants: variantsArr,
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        shop_tag: form.shop_tag.trim() || undefined,
        delivery_price: parseFloat(form.delivery_price) || 0,
        delivery_price_other: parseFloat(form.delivery_price_other) || 0,
        delivery_mode: form.delivery_mode,
        is_active: form.is_active,
      };

      let productId: number;
      if (isEdit) {
        await api.patch(`/products/${product!.id}`, payload);
        productId = product!.id;
      } else {
        setUploadStep("Создаём товар...");
        const res = await api.post<{ id: number }>("/products", payload);
        productId = res.data.id;
      }

      await uploadPhotos(productId);
      router.push("/products");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Ошибка сохранения";
      setErrors({ _global: typeof msg === "string" ? msg : JSON.stringify(msg) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally { setSaving(false); setUploadStep(""); }
  };

  // ── Render ─────────────────────────────────────────────────────────
  const price = hasVariants
    ? (colors.length > 0 ? Math.min(...colors.map(c => parseFloat(variantPrices[c] || "0"))) : 0)
    : parseFloat(form.price || "0");

  return (
    <div className="flex gap-6 items-start">
      {/* ── LEFT: Form ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Global error */}
        {errors._global && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors._global}
          </div>
        )}

        {/* ── Basic info ── */}
        <Section title="Основная информация" icon={Package}>
          <div className="pt-2">
            {/* Active toggle */}
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Товар активен</p>
                <p className="text-xs text-gray-400 mt-0.5">Покупатели смогут видеть и покупать</p>
              </div>
              <button type="button" onClick={() => set("is_active", !form.is_active)}
                className={clsx("w-12 h-6 rounded-full transition relative flex-shrink-0", form.is_active ? "bg-blue-600" : "bg-gray-300")}>
                <div className={clsx("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all", form.is_active ? "left-6" : "left-0.5")} />
              </button>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Название товара *</label>
              <input className={clsx("input", errors.title && "border-red-300 ring-1 ring-red-300")}
                value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="Например: Куртка мужская зимняя Nike" />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Краткое описание</label>
              <textarea className="input resize-none" rows={2}
                value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Одно-два предложения о товаре..." />
            </div>

            {/* About */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Подробное описание</label>
              <textarea className="input resize-none" rows={4}
                value={form.about} onChange={e => set("about", e.target.value)}
                placeholder="Состав, особенности, как использовать, размерный ряд..." />
            </div>
          </div>
        </Section>

        {/* ── Category ── */}
        <Section title="Категория" icon={Tag}>
          <div className="pt-2 space-y-3">
            {/* Root */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Раздел *</label>
              <select
                className="input"
                value={selectedRoot ?? ""}
                onChange={e => handleRootChange(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Выберите раздел...</option>
                {rootCats.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {/* Subcategories — only when root has children */}
            {selectedRoot && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Подкатегория *</label>
                {loadingSubs ? (
                  <div className="input flex items-center gap-2 text-gray-400 text-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Загружаем...
                  </div>
                ) : subCats.length > 0 ? (
                  <select
                    className={clsx("input", errors.category_id && "border-red-300")}
                    value={form.category_id}
                    onChange={e => set("category_id", e.target.value)}
                  >
                    <option value="">Выберите подкатегорию...</option>
                    {subCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="input bg-green-50 text-green-700 text-sm flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {rootCats.find(r => r.id === selectedRoot)?.name}
                  </div>
                )}
                {errors.category_id && <p className="text-xs text-red-500">{errors.category_id}</p>}
              </div>
            )}
          </div>
        </Section>

        {/* ── Colors / variants ── */}
        <Section title="Цвета и модели" icon={Layers}>
          <div className="pt-2 space-y-4">
            <p className="text-xs text-gray-500">Если товар в нескольких цветах — добавьте каждый. Для каждого цвета можно задать отдельную цену, количество и фотографии.</p>

            {/* Added colors */}
            {colors.map((color) => {
              const hex = COLOR_PALETTE.find(c => c.name === color)?.hex ?? "#9ca3af";
              return (
                <div key={color} className="border border-gray-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border border-gray-200" style={{ background: hex }} />
                    <span className="font-semibold text-gray-800">{color}</span>
                    <button type="button" onClick={() => removeColor(color)} className="ml-auto text-gray-300 hover:text-red-400 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Variant prices */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">Цена (сом.) *</label>
                      <input className="input" type="number" placeholder="0"
                        value={variantPrices[color] || ""}
                        onChange={e => setVariantPrices(p => ({ ...p, [color]: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">Старая цена</label>
                      <input className="input" type="number" placeholder="0"
                        value={variantOrigPrices[color] || ""}
                        onChange={e => setVariantOrigPrices(p => ({ ...p, [color]: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">Количество</label>
                      <input className="input" type="number" placeholder="0"
                        value={variantStocks[color] || ""}
                        onChange={e => setVariantStocks(p => ({ ...p, [color]: e.target.value }))} />
                    </div>
                  </div>

                  {/* Photos per color */}
                  <ColorPhotoBox
                    key={color}
                    color={color}
                    photos={colorPhotos[color] || []}
                    onAdd={addColorPhotos}
                    onRemove={removeColorPhoto}
                  />
                </div>
              );
            })}

            {/* Add color */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowColorPicker(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                {showColorPicker ? "Скрыть палитру" : "Добавить цвет / модель"}
              </button>

              {showColorPicker && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500">Выберите цвет:</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map(c => {
                      const already = colors.includes(c.name);
                      return (
                        <button key={c.name} type="button"
                          onClick={() => already ? removeColor(c.name) : addColor(c.name)}
                          className={clsx(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition",
                            already
                              ? "border-blue-400 bg-blue-50 text-blue-700 font-semibold"
                              : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                          )}>
                          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: c.hex }} />
                          {c.name}
                          {already && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-gray-200">
                    <input
                      className="input text-sm flex-1"
                      value={colorInput}
                      onChange={e => setColorInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { addColor(colorInput); } }}
                      placeholder="Своё название (напр: Морской, Хаки 2024)..."
                    />
                    <button type="button" onClick={() => addColor(colorInput)}
                      disabled={!colorInput.trim()}
                      className="btn-primary px-3 py-2 disabled:opacity-40">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Photos (general, when no colors) ── */}
        {!hasVariants && (
          <Section title="Фотографии" icon={ImageIcon}>
            <div className="pt-2 space-y-3">
              <p className="text-xs text-gray-500">Первое фото будет главным. Нажмите на два фото чтобы поменять их местами.</p>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className={clsx("relative w-20 h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition",
                      swapIdx === i ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent hover:border-gray-200"
                    )}
                    onClick={() => tapPhoto(i)}
                  >
                    <img src={p.preview} className="w-full h-full object-cover" alt="" />
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[9px] text-center py-0.5">Главное</span>
                    )}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <div
                    onClick={() => photoRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition gap-1"
                  >
                    <Plus className="w-5 h-5 text-gray-300" />
                    <span className="text-[10px] text-gray-400">Добавить</span>
                  </div>
                )}
              </div>
              <input ref={photoRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => { addPhotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            </div>
          </Section>
        )}

        {/* ── Sizes ── */}
        <Section title="Размеры" icon={Tag} defaultOpen={false}>
          <div className="pt-2 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Одежда</p>
              <div className="flex flex-wrap gap-2">
                {SIZE_PRESETS.map(s => (
                  <button key={s} type="button"
                    onClick={() => setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    className={clsx("px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition",
                      sizes.includes(s) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Обувь</p>
              <div className="flex flex-wrap gap-2">
                {SHOE_SIZES.map(s => (
                  <button key={s} type="button"
                    onClick={() => setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    className={clsx("px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition",
                      sizes.includes(s) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Custom size input */}
            <div className="flex gap-2">
              <input className="input flex-1" value={sizeInput} onChange={e => setSizeInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && sizeInput.trim()) { setSizes(p => [...new Set([...p, sizeInput.trim()])]); setSizeInput(""); }}}
                placeholder="Свой размер... (Enter)" />
            </div>
            {sizes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 font-medium self-center">Выбрано:</span>
                {sizes.map(s => (
                  <span key={s} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {s}
                    <button type="button" onClick={() => setSizes(p => p.filter(x => x !== s))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ── Price & Stock (when no variants) ── */}
        {!hasVariants && (
          <Section title="Цена и остаток" icon={Star}>
            <div className="pt-2 grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Цена (сом.) *</label>
                <input className={clsx("input", errors.price && "border-red-300")} type="number"
                  value={form.price} onChange={e => set("price", e.target.value)} placeholder="0" />
                {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Старая цена</label>
                <input className="input" type="number" value={form.original_price}
                  onChange={e => set("original_price", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Количество (шт.) *</label>
                <input className={clsx("input", errors.stock && "border-red-300")} type="number"
                  value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="0" />
                {errors.stock && <p className="text-xs text-red-500">{errors.stock}</p>}
              </div>
            </div>
          </Section>
        )}

        {/* ── Details ── */}
        <Section title="Детали товара" icon={Package} defaultOpen={false}>
          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Бренд</label>
                <input className="input" value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="Nike, Apple..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Артикул (SKU)</label>
                <div className="flex gap-1">
                  <input className="input font-mono text-xs flex-1" value={form.sku} onChange={e => set("sku", e.target.value)} />
                  <button type="button" onClick={() => set("sku", genSKU())}
                    className="px-2 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition flex-shrink-0" title="Сгенерировать">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Штрихкод (EAN)</label>
                <input className="input font-mono text-xs" value={form.barcode} onChange={e => set("barcode", e.target.value)} placeholder="4607..." inputMode="numeric" />
              </div>
            </div>

            {/* Custom attributes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Характеристики</label>
              <div className="space-y-2">
                {attrs.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input flex-1" value={a.key} onChange={e => setAttrs(p => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                      placeholder="Материал, Страна..." />
                    <input className="input flex-1" value={a.value} onChange={e => setAttrs(p => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                      placeholder="100% хлопок, Китай..." />
                    <button type="button" onClick={() => setAttrs(p => p.filter((_, j) => j !== i))}
                      className="w-9 h-10 flex items-center justify-center text-gray-300 hover:text-red-400 transition flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setAttrs(p => [...p, { key: "", value: "" }])}
                className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Добавить характеристику
              </button>
            </div>

            {/* Shop tag */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Метка магазина</label>
              <input className="input" value={form.shop_tag} onChange={e => set("shop_tag", e.target.value)} placeholder="Футболки, Летняя коллекция..." />
              <p className="text-xs text-gray-400">Помогает фильтровать товары в вашем магазине</p>
            </div>
          </div>
        </Section>

        {/* ── Delivery ── */}
        <Section title="Доставка" icon={Truck} defaultOpen={false}>
          <div className="pt-2 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Способ доставки</label>
              <div className="flex gap-2">
                {DELIVERY_MODES.map(m => (
                  <button key={m.value} type="button"
                    onClick={() => set("delivery_mode", m.value)}
                    className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition",
                      form.delivery_mode === m.value ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                    )}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Доставка по городу (сом.)</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => set("delivery_price", "0")}
                    className={clsx("px-3 py-2 rounded-xl text-sm font-semibold border-2 transition whitespace-nowrap",
                      (!form.delivery_price || form.delivery_price === "0") ? "bg-green-500 border-green-500 text-white" : "bg-white border-gray-200 text-gray-600"
                    )}>
                    Бесплатно
                  </button>
                  <input className="input flex-1" type="number"
                    value={form.delivery_price === "0" ? "" : form.delivery_price}
                    onChange={e => set("delivery_price", e.target.value || "0")}
                    placeholder="Сумма..." />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">В другой город (сом.)</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => set("delivery_price_other", "0")}
                    className={clsx("px-3 py-2 rounded-xl text-sm font-semibold border-2 transition whitespace-nowrap",
                      (!form.delivery_price_other || form.delivery_price_other === "0") ? "bg-green-500 border-green-500 text-white" : "bg-white border-gray-200 text-gray-600"
                    )}>
                    Бесплатно
                  </button>
                  <input className="input flex-1" type="number"
                    value={form.delivery_price_other === "0" ? "" : form.delivery_price_other}
                    onChange={e => set("delivery_price_other", e.target.value || "0")}
                    placeholder="Сумма..." />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Submit ── */}
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
        >
          {saving ? (
            <><RefreshCw className="w-5 h-5 animate-spin" /> {uploadStep || "Сохраняем..."}</>
          ) : (
            <><Check className="w-5 h-5" /> {isEdit ? "Сохранить изменения" : "Опубликовать товар"}</>
          )}
        </button>
      </div>

      {/* ── RIGHT: Preview ── */}
      <div className="w-72 flex-shrink-0 sticky top-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500">Предпросмотр карточки</p>
          </div>

          {/* Preview image */}
          <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
            {(() => {
              const previewImg = hasVariants
                ? (colors[0] && colorPhotos[colors[0]]?.[0]?.preview)
                : photos[0]?.preview;
              return previewImg
                ? <img src={previewImg} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <span className="text-5xl">📦</span>
                    <span className="text-xs text-gray-400">Нет фото</span>
                  </div>;
            })()}

            {/* Badges */}
            {form.original_price && parseFloat(form.original_price) > price && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                -{Math.round((1 - price / parseFloat(form.original_price)) * 100)}%
              </div>
            )}
          </div>

          <div className="p-3 space-y-1">
            {form.brand && <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">{form.brand}</p>}
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{form.title || "Название товара"}</p>
            <div className="flex items-center gap-2 pt-1">
              <p className="text-lg font-black text-blue-600">{price > 0 ? `${price.toLocaleString()} сом.` : "— сом."}</p>
              {form.original_price && parseFloat(form.original_price) > price && (
                <p className="text-xs text-gray-400 line-through">{parseFloat(form.original_price).toLocaleString()}</p>
              )}
            </div>

            {/* Colors preview */}
            {colors.length > 0 && (
              <div className="flex gap-1 pt-1 flex-wrap">
                {colors.map(c => {
                  const hex = COLOR_PALETTE.find(x => x.name === c)?.hex ?? "#9ca3af";
                  return <div key={c} title={c} className="w-4 h-4 rounded-full border border-gray-200" style={{ background: hex }} />;
                })}
              </div>
            )}

            {/* Sizes preview */}
            {sizes.length > 0 && (
              <div className="flex gap-1 flex-wrap pt-1">
                {sizes.slice(0, 5).map(s => (
                  <span key={s} className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{s}</span>
                ))}
                {sizes.length > 5 && <span className="text-[10px] text-gray-400">+{sizes.length - 5}</span>}
              </div>
            )}

            {/* Delivery */}
            <p className="text-[10px] text-green-600 font-semibold pt-1">
              {!form.delivery_price || form.delivery_price === "0" ? "✓ Бесплатная доставка" : `Доставка ${parseInt(form.delivery_price).toLocaleString()} сом.`}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 text-sm mb-2">Сводка</p>
          <div className="flex justify-between"><span>Цветов</span><span className="font-semibold text-gray-800">{colors.length || "—"}</span></div>
          <div className="flex justify-between"><span>Размеров</span><span className="font-semibold text-gray-800">{sizes.length || "—"}</span></div>
          <div className="flex justify-between"><span>Фото</span>
            <span className="font-semibold text-gray-800">
              {hasVariants ? `${Object.values(colorPhotos).reduce((s, p) => s + p.length, 0)} шт.` : `${photos.length} шт.`}
            </span>
          </div>
          {hasVariants && (
            <div className="flex justify-between">
              <span>Общий остаток</span>
              <span className="font-semibold text-gray-800">
                {colors.reduce((s, c) => s + (parseInt(variantStocks[c]) || 0), 0)} шт.
              </span>
            </div>
          )}
          <div className="flex justify-between"><span>Статус</span>
            <span className={clsx("font-semibold", form.is_active ? "text-green-600" : "text-gray-400")}>
              {form.is_active ? "Активен" : "Скрыт"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
