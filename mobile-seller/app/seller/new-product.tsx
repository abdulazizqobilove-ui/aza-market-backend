import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, Pressable, Alert, Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft, Plus, X, Camera, Trash2, ChevronRight,
  Search, Eye, AlertTriangle, TrendingUp, RotateCcw, Check,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import api, { API_URL } from "@/lib/api";
import { useThemeColors } from "@/lib/theme";

const P = "#2563EB";
const COMMISSION = 0.1;
const DRAFT_KEY = "draft_new_product";
const LOW_STOCK = 5;
const { width: SW } = Dimensions.get("window");

interface Category { id: number; name: string; slug: string; parent_id?: number | null; }
interface Attr { key: string; value: string; }
interface Photo { uri: string; name: string; type: string; }

function genSKU() {
  return "SKU-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

const FIELD_LABELS: Record<string, string> = {
  title: "Название", price: "Цена", category_id: "Категория",
};

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
const SHOE_SIZES  = ["35","36","37","38","39","40","41","42","43","44","45","46"];

export const COLOR_PALETTE = [
  { name: "Красный",     hex: "#ef4444" },
  { name: "Розовый",     hex: "#ec4899" },
  { name: "Оранжевый",   hex: "#f97316" },
  { name: "Жёлтый",      hex: "#eab308" },
  { name: "Зелёный",     hex: "#22c55e" },
  { name: "Голубой",     hex: "#38bdf8" },
  { name: "Синий",       hex: "#3b82f6" },
  { name: "Фиолетовый",  hex: "#2563EB" },
  { name: "Чёрный",      hex: "#111827" },
  { name: "Тёмно-серый", hex: "#6b7280" },
  { name: "Серый",       hex: "#d1d5db" },
  { name: "Белый",       hex: "#f9fafb" },
  { name: "Коричневый",  hex: "#92400e" },
  { name: "Бежевый",     hex: "#d4b896" },
  { name: "Бордовый",    hex: "#881337" },
  { name: "Хаки",        hex: "#84754e" },
  { name: "Золотой",     hex: "#d97706" },
  { name: "Серебряный",  hex: "#9ca3af" },
];

export default function NewProductScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [roots, setRoots] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [selectedRoot, setSelectedRoot] = useState<Category | null>(null);
  const [catSearch, setCatSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [attrs, setAttrs] = useState<Attr[]>([{ key: "", value: "" }]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [colorPhotos, setColorPhotos] = useState<Record<string, Photo[]>>({});
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});
  const [variantOrigPrices, setVariantOrigPrices] = useState<Record<string, string>>({});
  const [variantStocks, setVariantStocks] = useState<Record<string, string>>({});
  const [variantInput, setVariantInput] = useState("");
  const [variantHex, setVariantHex] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", about: "", price: "", original_price: "",
    stock: "", brand: "", category_id: "", sku: genSKU(), shop_tag: "", barcode: "",
    delivery_price: "", delivery_price_other: "", delivery_mode: "service",
  });

  const draftTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load categories
  useEffect(() => {
    api.get<Category[]>("/products/categories").then((r) => setRoots(r.data)).catch(() => {});
  }, []);

  // Check for draft on mount
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        if (draft.form?.title || draft.photos?.length > 0) setHasDraft(true);
      } catch {}
    });
  }, []);

  const restoreDraft = async () => {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.form) setForm(draft.form);
      if (draft.attrs) setAttrs(draft.attrs);
      if (draft.photos) setPhotos(draft.photos);
      if (draft.sizes) setSizes(draft.sizes);
      if (draft.colors) setColors(draft.colors);
      if (draft.selectedRoot) {
        setSelectedRoot(draft.selectedRoot);
        const r = await api.get<Category[]>(`/products/categories/${draft.selectedRoot.id}/subcategories`).catch(() => ({ data: [] }));
        setSubs(r.data);
      }
      setHasDraft(false);
      Toast.show({ type: "success", text1: "Черновик восстановлен" });
    } catch {}
  };

  const discardDraft = () => {
    AsyncStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  // Autosave draft
  const saveDraft = useCallback((f: typeof form, a: Attr[], p: Photo[], root: Category | null, sz: string[], cl: string[]) => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ form: f, attrs: a, photos: p, selectedRoot: root, sizes: sz, colors: cl }));
    }, 800);
  }, []);

  const set = (key: string, val: string) => {
    const next = { ...form, [key]: val };
    setForm(next);
    saveDraft(next, attrs, photos, selectedRoot, sizes, colors);
    // Clear error on change
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const hasVariants = colors.length > 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Введите название";
    if (!hasVariants && (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0))
      e.price = "Введите корректную цену";
    if (hasVariants && colors.some((c) => !variantPrices[c] || parseFloat(variantPrices[c]) <= 0))
      e.price = "Укажите цену для каждого варианта";
    if (!form.category_id) e.category_id = "Выберите категорию";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const selectRoot = async (cat: Category) => {
    setSelectedRoot(cat);
    const next = { ...form, category_id: String(cat.id) };
    setForm(next);
    setSubs([]);
    saveDraft(next, attrs, photos, cat, sizes, colors);
    try {
      const r = await api.get<Category[]>(`/products/categories/${cat.id}/subcategories`);
      setSubs(r.data);
    } catch {}
  };

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Toast.show({ type: "error", text1: "Нет доступа к галерее" }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.85,
    });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.mimeType || "image/jpeg",
      }));
      const next = [...photos, ...picked].slice(0, 8);
      setPhotos(next);
      saveDraft(form, attrs, next, selectedRoot, sizes, colors);
    }
  };

  const handlePhotoTap = (idx: number) => {
    if (swapIdx === null) {
      setSwapIdx(idx);
    } else if (swapIdx === idx) {
      setSwapIdx(null);
    } else {
      // Swap
      const next = [...photos];
      [next[swapIdx], next[idx]] = [next[idx], next[swapIdx]];
      setPhotos(next);
      saveDraft(form, attrs, next, selectedRoot, sizes, colors);
      setSwapIdx(null);
    }
  };

  const removePhoto = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    saveDraft(form, attrs, next, selectedRoot, sizes, colors);
    if (swapIdx === idx) setSwapIdx(null);
  };

  const pickColorPhotos = async (colorName: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Toast.show({ type: "error", text1: "Нет доступа к галерее" }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.85,
    });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.mimeType || "image/jpeg",
      }));
      setColorPhotos((prev) => {
        const existing = prev[colorName] || [];
        return { ...prev, [colorName]: [...existing, ...picked].slice(0, 8) };
      });
    }
  };

  const removeColorPhoto = (colorName: string, idx: number) => {
    setColorPhotos((prev) => ({ ...prev, [colorName]: (prev[colorName] || []).filter((_, i) => i !== idx) }));
  };

  const setAttr = (i: number, field: "key" | "value", val: string) => {
    const next = attrs.map((a, idx) => idx === i ? { ...a, [field]: val } : a);
    setAttrs(next);
    saveDraft(form, next, photos, selectedRoot, sizes, colors);
  };
  const addAttr = () => {
    const next = [...attrs, { key: "", value: "" }];
    setAttrs(next);
    saveDraft(form, next, photos, selectedRoot, sizes, colors);
  };
  const removeAttr = (i: number) => {
    const next = attrs.filter((_, idx) => idx !== i);
    setAttrs(next);
    saveDraft(form, next, photos, selectedRoot, sizes, colors);
  };

  const uploadPhotos = (productId: number, photosArr: Photo[], variantIndices?: number[]) =>
    new Promise<void>((resolve) => {
      AsyncStorage.getItem("seller:token").then((token) => {
        const fd = new FormData();
        photosArr.forEach((p) => fd.append("files", { uri: p.uri, name: p.name, type: p.type } as any));
        if (variantIndices && variantIndices.length > 0)
          fd.append("variant_indices", JSON.stringify(variantIndices));
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/api/products/${productId}/images`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.responseType = "json";
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            const detail = xhr.response?.detail || `Ошибка ${xhr.status}`;
            Toast.show({ type: "error", text1: "Фото не загрузились", text2: detail });
            resolve();
          }
        };
        xhr.onerror = () => {
          Toast.show({ type: "error", text1: "Нет соединения при загрузке фото" });
          resolve();
        };
        xhr.send(fd);
      });
    });

  const submit = async () => {
    if (!validate()) {
      Toast.show({ type: "error", text1: "Исправьте ошибки в форме" }); return;
    }
    setSaving(true);
    setUploadProgress(0);
    try {
      const attributes: Record<string, string> = {};
      attrs.forEach(({ key, value }) => { if (key.trim() && value.trim() && key.trim() !== "Размер" && key.trim() !== "Цвет") attributes[key.trim()] = value.trim(); });
      if (sizes.length > 0) attributes["Размер"] = sizes.join(",");
      if (colors.length > 0) attributes["Цвет"] = colors.join(",");

      const variantsArr = hasVariants
        ? colors.map((name, i) => ({
            index: i,
            name,
            price: parseFloat(variantPrices[name]) || 0,
            original_price: variantOrigPrices[name] ? parseFloat(variantOrigPrices[name]) : undefined,
            stock: variantStocks[name] ? parseInt(variantStocks[name]) : 0,
          }))
        : undefined;

      // When variants exist — derive main price/stock automatically
      const mainPrice = hasVariants
        ? Math.min(...colors.map((n) => parseFloat(variantPrices[n]) || 0))
        : parseFloat(form.price);
      const mainStock = hasVariants
        ? colors.reduce((sum, n) => sum + (parseInt(variantStocks[n]) || 0), 0)
        : parseInt(form.stock || "0");

      const res = await api.post<{ id: number }>("/products", {
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
        shop_tag: form.shop_tag.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        delivery_price: parseFloat(form.delivery_price) || 0,
        delivery_price_other: parseFloat(form.delivery_price_other) || 0,
        delivery_mode: form.delivery_mode,
      });

      const photosToUpload = colors.length > 0
        ? colors.flatMap((c) => colorPhotos[c] || [])
        : photos;
      const variantIndices = colors.length > 0
        ? colors.flatMap((c, i) => (colorPhotos[c] || []).map(() => i))
        : [];
      if (photosToUpload.length > 0) {
        Toast.show({ type: "info", text1: "Загружаем фото..." });
        await uploadPhotos(res.data.id, photosToUpload, variantIndices);
      }

      await AsyncStorage.removeItem(DRAFT_KEY);
      Toast.show({ type: "success", text1: "Товар добавлен!" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Не удалось добавить товар" });
    } finally { setSaving(false); setUploadProgress(0); }
  };

  // Computed
  const price = parseFloat(form.price) || 0;
  const originalPrice = parseFloat(form.original_price) || 0;
  const commission = price * COMMISSION;
  const profit = price - commission;
  const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
  const stock = parseInt(form.stock || "0");
  const lowStock = stock > 0 && stock <= LOW_STOCK;

  const filteredRoots = catSearch.trim()
    ? roots.filter((cat) => cat.name.toLowerCase().includes(catSearch.toLowerCase()))
    : roots;
  const filteredSubs = catSearch.trim()
    ? subs.filter((cat) => cat.name.toLowerCase().includes(catSearch.toLowerCase()))
    : subs;

  const selectedCatName = subs.find((s) => s.id === parseInt(form.category_id))?.name
    ?? selectedRoot?.name ?? "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Новый товар</Text>
        <TouchableOpacity onPress={() => setShowPreview(true)} style={{ width: 36, height: 36, backgroundColor: "#EFF6FF", borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 4 }}>
          <Eye size={18} color={P} />
        </TouchableOpacity>
      </View>

      {/* Draft banner */}
      {hasDraft && (
        <View style={{ backgroundColor: "#fef3c7", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}>
          <RotateCcw size={16} color="#d97706" />
          <Text style={{ flex: 1, fontSize: 13, color: "#92400e", fontWeight: "600" }}>Найден незавершённый черновик</Text>
          <TouchableOpacity onPress={restoreDraft} style={{ backgroundColor: "#d97706", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Восстановить</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={discardDraft}>
            <X size={18} color="#92400e" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">

        {/* Photos */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Фотографии</Text>

          {colors.length > 0 ? (
            <View style={{ backgroundColor: "#EFF6FF", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Camera size={18} color={P} />
              <Text style={{ fontSize: 13, color: P, fontWeight: "600", flex: 1 }}>Фото добавляются по цветам — смотри раздел «Размеры и цвета» ниже</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                <TouchableOpacity onPress={pickPhotos} style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: "#EFF6FF", borderWidth: 2, borderStyle: "dashed", borderColor: "#93C5FD", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={24} color={P} />
                  <Text style={{ fontSize: 11, color: P, marginTop: 4, fontWeight: "600" }}>Добавить</Text>
                </TouchableOpacity>
                {photos.map((p, i) => (
                  <TouchableOpacity key={i} onPress={() => handlePhotoTap(i)} style={{ width: 84, height: 84, borderRadius: 16, overflow: "hidden", borderWidth: swapIdx === i ? 3 : 0, borderColor: P }}>
                    <Image source={{ uri: p.uri }} style={{ width: 84, height: 84 }} contentFit="cover" />
                    <TouchableOpacity onPress={() => setPreviewPhoto(p.uri)} style={{ position: "absolute", top: 4, left: 4, width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                      <Eye size={11} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removePhoto(i)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                      <X size={12} color="white" />
                    </TouchableOpacity>
                    {i === 0 && <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(139,92,246,0.85)", paddingVertical: 3 }}><Text style={{ color: "#fff", fontSize: 10, textAlign: "center", fontWeight: "600" }}>Главное</Text></View>}
                    {swapIdx !== null && swapIdx !== i && (
                      <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(139,92,246,0.25)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>↕</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {photos.length > 1 && swapIdx === null && (
                <Text style={{ fontSize: 11, color: c.textMuted }}>Нажмите на фото чтобы поменять местами · {photos.length}/8</Text>
              )}
            </>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: c.textMuted }}>Загрузка фото...</Text>
                <Text style={{ fontSize: 12, color: P, fontWeight: "600" }}>{uploadProgress}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: c.iconBg, borderRadius: 3 }}>
                <View style={{ height: 6, backgroundColor: P, borderRadius: 3, width: `${uploadProgress}%` }} />
              </View>
            </View>
          )}
        </View>

        {/* Basic info */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Основное</Text>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: errors.title ? "#ef4444" : c.textSub }}>Название *</Text>
            <TextInput
              value={form.title} onChangeText={(v) => set("title", v)}
              placeholder="Введите название товара" placeholderTextColor={c.textMuted}
              style={{ backgroundColor: errors.title ? "#fef2f2" : c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, borderWidth: errors.title ? 1 : 0, borderColor: "#fca5a5" }}
            />
            {errors.title && <Text style={{ fontSize: 11, color: "#ef4444" }}>{errors.title}</Text>}
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Краткое описание</Text>
            <TextInput value={form.description} onChangeText={(v) => set("description", v)} placeholder="Короткое описание..." placeholderTextColor={c.textMuted} multiline numberOfLines={3} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, textAlignVertical: "top", minHeight: 72 }} />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Бренд</Text>
            <TextInput value={form.brand} onChangeText={(v) => set("brand", v)} placeholder="Samsung, Nike, Adidas..." placeholderTextColor={c.textMuted} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
          </View>

          {/* SKU */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: c.textSub }}>SKU (артикул)</Text>
              <TextInput value={form.sku} onChangeText={(v) => set("sku", v)} placeholderTextColor={c.textMuted} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, fontFamily: "monospace" }} />
            </View>
            <TouchableOpacity onPress={() => set("sku", genSKU())} style={{ marginTop: 18, width: 44, height: 46, backgroundColor: "#EFF6FF", borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
              <RotateCcw size={16} color={P} />
            </TouchableOpacity>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Штрихкод (EAN/UPC)</Text>
            <TextInput
              value={form.barcode}
              onChangeText={(v) => set("barcode", v)}
              placeholder="Например: 4607001819008"
              placeholderTextColor={c.textMuted}
              keyboardType="numeric"
              style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, fontFamily: "monospace" }}
            />
          </View>
        </View>

        {/* Category */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: errors.category_id ? "#ef4444" : c.text }}>Категория *</Text>

          {/* Search */}
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 12, gap: 8 }}>
            <Search size={16} color={c.textMuted} />
            <TextInput value={catSearch} onChangeText={setCatSearch} placeholder="Поиск категории..." placeholderTextColor={c.textMuted} style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: c.text }} />
            {catSearch.length > 0 && <TouchableOpacity onPress={() => setCatSearch("")}><X size={16} color={c.textMuted} /></TouchableOpacity>}
          </View>

          <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600" }}>РАЗДЕЛ</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filteredRoots.map((cat) => {
              const active = selectedRoot?.id === cat.id;
              return (
                <TouchableOpacity key={cat.id} onPress={() => selectRoot(cat)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? P : c.iconBg, borderWidth: active ? 0 : 1, borderColor: c.border }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : c.textSub }}>{cat.name}</Text>
                  {active && subs.length > 0 && <ChevronRight size={13} color="rgba(255,255,255,0.7)" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredSubs.length > 0 && (
            <>
              <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600" }}>ПОДКАТЕГОРИЯ</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {filteredSubs.map((cat) => {
                  const active = form.category_id === String(cat.id);
                  return (
                    <TouchableOpacity key={cat.id} onPress={() => set("category_id", String(cat.id))} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? P : c.iconBg, borderWidth: active ? 0 : 1, borderColor: c.border }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : c.textSub }}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {form.category_id && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", borderRadius: 12, padding: 10 }}>
              <Check size={14} color="#16a34a" />
              <Text style={{ fontSize: 13, color: "#16a34a", fontWeight: "600" }}>
                {selectedRoot?.name}{filteredSubs.find(s => String(s.id) === form.category_id) ? ` → ${filteredSubs.find(s => String(s.id) === form.category_id)?.name}` : ""}
              </Text>
            </View>
          )}
          {errors.category_id && <Text style={{ fontSize: 11, color: "#ef4444" }}>{errors.category_id}</Text>}
        </View>

        {/* Price */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, opacity: hasVariants ? 0.5 : 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Цена</Text>
            {hasVariants && (
              <View style={{ backgroundColor: "#fef3c7", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#d97706" }}>⚡ Задаётся в вариантах</Text>
              </View>
            )}
          </View>

          {hasVariants ? (
            <View style={{ backgroundColor: "#fef9c3", borderRadius: 14, padding: 12, gap: 4 }}>
              <Text style={{ fontSize: 13, color: "#92400e", fontWeight: "600" }}>
                Цена и остаток рассчитываются автоматически из вариантов (цветов) ниже
              </Text>
              <Text style={{ fontSize: 12, color: "#a16207" }}>
                Мин. цена: {colors.length > 0 ? Math.min(...colors.map((n) => parseFloat(variantPrices[n]) || 0)).toLocaleString() : "0"} сом ·
                Всего на складе: {colors.reduce((s, n) => s + (parseInt(variantStocks[n]) || 0), 0)} шт.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, color: errors.price ? "#ef4444" : c.textSub }}>Цена продажи *</Text>
                  <TextInput
                    value={form.price} onChangeText={(v) => set("price", v)}
                    placeholder="0" placeholderTextColor={c.textMuted} keyboardType="numeric"
                    style={{ backgroundColor: errors.price ? "#fef2f2" : c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, borderWidth: errors.price ? 1 : 0, borderColor: "#fca5a5" }}
                  />
                  {errors.price && <Text style={{ fontSize: 11, color: "#ef4444" }}>{errors.price}</Text>}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, color: c.textSub }}>Старая цена {discount > 0 ? `(-${discount}%)` : ""}</Text>
                  <TextInput value={form.original_price} onChangeText={(v) => set("original_price", v)} placeholder="0" placeholderTextColor={c.textMuted} keyboardType="numeric" style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
                </View>
              </View>

              {price > 0 && (
                <View style={{ backgroundColor: "#f0fdf4", borderRadius: 14, padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <TrendingUp size={14} color="#16a34a" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#166534" }}>Расчёт прибыли</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>Цена продажи</Text>
                    <Text style={{ fontSize: 12, color: "#111827", fontWeight: "600" }}>{price.toLocaleString()} сом</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>Комиссия (10%)</Text>
                    <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "600" }}>-{commission.toLocaleString()} сом</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: "#dcfce7", marginVertical: 2 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: "#166534", fontWeight: "700" }}>Ваша прибыль</Text>
                    <Text style={{ fontSize: 13, color: "#16a34a", fontWeight: "800" }}>{profit.toLocaleString()} сом</Text>
                  </View>
                </View>
              )}

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, color: c.textSub }}>Остаток на складе</Text>
                <TextInput value={form.stock} onChangeText={(v) => set("stock", v)} placeholder="0" placeholderTextColor={c.textMuted} keyboardType="numeric" style={{ backgroundColor: lowStock ? "#fff7ed" : c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, borderWidth: lowStock ? 1 : 0, borderColor: "#fed7aa" }} />
                {lowStock && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={13} color="#f59e0b" />
                    <Text style={{ fontSize: 11, color: "#d97706", fontWeight: "600" }}>Мало товара на складе — добавьте запас</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Sizes & Colors */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Размеры и цвета</Text>

          {/* Sizes */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600" }}>РАЗМЕРЫ (одежда)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SIZE_PRESETS.map((s) => {
                const sel = sizes.includes(s);
                return (
                  <TouchableOpacity key={s} onPress={() => setSizes((prev) => sel ? prev.filter((x) => x !== s) : [...prev, s])}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: sel ? P : c.iconBg, borderWidth: sel ? 0 : 1, borderColor: c.border }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? "#fff" : c.textSub }}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600", marginTop: 4 }}>РАЗМЕРЫ (обувь)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SHOE_SIZES.map((s) => {
                const sel = sizes.includes(s);
                return (
                  <TouchableOpacity key={s} onPress={() => setSizes((prev) => sel ? prev.filter((x) => x !== s) : [...prev, s])}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: sel ? P : c.iconBg, borderWidth: sel ? 0 : 1, borderColor: c.border }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? "#fff" : c.textSub }}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={sizeInput} onChangeText={setSizeInput}
                placeholder="Свой размер (42, XXL...)" placeholderTextColor={c.textMuted}
                style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: c.text }}
              />
              <TouchableOpacity
                onPress={() => { const v = sizeInput.trim(); if (v && !sizes.includes(v)) setSizes((p) => [...p, v]); setSizeInput(""); }}
                style={{ width: 44, height: 44, backgroundColor: "#EFF6FF", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                <Plus size={18} color={P} />
              </TouchableOpacity>
            </View>
            {sizes.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, backgroundColor: "#EFF6FF", borderRadius: 12, padding: 10 }}>
                {sizes.map((s) => (
                  <TouchableOpacity key={s} onPress={() => setSizes((p) => p.filter((x) => x !== s))}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: P, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{s}</Text>
                    <X size={11} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Variants (colors / models) */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600" }}>ЦВЕТА И МОДЕЛИ</Text>

            {/* Add variant form */}
            <View style={{ backgroundColor: c.iconBg, borderRadius: 14, padding: 12, gap: 10 }}>
              <Text style={{ fontSize: 12, color: c.textSub }}>Выбери цвет или введи название модели</Text>
              {/* Compact color palette */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {COLOR_PALETTE.map((col) => {
                  const picked = variantHex === col.hex;
                  const isLight = col.hex === "#f9fafb" || col.hex === "#d1d5db" || col.hex === "#d4b896";
                  return (
                    <TouchableOpacity key={col.name} onPress={() => {
                      if (picked) { setVariantHex(null); setVariantInput(""); }
                      else { setVariantHex(col.hex); setVariantInput(col.name); }
                    }} style={{ alignItems: "center", gap: 2 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: col.hex, borderWidth: picked ? 3 : 1, borderColor: picked ? P : isLight ? "#e5e7eb" : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {picked && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isLight ? "#374151" : "#fff" }} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {/* Name input + add button */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 12, gap: 8 }}>
                  {variantHex && (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: variantHex }} />
                  )}
                  <TextInput
                    value={variantInput}
                    onChangeText={setVariantInput}
                    placeholder="Название: Чёрный, Nike Shadow..."
                    placeholderTextColor={c.textMuted}
                    style={{ flex: 1, paddingVertical: 10, fontSize: 13, color: c.text }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const name = variantInput.trim();
                    if (!name || colors.includes(name)) return;
                    setColors((prev) => [...prev, name]);
                    setVariantInput("");
                    setVariantHex(null);
                  }}
                  style={{ width: 44, height: 44, backgroundColor: P, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Added variants with photo strips */}
            {colors.length > 0 && (
              <View style={{ gap: 10 }}>
                {colors.map((variantName) => {
                  const paletteColor = COLOR_PALETTE.find((col) => col.name === variantName);
                  const hex = paletteColor?.hex ?? null;
                  const isLight = hex === "#f9fafb" || hex === "#d1d5db" || hex === "#d4b896";
                  const cPhotos = colorPhotos[variantName] || [];
                  return (
                    <View key={variantName} style={{ borderRadius: 16, borderWidth: 1.5, borderColor: c.border, overflow: "hidden" }}>
                      {/* Header */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.iconBg }}>
                        {hex ? (
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: hex, borderWidth: isLight ? 1 : 0, borderColor: "#d1d5db" }} />
                        ) : (
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 9 }}>M</Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c.text, flex: 1 }}>{variantName}</Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{cPhotos.length} фото</Text>
                        <TouchableOpacity onPress={() => {
                          setColors((prev) => prev.filter((x) => x !== variantName));
                          setColorPhotos((prev) => { const n = { ...prev }; delete n[variantName]; return n; });
                        }} style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
                          <X size={16} color="#f87171" />
                        </TouchableOpacity>
                      </View>
                      {/* Price & Stock row */}
                      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 10, paddingTop: 8, backgroundColor: c.card }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: c.textMuted, marginBottom: 3 }}>Цена *</Text>
                          <TextInput
                            value={variantPrices[variantName] || ""}
                            onChangeText={(v) => setVariantPrices(p => ({ ...p, [variantName]: v }))}
                            placeholder="0"
                            keyboardType="numeric"
                            placeholderTextColor={c.textMuted}
                            style={{ backgroundColor: c.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: c.textMuted, marginBottom: 3 }}>Старая цена</Text>
                          <TextInput
                            value={variantOrigPrices[variantName] || ""}
                            onChangeText={(v) => setVariantOrigPrices(p => ({ ...p, [variantName]: v }))}
                            placeholder="0"
                            keyboardType="numeric"
                            placeholderTextColor={c.textMuted}
                            style={{ backgroundColor: c.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text }}
                          />
                        </View>
                        <View style={{ width: 72 }}>
                          <Text style={{ fontSize: 10, color: c.textMuted, marginBottom: 3 }}>Остаток</Text>
                          <TextInput
                            value={variantStocks[variantName] || ""}
                            onChangeText={(v) => setVariantStocks(p => ({ ...p, [variantName]: v }))}
                            placeholder="0"
                            keyboardType="numeric"
                            placeholderTextColor={c.textMuted}
                            style={{ backgroundColor: c.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text }}
                          />
                        </View>
                      </View>
                      {/* Photo strip */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, padding: 10 }}
                        style={{ backgroundColor: c.card }}>
                        <TouchableOpacity onPress={() => pickColorPhotos(variantName)}
                          style={{ width: 80, height: 80, borderRadius: 14, backgroundColor: "#EFF6FF", borderWidth: 2, borderStyle: "dashed", borderColor: "#93C5FD", alignItems: "center", justifyContent: "center" }}>
                          <Camera size={20} color={P} />
                          <Text style={{ fontSize: 10, color: P, marginTop: 3, fontWeight: "600" }}>Фото</Text>
                        </TouchableOpacity>
                        {cPhotos.map((p, i) => (
                          <View key={i} style={{ width: 80, height: 80, borderRadius: 14, overflow: "hidden" }}>
                            <Image source={{ uri: p.uri }} style={{ width: 80, height: 80 }} contentFit="cover" />
                            <TouchableOpacity onPress={() => setPreviewPhoto(p.uri)}
                              style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                              <Eye size={10} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeColorPhoto(variantName, i)}
                              style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                              <X size={11} color="white" />
                            </TouchableOpacity>
                            {i === 0 && (
                              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(139,92,246,0.85)", paddingVertical: 2 }}>
                                <Text style={{ color: "#fff", fontSize: 9, textAlign: "center", fontWeight: "600" }}>Главное</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Characteristics */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Характеристики</Text>
            <TouchableOpacity onPress={addAttr} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
              <Plus size={13} color={P} />
              <Text style={{ fontSize: 13, color: P, fontWeight: "600" }}>Добавить</Text>
            </TouchableOpacity>
          </View>
          {attrs.map((attr, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput value={attr.key} onChangeText={(v) => setAttr(i, "key", v)} placeholder="Параметр" placeholderTextColor={c.textMuted} style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: c.text }} />
              <TextInput value={attr.value} onChangeText={(v) => setAttr(i, "value", v)} placeholder="Значение" placeholderTextColor={c.textMuted} style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: c.text }} />
              {attrs.length > 1 && (
                <TouchableOpacity onPress={() => removeAttr(i)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={16} color="#f87171" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Text style={{ fontSize: 11, color: c.textMuted }}>Цвет → Синий · Размер → XL · Материал → Хлопок</Text>
        </View>

        {/* About */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>О товаре</Text>
          <TextInput value={form.about} onChangeText={(v) => set("about", v)} placeholder="Подробное описание: состав, особенности, уход..." placeholderTextColor={c.textMuted} multiline numberOfLines={5} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, textAlignVertical: "top", minHeight: 100 }} />
        </View>

        {/* Shop tag */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 10 }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Категория магазина</Text>
            <Text style={{ fontSize: 12, color: c.textMuted }}>Своя метка, чтобы покупатель мог фильтровать товары в вашем магазине</Text>
          </View>
          <TextInput
            value={form.shop_tag}
            onChangeText={(v) => set("shop_tag", v)}
            placeholder="Например: Футболки, Брюки, Летняя коллекция..."
            placeholderTextColor={c.textMuted}
            style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }}
          />
          <Text style={{ fontSize: 11, color: c.textMuted }}>Покупатель увидит эту метку как кнопку-фильтр в вашем магазине</Text>
        </View>

        {/* Delivery */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Доставка</Text>

          {/* Delivery mode */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Кто доставляет</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { key: "service", label: "🚛 Служба доставки" },
                { key: "self",    label: "🙋 Сам доставляю" },
              ].map((m) => (
                <TouchableOpacity key={m.key} onPress={() => set("delivery_mode", m.key)}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: "center",
                    backgroundColor: form.delivery_mode === m.key ? P + "18" : c.inputBg,
                    borderWidth: 1.5, borderColor: form.delivery_mode === m.key ? P : c.border }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: form.delivery_mode === m.key ? P : c.textSub }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* City delivery price */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Доставка по вашему городу</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => set("delivery_price", "0")}
                style={{ flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: "center",
                  backgroundColor: (!form.delivery_price || form.delivery_price === "0") ? "#dcfce7" : c.inputBg,
                  borderWidth: 1.5, borderColor: (!form.delivery_price || form.delivery_price === "0") ? "#16a34a" : c.border }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: (!form.delivery_price || form.delivery_price === "0") ? "#16a34a" : c.textSub }}>Бесплатно</Text>
              </TouchableOpacity>
              <TextInput
                value={form.delivery_price === "0" ? "" : form.delivery_price}
                onChangeText={(v) => set("delivery_price", v)}
                placeholder="Сумма, сом."
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, borderWidth: 1, borderColor: c.border }}
              />
            </View>
          </View>

          {/* Other city delivery price */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Доставка в другой город</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => set("delivery_price_other", "0")}
                style={{ flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: "center",
                  backgroundColor: (!form.delivery_price_other || form.delivery_price_other === "0") ? "#dcfce7" : c.inputBg,
                  borderWidth: 1.5, borderColor: (!form.delivery_price_other || form.delivery_price_other === "0") ? "#16a34a" : c.border }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: (!form.delivery_price_other || form.delivery_price_other === "0") ? "#16a34a" : c.textSub }}>Бесплатно</Text>
              </TouchableOpacity>
              <TextInput
                value={form.delivery_price_other === "0" ? "" : form.delivery_price_other}
                onChangeText={(v) => set("delivery_price_other", v)}
                placeholder="Сумма, сом."
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, borderWidth: 1, borderColor: c.border }}
              />
            </View>
          </View>
        </View>

        {/* Sticky Save */}
        <TouchableOpacity onPress={submit} disabled={saving} style={{ backgroundColor: P, borderRadius: 18, paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, shadowColor: P, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }}>
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Опубликовать товар</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Photo preview modal */}
      <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }} onPress={() => setPreviewPhoto(null)}>
          {previewPhoto && <Image source={{ uri: previewPhoto }} style={{ width: SW - 32, height: SW - 32, borderRadius: 20 }} contentFit="contain" />}
          <TouchableOpacity onPress={() => setPreviewPhoto(null)} style={{ position: "absolute", top: 60, right: 20, width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
            <X size={22} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* Live preview modal */}
      <Modal visible={showPreview} transparent animationType="slide" onRequestClose={() => setShowPreview(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setShowPreview(false)} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>Предпросмотр карточки</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}><X size={20} color={c.textMuted} /></TouchableOpacity>
          </View>
          {(() => {
            // First photo from main or any color variant
            const previewUri = photos[0]?.uri
              ?? Object.values(colorPhotos).flat()[0]?.uri
              ?? null;
            const previewPrice = hasVariants
              ? Math.min(...colors.map((n) => parseFloat(variantPrices[n]) || 0))
              : price;
            return (
              <View style={{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: "hidden", width: (SW - 56) / 2 }}>
                <View style={{ width: "100%", aspectRatio: 1, backgroundColor: c.inputBg }}>
                  {previewUri
                    ? <Image source={{ uri: previewUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Camera size={32} color={c.border} /></View>
                  }
                  {discount > 0 && (
                    <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#ef4444", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>-{discount}%</Text>
                    </View>
                  )}
                </View>
                <View style={{ padding: 10, gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }} numberOfLines={2}>{form.title || "Название товара"}</Text>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>{previewPrice > 0 ? `${previewPrice.toLocaleString()} сом` : "0 сом"}</Text>
                  {originalPrice > previewPrice && <Text style={{ fontSize: 12, color: c.textMuted, textDecorationLine: "line-through" }}>{originalPrice.toLocaleString()} сом</Text>}
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
