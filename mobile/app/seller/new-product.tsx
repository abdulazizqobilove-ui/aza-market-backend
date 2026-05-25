import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Plus, X, Camera, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import api from "@/lib/api";

interface Category { id: number; name: string; }
interface Attr { key: string; value: string; }

export default function NewProductScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [attrs, setAttrs] = useState<Attr[]>([{ key: "", value: "" }]);

  const [form, setForm] = useState({
    title: "", description: "", about: "", price: "", original_price: "",
    stock: "", brand: "", category_id: "",
  });

  useEffect(() => {
    api.get<Category[]>("/products/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Toast.show({ type: "error", text1: "Нет доступа к галерее" }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.mimeType || "image/jpeg",
      }));
      setImages((prev) => [...prev, ...picked].slice(0, 8));
    }
  };

  const setAttr = (i: number, field: "key" | "value", val: string) =>
    setAttrs((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a));

  const addAttr = () => setAttrs((prev) => [...prev, { key: "", value: "" }]);
  const removeAttr = (i: number) => setAttrs((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!form.title.trim() || !form.price || !form.category_id) {
      Toast.show({ type: "error", text1: "Заполните название, цену и категорию" }); return;
    }
    setSaving(true);
    try {
      const attributes: Record<string, string> = {};
      attrs.forEach(({ key, value }) => { if (key.trim() && value.trim()) attributes[key.trim()] = value.trim(); });

      const res = await api.post<{ id: number }>("/products", {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        about: form.about.trim() || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : undefined,
        stock: parseInt(form.stock || "0"),
        brand: form.brand.trim() || undefined,
        category_id: parseInt(form.category_id),
      });

      if (images.length > 0) {
        const imgData = new FormData();
        images.forEach((img) => {
          imgData.append("files", { uri: img.uri, name: img.name, type: img.type } as any);
        });
        await api.post(`/products/${res.data.id}/images`, imgData, { headers: { "Content-Type": "multipart/form-data" } }).catch(() => {});
      }

      Toast.show({ type: "success", text1: "Товар добавлен!" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Не удалось добавить товар" });
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 flex-row items-center gap-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
          <ArrowLeft size={18} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">Новый товар</Text>
        <TouchableOpacity onPress={submit} disabled={saving} className="bg-violet-500 px-4 py-2 rounded-xl">
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-bold text-sm">Сохранить</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {/* Images */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Фотографии</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <TouchableOpacity onPress={pickImage} className="w-20 h-20 rounded-xl bg-violet-50 border-2 border-dashed border-blue-300 items-center justify-center">
              <Camera size={22} color="#8B5CF6" />
              <Text className="text-xs text-violet-500 mt-1">Фото</Text>
            </TouchableOpacity>
            {images.map((img, i) => (
              <View key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <Image source={{ uri: img.uri }} className="w-full h-full" contentFit="cover" />
                <TouchableOpacity onPress={() => setImages((p) => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full items-center justify-center">
                  <X size={12} color="white" />
                </TouchableOpacity>
                {i === 0 && <View className="absolute bottom-0 left-0 right-0 bg-violet-500/80 py-0.5"><Text className="text-white text-xs text-center">Главное</Text></View>}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Basic info */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Основное</Text>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Название *</Text>
            <TextInput value={form.title} onChangeText={(v) => set("title", v)} placeholder="Введите название товара" placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Краткое описание</Text>
            <TextInput value={form.description} onChangeText={(v) => set("description", v)} placeholder="Короткое описание товара..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" style={{ textAlignVertical: "top", minHeight: 72 }} />
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Бренд</Text>
            <TextInput value={form.brand} onChangeText={(v) => set("brand", v)} placeholder="Например: Samsung, Nike..." placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
        </View>

        {/* Characteristics */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-gray-700">Характеристики</Text>
            <TouchableOpacity onPress={addAttr} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Plus size={14} color="#8B5CF6" />
              <Text style={{ fontSize: 13, color: "#8B5CF6", fontWeight: "600" }}>Добавить</Text>
            </TouchableOpacity>
          </View>
          {attrs.map((attr, i) => (
            <View key={i} className="flex-row gap-2 items-center">
              <TextInput
                value={attr.key}
                onChangeText={(v) => setAttr(i, "key", v)}
                placeholder="Параметр"
                placeholderTextColor="#9ca3af"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-3 text-sm text-gray-900"
              />
              <TextInput
                value={attr.value}
                onChangeText={(v) => setAttr(i, "value", v)}
                placeholder="Значение"
                placeholderTextColor="#9ca3af"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-3 text-sm text-gray-900"
              />
              {attrs.length > 1 && (
                <TouchableOpacity onPress={() => removeAttr(i)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={16} color="#f87171" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>Например: Материал → Хлопок, Цвет → Синий</Text>
        </View>

        {/* About */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">О товаре</Text>
          <TextInput
            value={form.about}
            onChangeText={(v) => set("about", v)}
            placeholder="Подробное описание: состав, особенности, уход..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900"
            style={{ textAlignVertical: "top", minHeight: 100 }}
          />
        </View>

        {/* Price */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Цена</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Цена продажи *</Text>
              <TextInput value={form.price} onChangeText={(v) => set("price", v)} placeholder="0" placeholderTextColor="#9ca3af" keyboardType="numeric" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Старая цена</Text>
              <TextInput value={form.original_price} onChangeText={(v) => set("original_price", v)} placeholder="0" placeholderTextColor="#9ca3af" keyboardType="numeric" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
            </View>
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Остаток на складе</Text>
            <TextInput value={form.stock} onChangeText={(v) => set("stock", v)} placeholder="0" placeholderTextColor="#9ca3af" keyboardType="numeric" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
        </View>

        {/* Category */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Категория *</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <TouchableOpacity key={cat.id} onPress={() => set("category_id", String(cat.id))} className={`px-3 py-2 rounded-xl border ${form.category_id === String(cat.id) ? "bg-violet-500 border-violet-500" : "bg-gray-50 border-gray-200"}`}>
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
