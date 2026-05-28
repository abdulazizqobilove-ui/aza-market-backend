import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Pressable, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, X, Camera, Plus, Trash2, Search, ChevronRight, Check, Eye, TrendingUp, AlertTriangle, RotateCcw } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import api, { Product, API_URL, imgUrl } from "@/lib/api";
import { useThemeColors } from "@/lib/theme";

const P = "#8B5CF6";
const COMMISSION = 0.1;
const LOW_STOCK = 5;
const { width: SW } = Dimensions.get("window");

interface Category { id: number; name: string; slug: string; parent_id?: number | null; }
interface Attr { key: string; value: string; }
interface NewPhoto { uri: string; name: string; type: string; }

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
const SHOE_SIZES  = ["35","36","37","38","39","40","41","42","43","44","45","46"];
const COLOR_PALETTE = [
  { name: "Красный", hex: "#ef4444" }, { name: "Розовый", hex: "#ec4899" },
  { name: "Оранжевый", hex: "#f97316" }, { name: "Жёлтый", hex: "#eab308" },
  { name: "Зелёный", hex: "#22c55e" }, { name: "Голубой", hex: "#38bdf8" },
  { name: "Синий", hex: "#3b82f6" }, { name: "Фиолетовый", hex: "#8b5cf6" },
  { name: "Чёрный", hex: "#111827" }, { name: "Тёмно-серый", hex: "#6b7280" },
  { name: "Серый", hex: "#d1d5db" }, { name: "Белый", hex: "#f9fafb" },
  { name: "Коричневый", hex: "#92400e" }, { name: "Бежевый", hex: "#d4b896" },
  { name: "Бордовый", hex: "#881337" }, { name: "Хаки", hex: "#84754e" },
  { name: "Золотой", hex: "#d97706" }, { name: "Серебряный", hex: "#9ca3af" },
];

function genSKU() {
  return "SKU-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [roots, setRoots] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [selectedRoot, setSelectedRoot] = useState<Category | null>(null);
  const [catSearch, setCatSearch] = useState("");

  const [existingImages, setExistingImages] = useState<{ id: number; url: string; is_main: boolean }[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [attrs, setAttrs] = useState<Attr[]>([{ key: "", value: "" }]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [colorNewPhotos, setColorNewPhotos] = useState<Record<string, NewPhoto[]>>({});
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});
  const [variantOrigPrices, setVariantOrigPrices] = useState<Record<string, string>>({});
  const [variantStocks, setVariantStocks] = useState<Record<string, string>>({});
  const [variantInput, setVariantInput] = useState("");
  const [variantHex, setVariantHex] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: "", description: "", about: "", price: "", original_price: "",
    stock: "", brand: "", category_id: "", sku: "", shop_tag: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productRes, rootsRes] = await Promise.all([
          api.get<Product>(`/products/${id}`),
          api.get<Category[]>("/products/categories"),
        ]);
        const p = productRes.data;
        setForm({
          title: p.title,
          description: p.description || "",
          about: p.about || "",
          price: String(p.price),
          original_price: p.original_price ? String(p.original_price) : "",
          stock: String(p.stock),
          brand: p.brand || "",
          category_id: String(p.category.id),
          sku: (p as any).sku || "",
          shop_tag: p.shop_tag || "",
        });
        setExistingImages(p.images);

        if (p.attributes && Object.keys(p.attributes).length > 0) {
          const attrEntries = Object.entries(p.attributes);
          setSizes(p.attributes["Размер"] ? String(p.attributes["Размер"]).split(",").map(s => s.trim()).filter(Boolean) : []);
          const colorList = p.attributes["Цвет"] ? String(p.attributes["Цвет"]).split(",").map(s => s.trim()).filter(Boolean) : [];
          setColors(colorList);
          const filtered = attrEntries.filter(([k]) => k !== "Размер" && k !== "Цвет");
          setAttrs(filtered.length > 0 ? filtered.map(([key, value]) => ({ key, value: String(value) })) : [{ key: "", value: "" }]);

          // Populate variant prices/stocks from variants array
          if (p.variants && Array.isArray(p.variants)) {
            const prices: Record<string, string> = {};
            const origPrices: Record<string, string> = {};
            const stocks: Record<string, string> = {};
            p.variants.forEach((v: any) => {
              if (v.name) {
                prices[v.name] = String(v.price || "");
                origPrices[v.name] = v.original_price ? String(v.original_price) : "";
                stocks[v.name] = String(v.stock || "");
              }
            });
            setVariantPrices(prices);
            setVariantOrigPrices(origPrices);
            setVariantStocks(stocks);
          }
        }

        const fetchedRoots = rootsRes.data;
        setRoots(fetchedRoots);

        const catId = p.category.id;
        const parentId = p.category.parent_id;
        if (parentId) {
          const root = fetchedRoots.find(r => r.id === parentId);
          if (root) {
            setSelectedRoot(root);
            const subsRes = await api.get<Category[]>(`/products/categories/${root.id}/subcategories`);
            setSubs(subsRes.data);
          }
        } else {
          const root = fetchedRoots.find(r => r.id === catId);
          if (root) {
            setSelectedRoot(root);
            const subsRes = await api.get<Category[]>(`/products/categories/${root.id}/subcategories`).catch(() => ({ data: [] }));
            setSubs(subsRes.data);
          }
        }
      } catch {
        Toast.show({ type: "error", text1: "Не удалось загрузить товар" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const set = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const hasVariants = colors.length > 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Введите название";
    if (!hasVariants && (!form.price || parseFloat(form.price) <= 0)) e.price = "Введите корректную цену";
    if (!form.category_id) e.category_id = "Выберите категорию";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const selectRoot = async (cat: Category) => {
    setSelectedRoot(cat);
    set("category_id", String(cat.id));
    setSubs([]);
    try {
      const r = await api.get<Category[]>(`/products/categories/${cat.id}/subcategories`);
      setSubs(r.data);
    } catch {}
  };

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Toast.show({ type: "error", text1: "Нет доступа к галерее" }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.mimeType || "image/jpeg",
      }));
      setNewPhotos((prev) => [...prev, ...picked].slice(0, 8 - existingImages.length));
    }
  };

  const handleNewPhotoTap = (idx: number) => {
    if (swapIdx === null) {
      setSwapIdx(idx);
    } else if (swapIdx === idx) {
      setSwapIdx(null);
    } else {
      const next = [...newPhotos];
      [next[swapIdx], next[idx]] = [next[idx], next[swapIdx]];
      setNewPhotos(next);
      setSwapIdx(null);
    }
  };

  const deleteExistingImage = async (imgId: number) => {
    try {
      await api.delete(`/products/${id}/images/${imgId}`);
      setExistingImages((prev) => prev.filter((i) => i.id !== imgId));
    } catch { Toast.show({ type: "error", text1: "Не удалось удалить фото" }); }
  };

  const pickColorNewPhotos = async (colorName: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Toast.show({ type: "error", text1: "Нет доступа к галерее" }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.mimeType || "image/jpeg",
      }));
      setColorNewPhotos((prev) => {
        const existing = prev[colorName] || [];
        return { ...prev, [colorName]: [...existing, ...picked].slice(0, 8) };
      });
    }
  };

  const removeColorNewPhoto = (colorName: string, idx: number) => {
    setColorNewPhotos((prev) => ({ ...prev, [colorName]: (prev[colorName] || []).filter((_, i) => i !== idx) }));
  };

  const uploadNewPhotos = (photosArr?: NewPhoto[]) =>
    new Promise<boolean>((resolve) => {
      AsyncStorage.getItem("token").then((token) => {
        const toUpload = photosArr ?? newPhotos;
        const fd = new FormData();
        toUpload.forEach((p) => fd.append("files", { uri: p.uri, name: p.name, type: p.type } as any));
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/api/products/${id}/images`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.responseType = "json";
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const updated = xhr.response;
            if (updated?.images) setExistingImages(updated.images);
            setNewPhotos([]);
            resolve(true);
          } else {
            const detail = xhr.response?.detail || `Ошибка ${xhr.status}`;
            Toast.show({ type: "error", text1: "Не удалось загрузить фото", text2: detail });
            resolve(false);
          }
        };
        xhr.onerror = () => {
          Toast.show({ type: "error", text1: "Нет соединения при загрузке фото" });
          resolve(false);
        };
        xhr.send(fd);
      });
    });

  const setAttr = (i: number, field: "key" | "value", val: string) =>
    setAttrs((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
  const addAttr = () => setAttrs((prev) => [...prev, { key: "", value: "" }]);
  const removeAttr = (i: number) => setAttrs((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!validate()) { Toast.show({ type: "error", text1: "Исправьте ошибки" }); return; }
    setSaving(true);
    setUploadProgress(0);
    try {
      const attributes: Record<string, string> = {};
      attrs.forEach(({ key, value }) => { if (key.trim() && value.trim() && key.trim() !== "Размер" && key.trim() !== "Цвет") attributes[key.trim()] = value.trim(); });
      if (sizes.length > 0) attributes["Размер"] = sizes.join(",");
      if (colors.length > 0) attributes["Цвет"] = colors.join(",");

      const variantsArr = hasVariants
        ? colors.map((name, i) => ({
            index: i, name,
            price: parseFloat(variantPrices[name]) || 0,
            original_price: variantOrigPrices[name] ? parseFloat(variantOrigPrices[name]) : undefined,
            stock: variantStocks[name] ? parseInt(variantStocks[name]) : 0,
          }))
        : undefined;

      const mainPrice = hasVariants
        ? Math.min(...colors.map((n) => parseFloat(variantPrices[n]) || 0))
        : parseFloat(form.price);
      const mainStock = hasVariants
        ? colors.reduce((sum, n) => sum + (parseInt(variantStocks[n]) || 0), 0)
        : parseInt(form.stock || "0");

      await api.patch(`/products/${id}`, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        about: form.about.trim() || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        price: mainPrice,
        original_price: form.original_price ? parseFloat(form.original_price) : undefined,
        stock: mainStock,
        brand: form.brand.trim() || undefined,
        category_id: parseInt(form.category_id),
        sku: form.sku.trim() || undefined,
        variants: variantsArr,
        shop_tag: form.shop_tag.trim() || undefined,
      });

      const photosToUpload = colors.length > 0
        ? colors.flatMap((col) => colorNewPhotos[col] || [])
        : newPhotos;
      if (photosToUpload.length > 0) {
        Toast.show({ type: "info", text1: "Загружаем фото..." });
        const ok = await uploadNewPhotos(photosToUpload);
        if (!ok) { setSaving(false); setUploadProgress(0); return; }
      }

      Toast.show({ type: "success", text1: "Товар обновлён!" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Не удалось обновить товар" });
    } finally { setSaving(false); setUploadProgress(0); }
  };

  const price = parseFloat(form.price) || 0;
  const originalPrice = parseFloat(form.original_price) || 0;
  const commission = price * COMMISSION;
  const profit = price - commission;
  const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
  const stock = parseInt(form.stock || "0");
  const lowStock = stock > 0 && stock <= LOW_STOCK;

  const c = useThemeColors();
  const filteredRoots = catSearch.trim() ? roots.filter((cat) => cat.name.toLowerCase().includes(catSearch.toLowerCase())) : roots;
  const filteredSubs = catSearch.trim() ? subs.filter((cat) => cat.name.toLowerCase().includes(catSearch.toLowerCase())) : subs;
  const firstPhotoUri = newPhotos[0]?.uri ?? (existingImages[0] ? imgUrl(existingImages[0].url) : null);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={P} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Редактировать товар</Text>
        <TouchableOpacity onPress={() => setShowPreview(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f5f3ff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
          <Eye size={14} color={P} />
          <Text style={{ fontSize: 13, color: P, fontWeight: "600" }}>Просмотр</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">

        {/* Photos */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Фотографии</Text>

          {colors.length > 0 ? (
            <View style={{ backgroundColor: "#f5f3ff", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Camera size={18} color={P} />
              <Text style={{ fontSize: 13, color: P, fontWeight: "600", flex: 1 }}>Фото добавляются по цветам — смотри раздел «Размеры и цвета» ниже</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                <TouchableOpacity onPress={pickPhotos} style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: "#f5f3ff", borderWidth: 2, borderStyle: "dashed", borderColor: "#c4b5fd", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={24} color={P} />
                  <Text style={{ fontSize: 11, color: P, marginTop: 4, fontWeight: "600" }}>Добавить</Text>
                </TouchableOpacity>
                {existingImages.map((img) => (
                  <View key={img.id} style={{ width: 84, height: 84, borderRadius: 16, overflow: "hidden" }}>
                    <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: 84, height: 84 }} contentFit="cover" />
                    <TouchableOpacity onPress={() => setPreviewPhoto(imgUrl(img.url) ?? "")} style={{ position: "absolute", top: 4, left: 4, width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                      <Eye size={11} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteExistingImage(img.id)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                      <X size={12} color="white" />
                    </TouchableOpacity>
                    {img.is_main && <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(139,92,246,0.85)", paddingVertical: 3 }}><Text style={{ color: "#fff", fontSize: 10, textAlign: "center", fontWeight: "600" }}>Главное</Text></View>}
                  </View>
                ))}
                {newPhotos.map((p, i) => (
                  <TouchableOpacity key={`new-${i}`} onPress={() => handleNewPhotoTap(i)} style={{ width: 84, height: 84, borderRadius: 16, overflow: "hidden", borderWidth: swapIdx === i ? 3 : 2, borderColor: swapIdx === i ? P : "#4ade80" }}>
                    <Image source={{ uri: p.uri }} style={{ width: 84, height: 84 }} contentFit="cover" />
                    <TouchableOpacity onPress={() => { setNewPhotos((prev) => prev.filter((_, j) => j !== i)); if (swapIdx === i) setSwapIdx(null); }} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                      <X size={12} color="white" />
                    </TouchableOpacity>
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(22,163,74,0.85)", paddingVertical: 3 }}><Text style={{ color: "#fff", fontSize: 10, textAlign: "center", fontWeight: "600" }}>Новое</Text></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {newPhotos.length > 1 && swapIdx === null && (
                <Text style={{ fontSize: 11, color: c.textMuted }}>Нажмите на новое фото чтобы поменять местами · {existingImages.length + newPhotos.length}/8</Text>
              )}
            </>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: c.textSub }}>Загрузка фото...</Text>
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
            <TextInput value={form.title} onChangeText={(v) => set("title", v)} placeholderTextColor={c.placeholder} style={{ backgroundColor: errors.title ? "#fef2f2" : c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, borderWidth: errors.title ? 1 : 0, borderColor: "#fca5a5" }} />
            {errors.title && <Text style={{ fontSize: 11, color: "#ef4444" }}>{errors.title}</Text>}
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Краткое описание</Text>
            <TextInput value={form.description} onChangeText={(v) => set("description", v)} multiline numberOfLines={3} placeholderTextColor={c.placeholder} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, textAlignVertical: "top", minHeight: 72 }} />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Бренд</Text>
            <TextInput value={form.brand} onChangeText={(v) => set("brand", v)} placeholderTextColor={c.placeholder} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
          </View>
          {/* SKU */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: c.textSub }}>SKU (артикул)</Text>
              <TextInput value={form.sku} onChangeText={(v) => set("sku", v)} placeholderTextColor={c.placeholder} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, fontFamily: "monospace" }} />
            </View>
            <TouchableOpacity onPress={() => set("sku", genSKU())} style={{ width: 46, height: 46, backgroundColor: "#f5f3ff", borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
              <RotateCcw size={16} color={P} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: errors.category_id ? "#ef4444" : c.text }}>Категория *</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 12, gap: 8 }}>
            <Search size={16} color={c.textMuted} />
            <TextInput value={catSearch} onChangeText={setCatSearch} placeholder="Поиск..." placeholderTextColor={c.placeholder} style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: c.text }} />
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
                Мин. цена: {Math.min(...colors.map((n) => parseFloat(variantPrices[n]) || 0)).toLocaleString()} сом ·
                Всего на складе: {colors.reduce((s, n) => s + (parseInt(variantStocks[n]) || 0), 0)} шт.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, color: errors.price ? "#ef4444" : c.textSub }}>Цена продажи *</Text>
                  <TextInput value={form.price} onChangeText={(v) => set("price", v)} keyboardType="numeric" placeholderTextColor={c.placeholder} style={{ backgroundColor: errors.price ? "#fef2f2" : c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, borderWidth: errors.price ? 1 : 0, borderColor: "#fca5a5" }} />
                  {errors.price && <Text style={{ fontSize: 11, color: "#ef4444" }}>{errors.price}</Text>}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, color: c.textSub }}>Старая цена {discount > 0 ? `(-${discount}%)` : ""}</Text>
                  <TextInput value={form.original_price} onChangeText={(v) => set("original_price", v)} keyboardType="numeric" placeholder="—" placeholderTextColor={c.placeholder} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
                </View>
              </View>
              {price > 0 && (
                <View style={{ backgroundColor: "#f0fdf4", borderRadius: 14, padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <TrendingUp size={14} color="#16a34a" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#166534" }}>Расчёт прибыли</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>Комиссия (10%)</Text>
                    <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "600" }}>-{commission.toLocaleString()} сом</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: "#dcfce7" }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: "#166534", fontWeight: "700" }}>Ваша прибыль</Text>
                    <Text style={{ fontSize: 13, color: "#16a34a", fontWeight: "800" }}>{profit.toLocaleString()} сом</Text>
                  </View>
                </View>
              )}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, color: c.textSub }}>Остаток на складе</Text>
                <TextInput value={form.stock} onChangeText={(v) => set("stock", v)} keyboardType="numeric" placeholderTextColor={c.placeholder} style={{ backgroundColor: lowStock ? "#fff7ed" : c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, borderWidth: lowStock ? 1 : 0, borderColor: "#fed7aa" }} />
                {lowStock && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={13} color="#f59e0b" />
                    <Text style={{ fontSize: 11, color: "#d97706", fontWeight: "600" }}>Мало товара — пополните склад</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Sizes & Colors */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Размеры и цвета</Text>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600" }}>РАЗМЕРЫ (одежда)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SIZE_PRESETS.map((s) => { const sel = sizes.includes(s); return (
                <TouchableOpacity key={s} onPress={() => setSizes((prev) => sel ? prev.filter((x) => x !== s) : [...prev, s])}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: sel ? P : c.iconBg, borderWidth: sel ? 0 : 1, borderColor: c.border }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? "#fff" : c.textSub }}>{s}</Text>
                </TouchableOpacity>
              ); })}
            </View>
            <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600", marginTop: 4 }}>РАЗМЕРЫ (обувь)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SHOE_SIZES.map((s) => { const sel = sizes.includes(s); return (
                <TouchableOpacity key={s} onPress={() => setSizes((prev) => sel ? prev.filter((x) => x !== s) : [...prev, s])}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: sel ? P : c.iconBg, borderWidth: sel ? 0 : 1, borderColor: c.border }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? "#fff" : c.textSub }}>{s}</Text>
                </TouchableOpacity>
              ); })}
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput value={sizeInput} onChangeText={setSizeInput} placeholder="Свой размер..." placeholderTextColor={c.textMuted}
                style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: c.text }} />
              <TouchableOpacity onPress={() => { const v = sizeInput.trim(); if (v && !sizes.includes(v)) setSizes((p) => [...p, v]); setSizeInput(""); }}
                style={{ width: 44, height: 44, backgroundColor: "#f5f3ff", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                <Plus size={18} color={P} />
              </TouchableOpacity>
            </View>
            {sizes.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, backgroundColor: "#f5f3ff", borderRadius: 12, padding: 10 }}>
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
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 12, gap: 8 }}>
                  {variantHex && <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: variantHex }} />}
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
            {colors.length > 0 && (() => {
              const imgsPerColor = existingImages.length > 0 ? Math.max(1, Math.ceil(existingImages.length / colors.length)) : 0;
              return (
                <View style={{ gap: 10 }}>
                  {colors.map((variantName, ci) => {
                    const paletteColor = COLOR_PALETTE.find((col) => col.name === variantName);
                    const hex = paletteColor?.hex ?? null;
                    const isLight = hex === "#f9fafb" || hex === "#d1d5db" || hex === "#d4b896";
                    const colorExisting = imgsPerColor > 0 ? existingImages.slice(ci * imgsPerColor, (ci + 1) * imgsPerColor) : [];
                    const colorNew = colorNewPhotos[variantName] || [];
                    return (
                      <View key={variantName} style={{ borderRadius: 16, borderWidth: 1.5, borderColor: c.border, overflow: "hidden" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.iconBg }}>
                          {hex ? (
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: hex, borderWidth: isLight ? 1 : 0, borderColor: "#d1d5db" }} />
                          ) : (
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: 9 }}>M</Text>
                            </View>
                          )}
                          <Text style={{ fontSize: 13, fontWeight: "700", color: c.text, flex: 1 }}>{variantName}</Text>
                          <Text style={{ fontSize: 11, color: c.textMuted }}>{colorExisting.length + colorNew.length} фото</Text>
                          <TouchableOpacity onPress={() => {
                            setColors((prev) => prev.filter((x) => x !== variantName));
                            setColorNewPhotos((prev) => { const n = { ...prev }; delete n[variantName]; return n; });
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
                              placeholder="0" keyboardType="numeric" placeholderTextColor={c.textMuted}
                              style={{ backgroundColor: c.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, color: c.textMuted, marginBottom: 3 }}>Старая цена</Text>
                            <TextInput
                              value={variantOrigPrices[variantName] || ""}
                              onChangeText={(v) => setVariantOrigPrices(p => ({ ...p, [variantName]: v }))}
                              placeholder="0" keyboardType="numeric" placeholderTextColor={c.textMuted}
                              style={{ backgroundColor: c.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text }}
                            />
                          </View>
                          <View style={{ width: 72 }}>
                            <Text style={{ fontSize: 10, color: c.textMuted, marginBottom: 3 }}>Остаток</Text>
                            <TextInput
                              value={variantStocks[variantName] || ""}
                              onChangeText={(v) => setVariantStocks(p => ({ ...p, [variantName]: v }))}
                              placeholder="0" keyboardType="numeric" placeholderTextColor={c.textMuted}
                              style={{ backgroundColor: c.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text }}
                            />
                          </View>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8, padding: 10 }}
                          style={{ backgroundColor: c.card }}>
                          <TouchableOpacity onPress={() => pickColorNewPhotos(variantName)}
                            style={{ width: 80, height: 80, borderRadius: 14, backgroundColor: "#f5f3ff", borderWidth: 2, borderStyle: "dashed", borderColor: "#c4b5fd", alignItems: "center", justifyContent: "center" }}>
                            <Camera size={20} color={P} />
                            <Text style={{ fontSize: 10, color: P, marginTop: 3, fontWeight: "600" }}>Фото</Text>
                          </TouchableOpacity>
                          {colorExisting.map((img) => (
                            <View key={img.id} style={{ width: 80, height: 80, borderRadius: 14, overflow: "hidden" }}>
                              <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: 80, height: 80 }} contentFit="cover" />
                              <TouchableOpacity onPress={() => deleteExistingImage(img.id)}
                                style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                                <X size={11} color="white" />
                              </TouchableOpacity>
                            </View>
                          ))}
                          {colorNew.map((p, i) => (
                            <View key={`new-${i}`} style={{ width: 80, height: 80, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "#4ade80" }}>
                              <Image source={{ uri: p.uri }} style={{ width: 80, height: 80 }} contentFit="cover" />
                              <TouchableOpacity onPress={() => removeColorNewPhoto(variantName, i)}
                                style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                                <X size={11} color="white" />
                              </TouchableOpacity>
                              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(22,163,74,0.85)", paddingVertical: 2 }}>
                                <Text style={{ color: "#fff", fontSize: 9, textAlign: "center", fontWeight: "600" }}>Новое</Text>
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        </View>

        {/* Characteristics */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Характеристики</Text>
            <TouchableOpacity onPress={addAttr} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f5f3ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
              <Plus size={13} color={P} />
              <Text style={{ fontSize: 13, color: P, fontWeight: "600" }}>Добавить</Text>
            </TouchableOpacity>
          </View>
          {attrs.map((attr, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput value={attr.key} onChangeText={(v) => setAttr(i, "key", v)} placeholder="Параметр" placeholderTextColor={c.placeholder} style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: c.text }} />
              <TextInput value={attr.value} onChangeText={(v) => setAttr(i, "value", v)} placeholder="Значение" placeholderTextColor={c.placeholder} style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: c.text }} />
              {attrs.length > 1 && (
                <TouchableOpacity onPress={() => removeAttr(i)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={16} color="#f87171" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* About */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>О товаре</Text>
          <TextInput value={form.about} onChangeText={(v) => set("about", v)} placeholder="Подробное описание..." placeholderTextColor={c.placeholder} multiline numberOfLines={5} style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, textAlignVertical: "top", minHeight: 100 }} />
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
            placeholderTextColor={c.placeholder}
            style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }}
          />
          <Text style={{ fontSize: 11, color: c.textMuted }}>Покупатель увидит эту метку как кнопку-фильтр в вашем магазине</Text>
        </View>

        {/* Save button */}
        <TouchableOpacity onPress={submit} disabled={saving} style={{ backgroundColor: P, borderRadius: 18, paddingVertical: 16, alignItems: "center", justifyContent: "center", shadowColor: P, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Сохранить изменения</Text>}
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Full photo preview */}
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
          <View style={{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: "hidden", width: (SW - 56) / 2 }}>
            <View style={{ width: "100%", aspectRatio: 1, backgroundColor: c.inputBg }}>
              {firstPhotoUri
                ? <Image source={{ uri: firstPhotoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
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
              <Text style={{ fontSize: 15, fontWeight: "800", color: P }}>{price > 0 ? `${price.toLocaleString()} сом` : "0 сом"}</Text>
              {originalPrice > price && <Text style={{ fontSize: 12, color: c.textMuted, textDecorationLine: "line-through" }}>{originalPrice.toLocaleString()} сом</Text>}
              {form.sku ? <Text style={{ fontSize: 10, color: c.textMuted }}>Арт: {form.sku}</Text> : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
