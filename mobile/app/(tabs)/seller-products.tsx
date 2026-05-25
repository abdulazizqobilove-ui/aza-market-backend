import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Plus, Package, Eye, EyeOff, Pencil, Trash2, TrendingUp } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api, { Product, API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function SellerProductsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<Product[]>("/seller/products").then((r) => setProducts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const toggleActive = async (product: Product) => {
    try {
      const res = await api.patch<Product>(`/products/${product.id}/toggle`);
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_active: res.data.is_active } : p));
      Toast.show({ type: "success", text1: res.data.is_active ? "Товар активирован" : "Товар скрыт" });
    } catch { Toast.show({ type: "error", text1: "Не удалось изменить статус" }); }
  };

  const deleteProduct = (product: Product) => {
    Alert.alert("Удалить товар?", `«${product.title}»`, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
        try {
          await api.delete(`/products/${product.id}`);
          setProducts((prev) => prev.filter((p) => p.id !== product.id));
          Toast.show({ type: "success", text1: "Товар удалён" });
        } catch { Toast.show({ type: "error", text1: "Не удалось удалить" }); }
      }},
    ]);
  };

  const activeCount = products.filter((p) => p.is_active).length;
  const totalStock = products.reduce((s, p) => s + p.stock, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 flex-row items-center justify-between border-b border-gray-100">
        <View>
          <Text className="text-xl font-bold text-gray-900">Мои товары</Text>
          <Text className="text-xs text-gray-400 mt-0.5">{products.length} товаров · {activeCount} активных</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/seller/new-product" as any)} className="bg-blue-600 flex-row items-center gap-1.5 px-4 py-2.5 rounded-2xl">
          <Plus size={16} color="white" />
          <Text className="text-white font-semibold text-sm">Добавить</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {products.length > 0 && (
        <View className="flex-row gap-3 px-4 py-3">
          {[
            { label: "Всего", value: products.length, color: "#3b82f6", bg: "#eff6ff" },
            { label: "Активных", value: activeCount, color: "#22c55e", bg: "#f0fdf4" },
            { label: "В наличии", value: totalStock, color: "#a855f7", bg: "#faf5ff" },
          ].map(({ label, value, color, bg }) => (
            <View key={label} className="flex-1 rounded-2xl p-3" style={{ backgroundColor: bg }}>
              <Text className="text-xl font-bold" style={{ color }}>{value}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{label}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? <ActivityIndicator color="#2563EB" className="mt-10" /> : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Package size={48} color="#e5e7eb" />
              <Text className="text-lg font-semibold text-gray-700 mt-4 mb-1">Товаров пока нет</Text>
              <Text className="text-gray-400 text-sm mb-6">Добавьте первый товар</Text>
              <TouchableOpacity onPress={() => router.push("/seller/new-product" as any)} className="bg-blue-600 px-6 py-3 rounded-2xl flex-row items-center gap-2">
                <Plus size={16} color="white" />
                <Text className="text-white font-bold">Добавить товар</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: p }) => {
            const img = p.images.find((i) => i.is_main) || p.images[0];
            return (
              <View className={`bg-white rounded-2xl overflow-hidden shadow-sm ${!p.is_active ? "opacity-70" : ""}`}>
                <View className="flex-row gap-3 p-3 items-center">
                  <View className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50">
                    {img ? <Image source={{ uri: `${API_URL}${img.url}` }} className="w-full h-full" contentFit="contain" /> : <View className="flex-1 items-center justify-center"><Text className="text-2xl">📦</Text></View>}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-sm text-gray-800" numberOfLines={1}>{p.title}</Text>
                    <Text className="text-blue-600 font-bold text-sm mt-0.5">{p.price.toLocaleString()} сом.</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className="text-xs text-gray-400">{p.stock} шт.</Text>
                      <View className={`px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-100" : "bg-gray-100"}`}>
                        <Text className={`text-xs font-semibold ${p.is_active ? "text-green-700" : "text-gray-500"}`}>{p.is_active ? "Активен" : "Скрыт"}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View className="flex-row border-t border-gray-50">
                  <TouchableOpacity onPress={() => router.push(`/seller/edit-product/${p.id}` as any)} className="flex-1 flex-row items-center justify-center gap-1.5 py-3">
                    <Pencil size={15} color="#2563EB" />
                    <Text className="text-xs font-semibold text-blue-600">Изменить</Text>
                  </TouchableOpacity>
                  <View className="w-px bg-gray-50" />
                  <TouchableOpacity onPress={() => toggleActive(p)} className="flex-1 flex-row items-center justify-center gap-1.5 py-3">
                    {p.is_active ? <EyeOff size={15} color="#f97316" /> : <Eye size={15} color="#22c55e" />}
                    <Text className={`text-xs font-semibold ${p.is_active ? "text-orange-500" : "text-green-600"}`}>{p.is_active ? "Скрыть" : "Показать"}</Text>
                  </TouchableOpacity>
                  <View className="w-px bg-gray-50" />
                  <TouchableOpacity onPress={() => deleteProduct(p)} className="flex-1 flex-row items-center justify-center gap-1.5 py-3">
                    <Trash2 size={15} color="#f87171" />
                    <Text className="text-xs font-semibold text-red-400">Удалить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
