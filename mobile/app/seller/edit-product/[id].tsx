import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, X, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import api, { Product, API_URL } from "@/lib/api";

interface Category { id: number; name: string; }

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingImages, setExistingImages] = useState<{ id: number; url: string; is_main: boolean }[]>([]);
  const [newImages, setNewImages] = useState<{ uri: string; name: string; type: string }[]>([]);

  const [form, setForm] = useState({
    title: "", description: "", price: "", original_price: "",
    stock: "", brand: "", category_id: "",
  });

  useEffect(() => {
    Promise.all([
      api.get<Product>(`/products/${id}`).then((r) => {
        const p = r.data;
        setForm({
          title: p.title, description: p.description || "",
          price: String(p.price), original_price: p.original_price ? String(p.original_price) : "",
          stock: String(p.stock), brand: p.brand || "", category_id: String(p.category.id),
        });
        setExistingImages(p.images);
      }).catch(() => {}),
      api.get<Category[]>("/products/categories").then((r) => setCategories(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Toast.show({ type: "error", text1: "Нет доступа к галерее" }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({ uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.mimeType || "image/jpeg" }));
      setNewImages((prev) => [...prev, ...picked].slice(0, 8 - existingImages.length));
    }
  };

  const deleteExistingImage = async (imgId: number) => {
    try {
      await api.delete(`/products/${id}/images/${imgId}`);
      setExistingImages((prev) => prev.filter((i) => i.id !== imgId));
    } catch { Toast.show({ type: "error", text1: "Не удалось удалить фото" }); }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.price || !form.category_id) {
      Toast.show({ type: "error", text1: "Заполните название, цену и категорию" }); return;
    }
    setSaving(true);
    try {
      // 1. Update product info with JSON (PATCH)
      await api.patch(`/products/${id}`, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : undefined,
        stock: parseInt(form.stock || "0"),
        brand: form.brand.trim() || undefined,
        category_id: parseInt(form.category_id),
      });

      // 2. Upload new images separately
      if (newImages.length > 0) {
        const imgData = new FormData();
        newImages.forEach((img) => {
          imgData.append("files", { uri: img.uri, name: img.name, type: img.type } as any);
        });
        await api.post(`/products/${id}/images`, imgData, { headers: { "Content-Type": "multipart/form-data" } }).catch(() => {});
      }

      Toast.show({ type: "success", text1: "Товар обновлён!" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Не удалось обновить товар" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 flex-row items-center gap-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
          <ArrowLeft size={18} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">Редактировать</Text>
        <TouchableOpacity onPress={submit} disabled={saving} className="bg-blue-600 px-4 py-2 rounded-xl">
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-bold text-sm">Сохранить</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {/* Images */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Фотографии</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <TouchableOpacity onPress={pickImage} className="w-20 h-20 rounded-xl bg-blue-50 border-2 border-dashed border-blue-300 items-center justify-center">
              <Camera size={22} color="#2563EB" />
              <Text className="text-xs text-blue-600 mt-1">Фото</Text>
            </TouchableOpacity>
            {existingImages.map((img) => (
              <View key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <Image source={{ uri: `${API_URL}${img.url}` }} className="w-full h-full" contentFit="cover" />
                <TouchableOpacity onPress={() => deleteExistingImage(img.id)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full items-center justify-center">
                  <X size={12} color="white" />
                </TouchableOpacity>
                {img.is_main && <View className="absolute bottom-0 left-0 right-0 bg-blue-600/80 py-0.5"><Text className="text-white text-xs text-center">Главное</Text></View>}
              </View>
            ))}
            {newImages.map((img, i) => (
              <View key={`new-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-green-400">
                <Image source={{ uri: img.uri }} className="w-full h-full" contentFit="cover" />
                <TouchableOpacity onPress={() => setNewImages((prev) => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full items-center justify-center">
                  <X size={12} color="white" />
                </TouchableOpacity>
                <View className="absolute bottom-0 left-0 right-0 bg-green-600/80 py-0.5"><Text className="text-white text-xs text-center">Новое</Text></View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Basic info */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Основное</Text>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Название *</Text>
            <TextInput value={form.title} onChangeText={(v) => set("title", v)} placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Описание</Text>
            <TextInput value={form.description} onChangeText={(v) => set("description", v)} multiline numberOfLines={4} placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" style={{ textAlignVertical: "top", minHeight: 80 }} />
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Бренд</Text>
            <TextInput value={form.brand} onChangeText={(v) => set("brand", v)} placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
        </View>

        {/* Price */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Цена</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Цена продажи *</Text>
              <TextInput value={form.price} onChangeText={(v) => set("price", v)} keyboardType="numeric" placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Старая цена</Text>
              <TextInput value={form.original_price} onChangeText={(v) => set("original_price", v)} keyboardType="numeric" placeholder="—" placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
            </View>
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Остаток на складе</Text>
            <TextInput value={form.stock} onChangeText={(v) => set("stock", v)} keyboardType="numeric" placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
        </View>

        {/* Category */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Категория *</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <TouchableOpacity key={cat.id} onPress={() => set("category_id", String(cat.id))} className={`px-3 py-2 rounded-xl border ${form.category_id === String(cat.id) ? "bg-blue-600 border-blue-600" : "bg-gray-50 border-gray-200"}`}>
                <Text className={`text-sm font-medium ${form.category_id === String(cat.id) ? "text-white" : "text-gray-700"}`}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
