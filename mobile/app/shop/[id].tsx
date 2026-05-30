import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Star, Package, Search, BadgeCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { Product, imgUrl } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useThemeColors } from "@/lib/theme";
import { SkeletonProductGrid } from "@/components/Skeleton";

const { width: SW } = Dimensions.get("window");

const BANNER_COLORS = [
  ["#1D4ED8","#1D4ED8"], ["#0EA5E9","#3B82F6"], ["#10B981","#0EA5E9"],
  ["#F59E0B","#EF4444"], ["#EC4899","#2563EB"], ["#14B8A6","#3B82F6"],
  ["#3B82F6","#EC4899"], ["#EF4444","#F97316"],
];
function bannerColors(name: string): [string, string] {
  const code = (name || "A").charCodeAt(0);
  return BANNER_COLORS[code % BANNER_COLORS.length];
}

function ShopBanner({ bannerUrl, name, height = 176 }: { bannerUrl?: string | null; name: string; height?: number }) {
  const [c1, c2] = bannerColors(name);
  const letter = (name || "?")[0].toUpperCase();
  if (bannerUrl) {
    return <Image source={{ uri: bannerUrl }} style={{ width: "100%", height }} contentFit="cover" />;
  }
  return (
    <View style={{ width: "100%", height, backgroundColor: c1, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {/* Decorative circles */}
      <View style={{ position: "absolute", width: SW * 0.7, height: SW * 0.7, borderRadius: SW * 0.35, backgroundColor: c2, opacity: 0.5, top: -SW * 0.25, right: -SW * 0.2 }} />
      <View style={{ position: "absolute", width: SW * 0.4, height: SW * 0.4, borderRadius: SW * 0.2, backgroundColor: "rgba(255,255,255,0.12)", bottom: -SW * 0.1, left: -SW * 0.05 }} />
      <View style={{ position: "absolute", width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.1)", top: 20, left: SW * 0.35 }} />
      {/* Watermark letter */}
      <Text style={{ position: "absolute", fontSize: 140, fontWeight: "900", color: "rgba(255,255,255,0.12)", bottom: -30, right: 10, lineHeight: 140 }}>
        {letter}
      </Text>
      {/* Shop name */}
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff", textShadowColor: "rgba(0,0,0,0.25)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6, letterSpacing: 0.3 }}>
        {name || "Магазин"}
      </Text>
      <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4, letterSpacing: 1 }}>AZA MARKET</Text>
    </View>
  );
}

interface ShopInfo {
  id: number; username: string; shop_name?: string; shop_description?: string;
  shop_banner_url?: string; shop_logo_url?: string;
  products_count?: number; rating?: number; reviews_count?: number;
  is_verified?: boolean;
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
  const [tagFilter, setTagFilter] = useState<string | null>(null);

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

  // Unique shop_tags from all products (non-null)
  const shopTags = Array.from(new Set(products.map((p) => p.shop_tag).filter(Boolean))) as string[];
  const visibleProducts = tagFilter ? products.filter((p) => p.shop_tag === tagFilter) : products;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <FlatList
        data={visibleProducts}
        numColumns={2}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: 2, paddingHorizontal: 2 }}
        contentContainerStyle={{ paddingBottom: 24, gap: 2 }}
        ListHeaderComponent={
          <View>
            {/* Banner */}
            <View style={{ position: "relative", height: 176 }}>
              <ShopBanner
                bannerUrl={imgUrl(shop?.shop_banner_url)}
                name={shop?.shop_name || shop?.username || ""}
                height={176}
              />
              <TouchableOpacity onPress={() => router.back()} style={{ position: "absolute", top: 16, left: 16, width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
                <ArrowLeft size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Shop info */}
            <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16, marginTop: -32, marginBottom: 12 }}>
                <View style={{ width: 80, height: 80, borderRadius: 16, borderWidth: 4, borderColor: c.card, overflow: "hidden", backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" }}>
                  {shop?.shop_logo_url
                    ? <Image source={{ uri: imgUrl(shop.shop_logo_url) ?? "" }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    : <Text style={{ color: "#2563eb", fontSize: 24, fontWeight: "700" }}>{(shop?.shop_name || shop?.username || "?")[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1, paddingBottom: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>{shop?.shop_name || shop?.username}</Text>
                    {shop?.is_verified && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#eff6ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <BadgeCheck size={13} color="#2563EB" />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#2563EB" }}>Верифицирован</Text>
                      </View>
                    )}
                  </View>
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
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: sort === s.key ? "#2563EB" : c.border, backgroundColor: sort === s.key ? "#eff6ff" : "transparent" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "500", color: sort === s.key ? "#2563EB" : c.textMuted }}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Custom shop tag chips */}
            {shopTags.length > 0 && (
              <View style={{ backgroundColor: c.card, marginTop: 2, paddingVertical: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setTagFilter(null)}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, backgroundColor: tagFilter === null ? "#2563EB" : c.iconBg }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: tagFilter === null ? "#fff" : c.textSub }}>Все</Text>
                  </TouchableOpacity>
                  {shopTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => setTagFilter(tagFilter === tag ? null : tag)}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, backgroundColor: tagFilter === tag ? "#2563EB" : c.iconBg }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: tagFilter === tag ? "#fff" : c.textSub }}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
