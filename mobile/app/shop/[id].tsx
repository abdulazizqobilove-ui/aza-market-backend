import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Star, Package, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { Product, API_URL } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

interface ShopInfo {
  id: number; username: string; shop_name?: string; shop_description?: string;
  shop_banner_url?: string; shop_logo_url?: string;
  products_count?: number; rating?: number; reviews_count?: number;
}

const SORTS = [
  { key: "newest", label: "Новинки" },
  { key: "price_asc", label: "Дешевле" },
  { key: "price_desc", label: "Дороже" },
  { key: "rating", label: "По рейтингу" },
];

export default function ShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    api.get<ShopInfo>(`/shop/${id}`).then((r) => setShop(r.data)).catch(() => {});
    loadProducts();
  }, [id]);

  useEffect(() => { loadProducts(); }, [q, sort]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (q) params.set("q", q);
      const res = await api.get<Product[]>(`/shop/${id}/products?${params}`);
      setProducts(res.data);
    } catch {} finally { setLoading(false); }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: 8, paddingHorizontal: 12 }}
        contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
        ListHeaderComponent={
          <View>
            {/* Banner */}
            <View className="relative h-44 bg-blue-600">
              {shop?.shop_banner_url && <Image source={{ uri: `${API_URL}${shop.shop_banner_url}` }} className="w-full h-full" contentFit="cover" />}
              <TouchableOpacity onPress={() => router.back()} className="absolute top-4 left-4 w-10 h-10 bg-black/30 rounded-full items-center justify-center">
                <ArrowLeft size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Shop info */}
            <View className="bg-white px-4 pb-4 pt-0">
              <View className="flex-row items-end gap-4 -mt-8 mb-3">
                <View className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-blue-100 items-center justify-center shadow">
                  {shop?.shop_logo_url
                    ? <Image source={{ uri: `${API_URL}${shop.shop_logo_url}` }} className="w-full h-full" contentFit="cover" />
                    : <Text className="text-blue-600 text-2xl font-bold">{(shop?.shop_name || shop?.username || "?")[0].toUpperCase()}</Text>}
                </View>
                <View className="flex-1 pb-1">
                  <Text className="text-lg font-bold text-gray-900">{shop?.shop_name || shop?.username}</Text>
                </View>
              </View>

              {shop?.shop_description && <Text className="text-sm text-gray-500 mb-3">{shop.shop_description}</Text>}

              <View className="flex-row gap-6">
                <View className="items-center">
                  <Text className="text-xl font-bold text-gray-900">{products.length}</Text>
                  <Text className="text-xs text-gray-400">Товаров</Text>
                </View>
                <View className="items-center">
                  <Text className="text-xl font-bold text-gray-900">{(shop?.rating || 0).toFixed(1)}</Text>
                  <Text className="text-xs text-gray-400">Рейтинг</Text>
                </View>
                <View className="items-center">
                  <Text className="text-xl font-bold text-gray-900">{shop?.reviews_count || 0}</Text>
                  <Text className="text-xs text-gray-400">Отзывов</Text>
                </View>
              </View>
            </View>

            {/* Search & Sort */}
            <View className="bg-white mt-2 px-4 py-3 gap-3">
              <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 gap-2">
                <Search size={16} color="#9ca3af" />
                <TextInput value={q} onChangeText={setQ} placeholder="Поиск в магазине..." placeholderTextColor="#9ca3af" className="flex-1 py-2.5 text-sm text-gray-900" />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SORTS.map((s) => (
                  <TouchableOpacity key={s.key} onPress={() => setSort(s.key)} className={`px-3 py-1 rounded-full border ${sort === s.key ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}>
                    <Text className={`text-xs font-medium ${sort === s.key ? "text-blue-600" : "text-gray-500"}`}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="h-3" />
          </View>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator color="#2563EB" className="mt-10" /> :
          <View className="items-center py-16"><Package size={48} color="#e5e7eb" /><Text className="text-gray-400 mt-3">Товаров нет</Text></View>
        }
        renderItem={({ item }) => <View className="flex-1"><ProductCard product={item} /></View>}
      />
    </SafeAreaView>
  );
}
