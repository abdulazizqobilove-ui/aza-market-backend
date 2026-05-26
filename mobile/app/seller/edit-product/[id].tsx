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

const P = "#8B5CF6";
const COMMISSION = 0.1;
const LOW_STOCK = 5;
const { width: SW } = Dimensions.get("window");

interface Category { id: number; name: string; slug: string; parent_id?: number | null; }
interface Attr { key: string; value: string; }
interface NewPhoto { uri: string; name: string; type: string; }

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: "", description: "", about: "", price: "", original_price: "",
    stock: "", brand: "", category_id: "", sku: "",
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
        });
        setExistingImages(p.images);

        if (p.attributes && Object.keys(p.attributes).length > 0) {
          setAttrs(Object.entries(p.attributes).map(([key, value]) => ({ key, value: String(value) })));
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Введите название";
    if (!form.price || parseFloat(form.price) <= 0) e.price = "Введите корректную цену";
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

  const uploadNewPhotos = () =>
    new Promise<boolean>((resolve) => {
      AsyncStorage.getItem("token").then((token) => {
        const fd = new FormData();
        newPhotos.forEach((p) => fd.append("files", { uri: p.uri, name: p.name, type: p.type } as any));
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
      attrs.forEach(({ key, value }) => { if (key.trim() && value.trim()) attributes[key.trim()] = value.trim(); });

      await api.patch(`/products/${id}`, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        about: form.about.trim() || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : undefined,
        stock: parseInt(form.stock || "0"),
        brand: form.brand.trim() || undefined,
        category_id: parseInt(form.category_id),
        sku: form.sku.trim() || undefined,
      });

      if (newPhotos.length > 0) {
        Toast.show({ type: "info", text1: "Загружаем фото..." });
        const ok = await uploadNewPhotos();
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

  const filteredRoots = catSearch.trim() ? roots.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())) : roots;
  const filteredSubs = catSearch.trim() ? subs.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())) : subs;
  const firstPhotoUri = newPhotos[0]?.uri ?? (existingImages[0] ? imgUrl(existingImages[0].url) : null);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={P} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, backgroundColor: "#f3f4f6", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color="#4b5563" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827", flex: 1 }}>Редактировать товар</Text>
        <TouchableOpacity onPress={() => setShowPreview(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f5f3ff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
          <Eye size={14} color={P} />
          <Text style={{ fontSize: 13, color: P, fontWeight: "600" }}>Просмотр</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">

        {/* Photos */}
        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Фотографии</Text>
            {swapIdx !== null && (
              <View style={{ backgroundColor: "#fef3c7", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, color: "#92400e", fontWeight: "600" }}>Выберите место для замены</Text>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <TouchableOpacity onPress={pickPhotos} style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: "#f5f3ff", borderWidth: 2, borderStyle: "dashed", borderColor: "#c4b5fd", alignItems: "center", justifyContent: "center" }}>
              <Camera size={24} color={P} />
              <Text style={{ fontSize: 11, color: P, marginTop: 4, fontWeight: "600" }}>Добавить</Text>
            </TouchableOpacity>

            {/* Existing images */}
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

            {/* New photos */}
            {newPhotos.map((p, i) => (
              <TouchableOpacity key={`new-${i}`} onPress={() => handleNewPhotoTap(i)} style={{ width: 84, height: 84, borderRadius: 16, overflow: "hidden", borderWidth: swapIdx === i ? 3 : 2, borderColor: swapIdx === i ? P : "#4ade80" }}>
                <Image source={{ uri: p.uri }} style={{ width: 84, height: 84 }} contentFit="cover" />
                <TouchableOpacity onPress={() => setPreviewPhoto(p.uri)} style={{ position: "absolute", top: 4, left: 4, width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                  <Eye size={11} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setNewPhotos((prev) => prev.filter((_, j) => j !== i)); if (swapIdx === i) setSwapIdx(null); }} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                  <X size={12} color="white" />
                </TouchableOpacity>
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(22,163,74,0.85)", paddingVertical: 3 }}><Text style={{ color: "#fff", fontSize: 10, textAlign: "center", fontWeight: "600" }}>Новое</Text></View>
                {swapIdx !== null && swapIdx !== i && (
                  <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(139,92,246,0.25)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 22 }}>↕</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {newPhotos.length > 1 && swapIdx === null && (
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>Нажмите на новое фото чтобы поменять местами · {existingImages.length + newPhotos.length}/8</Text>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>Загрузка фото...</Text>
                <Text style={{ fontSize: 12, color: P, fontWeight: "600" }}>{uploadProgress}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: "#f3f4f6", borderRadius: 3 }}>
                <View style={{ height: 6, backgroundColor: P, borderRadius: 3, width: `${uploadProgress}%` }} />
              </View>
            </View>
          )}
        </View>

        {/* Basic info */}
        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Основное</Text>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: errors.title ? "#ef4444" : "#6b7280" }}>Название *</Text>
            <TextInput value={form.title} onChangeText={(v) => set("title", v)} placeholderTextColor="#9ca3af" style={{ backgroundColor: errors.title ? "#fef2f2" : "#f9fafb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", borderWidth: errors.title ? 1 : 0, borderColor: "#fca5a5" }} />
            {errors.title && <Text style={{ fontSize: 11, color: "#ef4444" }}>{errors.title}</Text>}
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Краткое описание</Text>
            <TextInput value={form.description} onChangeText={(v) => set("description", v)} multiline numberOfLines={3} placeholderTextColor="#9ca3af" style={{ backgroundColor: "#f9fafb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", textAlignVertical: "top", minHeight: 72 }} />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Бренд</Text>
            <TextInput value={form.brand} onChangeText={(v) => set("brand", v)} placeholderTextColor="#9ca3af" style={{ backgroundColor: "#f9fafb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827" }} />
          </View>
          {/* SKU */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>SKU (артикул)</Text>
              <TextInput value={form.sku} onChangeText={(v) => set("sku", v)} placeholderTextColor="#9ca3af" style={{ backgroundColor: "#f9fafb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", fontFamily: "monospace" }} />
            </View>
            <TouchableOpacity onPress={() => set("sku", genSKU())} style={{ width: 46, height: 46, backgroundColor: "#f5f3ff", borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
              <RotateCcw size={16} color={P} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category */}
        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: errors.category_id ? "#ef4444" : "#111827" }}>Категория *</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderRadius: 14, paddingHorizontal: 12, gap: 8 }}>
            <Search size={16} color="#9ca3af" />
            <TextInput value={catSearch} onChangeText={setCatSearch} placeholder="Поиск..." placeholderTextColor="#9ca3af" style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: "#111827" }} />
            {catSearch.length > 0 && <TouchableOpacity onPress={() => setCatSearch("")}><X size={16} color="#9ca3af" /></TouchableOpacity>}
          </View>

          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600" }}>РАЗДЕЛ</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filteredRoots.map((cat) => {
              const active = selectedRoot?.id === cat.id;
              return (
                <TouchableOpacity key={cat.id} onPress={() => selectRoot(cat)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? P : "#f3f4f6", borderWidth: active ? 0 : 1, borderColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : "#374151" }}>{cat.name}</Text>
                  {active && subs.length > 0 && <ChevronRight size={13} color="rgba(255,255,255,0.7)" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredSubs.length > 0 && (
            <>
              <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600" }}>ПОДКАТЕГОРИЯ</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {filteredSubs.map((cat) => {
                  const active = form.category_id === String(cat.id);
                  return (
                    <TouchableOpacity key={cat.id} onPress={() => set("category_id", String(cat.id))} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? P : "#f0f9ff", borderWidth: active ? 0 : 1, borderColor: "#bae6fd" }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : "#0369a1" }}>{cat.name}</Text>
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
        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Цена</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: errors.price ? "#ef4444" : "#6b7280" }}>Цена продажи *</Text>
              <TextInput value={form.price} onChangeText={(v) => set("price", v)} keyboardType="numeric" placeholderTextColor="#9ca3af" style={{ backgroundColor: errors.price ? "#fef2f2" : "#f9fafb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", borderWidth: errors.price ? 1 : 0, borderColor: "#fca5a5" }} />
              {errors.price && <Text style={{ fontSize: 11, color: "#ef4444" }}>{errors.price}</Text>}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>Старая цена {discount > 0 ? `(-${discount}%)` : ""}</Text>
              <TextInput value={form.original_price} onChangeText={(v) => set("original_price", v)} keyboardType="numeric" placeholder="—" placeholderTextColor="#9ca3af" style={{ backgroundColor: "#f9fafb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827" }} />
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
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Остаток на складе</Text>
            <TextInput value={form.stock} onChangeText={(v) => set("stock", v)} keyboardType="numeric" placeholderTextColor="#9ca3af" style={{ backgroundColor: lowStock ? "#fff7ed" : "#f9fafb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", borderWidth: lowStock ? 1 : 0, borderColor: "#fed7aa" }} />
            {lowStock && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={13} color="#f59e0b" />
                <Text style={{ fontSize: 11, color: "#d97706", fontWeight: "600" }}>Мало товара — пополните склад</Text>
              </View>
            )}
          </View>
        </View>

        {/* Characteristics */}
        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Характеристики</Text>
            <TouchableOpacity onPress={addAttr} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f5f3ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
              <Plus size={13} color={P} />
              <Text style={{ fontSize: 13, color: P, fontWeight: "600" }}>Добавить</Text>
            </TouchableOpacity>
          </View>
          {attrs.map((attr, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput value={attr.key} onChangeText={(v) => setAttr(i, "key", v)} placeholder="Параметр" placeholderTextColor="#9ca3af" style={{ flex: 1, backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#111827" }} />
              <TextInput value={attr.value} onChangeText={(v) => setAttr(i, "value", v)} placeholder="Значение" placeholderTextColor="#9ca3af" style={{ flex: 1, backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#111827" }} />
              {attrs.length > 1 && (
                <TouchableOpacity onPress={() => removeAttr(i)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={16} color="#f87171" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* About */}
        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>О товаре</Text>
          <TextInput value={form.about} onChangeText={(v) => set("about", v)} placeholder="Подробное описание..." placeholderTextColor="#9ca3af" multiline numberOfLines={5} style={{ backgroundColor: "#f9fafb", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", textAlignVertical: "top", minHeight: 100 }} />
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
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>Предпросмотр карточки</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}><X size={20} color="#9ca3af" /></TouchableOpacity>
          </View>
          <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f3f4f6", overflow: "hidden", width: (SW - 56) / 2 }}>
            <View style={{ width: "100%", aspectRatio: 1, backgroundColor: "#f9fafb" }}>
              {firstPhotoUri
                ? <Image source={{ uri: firstPhotoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Camera size={32} color="#d1d5db" /></View>
              }
              {discount > 0 && (
                <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#ef4444", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>-{discount}%</Text>
                </View>
              )}
            </View>
            <View style={{ padding: 10, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }} numberOfLines={2}>{form.title || "Название товара"}</Text>
              <Text style={{ fontSize: 15, fontWeight: "800", color: P }}>{price > 0 ? `${price.toLocaleString()} сом` : "0 сом"}</Text>
              {originalPrice > price && <Text style={{ fontSize: 12, color: "#9ca3af", textDecorationLine: "line-through" }}>{originalPrice.toLocaleString()} сом</Text>}
              {form.sku ? <Text style={{ fontSize: 10, color: "#9ca3af" }}>Арт: {form.sku}</Text> : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
