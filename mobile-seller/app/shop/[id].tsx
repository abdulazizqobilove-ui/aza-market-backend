import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Star, Package, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { Product, API_URL } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useThemeColors } from "@/lib/theme";
import { SkeletonProductGrid } from "@/components/Skeleton";

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
  const c = useThemeColors();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: 2, paddingHorizontal: 2 }}
        contentContainerStyle={{ paddingBottom: 24, gap: 2 }}
        ListHeaderComponent={
          <View>
            {/* Banner */}
            <View style={{ position: "relative", height: 176, backgroundColor: "#7C3AED" }}>
              {shop?.shop_banner_url && <Image source={{ uri: `${API_URL}${shop.shop_banner_url}` }} style={{ width: "100%", height: "100%" }} contentFit="cover" />}
              <TouchableOpacity onPress={() => router.back()} style={{ position: "absolute", top: 16, left: 16, width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
                <ArrowLeft size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Shop info */}
            <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16, marginTop: -32, marginBottom: 12 }}>
                <View style={{ width: 80, height: 80, borderRadius: 16, borderWidth: 4, borderColor: c.card, overflow: "hidden", backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" }}>
                  {shop?.shop_logo_url
                    ? <Image source={{ uri: `${API_URL}${shop.shop_logo_url}` }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    : <Text style={{ color: "#2563eb", fontSize: 24, fontWeight: "700" }}>{(shop?.shop_name || shop?.username || "?")[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>{shop?.shop_name || shop?.username}</Text>
                </View>
              </View>

              {shop?.shop_description && <Text style={{ fontSize: 14, color: c.textMuted, marginBottom: 12 }}>{shop.shop_description}</Text>}

              <View style={{ flexDirection: "row", gap: 24 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: c.text }}>{products.length}</Text>
                  <Text style={{ fontSize: 12, color: c.textMuted }}>Товаров</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: c.text }}>{(shop?.rating || 0).toFixed(1)}</Text>
                  <Text style={{ fontSize: 12, color: c.textMuted }}>Рейтинг</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: c.text }}>{shop?.reviews_count || 0}</Text>
                  <Text style={{ fontSize: 12, color: c.textMuted }}>Отзывов</Text>
                </View>
              </View>
            </View>

            {/* Search & Sort */}
            <View style={{ backgroundColor: c.card, marginTop: 8, paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.iconBg, borderRadius: 16, paddingHorizontal: 14, gap: 8 }}>
                <Search size={16} color={c.textMuted} />
                <TextInput value={q} onChangeText={setQ} placeholder="Поиск в магазине..." placeholderTextColor={c.textMuted} style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: c.text }} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SORTS.map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setSort(s.key)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: sort === s.key ? "#8B5CF6" : c.border, backgroundColor: sort === s.key ? "#eff6ff" : "transparent" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "500", color: sort === s.key ? "#8B5CF6" : c.textMuted }}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={{ height: 12 }} />
          </View>
        }
        ListEmptyComponent={
          loading
            ? <SkeletonProductGrid rows={3} />
            : <View style={{ alignItems: "center", paddingVertical: 64 }}><Package size={48} color={c.border} /><Text style={{ color: c.textMuted, marginTop: 12 }}>Товаров нет</Text></View>
        }
        renderItem={({ item }) => <View style={{ flex: 1, maxWidth: "50%" }}><ProductCard product={item} /></View>}
      />
    </SafeAreaView>
  );
}
