import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Dimensions,
  Modal, TextInput, Pressable,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Search, Bell, ChevronRight, MapPin, ChevronDown, X } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { Product, ProductsResponse, Category } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import ProductCard from "@/components/ProductCard";
import { SafeAreaView } from "react-native-safe-area-context";

const CITIES = ["Душанбе", "Худжанд", "Бохтар", "Куляб", "Хорог", "Истаравшан", "Турсунзаде", "Пенджикент", "Канибадам", "Вахдат"];

const { width: SW } = Dimensions.get("window");

const CATEGORY_ICONS: Record<string, string> = {
  electronics: "📱", clothing: "👕", "home-garden": "🏠",
  sport: "⚽", beauty: "💄", kids: "🧸", food: "🛒", auto: "🚗",
};

import { Image } from "expo-image";

interface Banner {
  id: number; title: string; subtitle?: string;
  bg_color: string; accent_color: string; emoji?: string; image_url?: string | null;
}

const FALLBACK_BANNERS: Banner[] = [
  { id: 1, bg_color: "#7C3AED", accent_color: "#C4B5FD", title: "Скидки до 30%", subtitle: "на электронику этой недели", emoji: "📱" },
  { id: 2, bg_color: "#7c3aed", accent_color: "#c4b5fd", title: "Новая коллекция", subtitle: "одежда и аксессуары 2026", emoji: "👗" },
  { id: 3, bg_color: "#059669", accent_color: "#6ee7b7", title: "Бесплатная доставка", subtitle: "при заказе от 500 сом", emoji: "🚚" },
];

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (banners.length < 2) return;
    timerRef.current = setInterval(() => {
      setActive((a) => {
        const next = (a + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * (SW - 24), animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <View className="mb-4">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (SW - 24));
          setActive(idx);
        }}
        style={{ width: SW - 24 }}
      >
        {banners.map((b) => (
          <View
            key={b.id}
            style={{ width: SW - 24, borderRadius: 20, overflow: "hidden", backgroundColor: b.bg_color }}
          >
            {b.image_url ? (
              /* Image banner */
              <View style={{ height: 160 }}>
                <Image source={{ uri: b.image_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.38)", padding: 20, justifyContent: "flex-end" }}>
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 26, marginBottom: 4 }}>{b.title}</Text>
                  {b.subtitle && <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{b.subtitle}</Text>}
                  <View style={{ marginTop: 12, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" }}>
                    <Text style={{ color: b.bg_color, fontWeight: "700", fontSize: 12 }}>Смотреть →</Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Color banner */
              <View style={{ padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: b.accent_color, fontSize: 11, fontWeight: "600", marginBottom: 4, letterSpacing: 0.5 }}>AZA MARKET</Text>
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 26, marginBottom: 6 }}>{b.title}</Text>
                  {b.subtitle && <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{b.subtitle}</Text>}
                  <View style={{ marginTop: 14, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" }}>
                    <Text style={{ color: b.bg_color, fontWeight: "700", fontSize: 12 }}>Смотреть →</Text>
                  </View>
                </View>
                {b.emoji && <Text style={{ fontSize: 64, marginLeft: 12 }}>{b.emoji}</Text>}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      {banners.length > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {banners.map((_, i) => (
            <View key={i} style={{ width: i === active ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === active ? "#8B5CF6" : "#d1d5db" }} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>(FALLBACK_BANNERS);
  const [popular, setPopular] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const user = useAuthStore((s) => s.user);

  const [address, setAddress] = useState("Душанбе");
  const [addrModal, setAddrModal] = useState(false);
  const [addrInput, setAddrInput] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("user_address").then((v) => { if (v) setAddress(v); });
  }, []);

  const saveAddress = (val: string) => {
    const v = val.trim() || "Душанбе";
    setAddress(v);
    AsyncStorage.setItem("user_address", v);
    setAddrModal(false);
  };

  useFocusEffect(useCallback(() => {
    if (!user) return;
    api.get<{ count: number }>("/notifications/unread-count")
      .then((r) => setUnreadCount(r.data.count))
      .catch(() => {});
  }, [user?.id]));

  const fetchProducts = useCallback(async (reset = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const p = reset ? 1 : pageRef.current;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      // try popular first, fall back to newest if backend hasn't deployed yet
      let res;
      try {
        res = await api.get<ProductsResponse>(`/products?limit=20&page=${p}&sort=popular`);
      } catch {
        res = await api.get<ProductsResponse>(`/products?limit=20&page=${p}&sort=newest`);
      }
      if (reset) setProducts(res.data.items);
      else setProducts((prev) => [...prev, ...res.data.items]);
      setHasMore(res.data.page < res.data.pages);
      pageRef.current = p + 1;
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [pRes, cRes, bRes] = await Promise.all([
        api.get<ProductsResponse>("/products?limit=6&sort=popular"),
        api.get<Category[]>("/products/categories"),
        api.get<Banner[]>("/banners").catch(() => ({ data: [] as Banner[] })),
      ]);
      setPopular(pRes.data.items);
      setCategories(cRes.data);
      if (bRes.data.length > 0) setBanners(bRes.data);
    } catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchProducts(true);
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const onRefresh = () => {
    setRefreshing(true);
    pageRef.current = 1;
    load();
    fetchProducts(true);
  };



  const Header = useCallback(() => (
    <View className="px-3 pt-4">
      <BannerCarousel banners={banners} />

      {/* Categories */}
      <View className="mb-5">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-gray-900">Категории</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/catalog")} className="flex-row items-center gap-1">
            <Text className="text-sm text-violet-500 font-medium">Все</Text>
            <ChevronRight size={14} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => router.push("/(tabs)/catalog" as any)}
              className="bg-white rounded-2xl px-3 py-2.5 flex-row items-center gap-2 border border-gray-100"
              style={{ minWidth: (SW - 60) / 4 - 2 }}
            >
              <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[c.slug] || "🛍️"}</Text>
              <Text className="text-xs font-semibold text-gray-700 flex-shrink" numberOfLines={1}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Popular horizontal */}
      {popular.length > 0 && (
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">🔥 Популярное</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/catalog")} className="flex-row items-center gap-1">
              <Text className="text-sm text-violet-500 font-medium">Все</Text>
              <ChevronRight size={14} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -12 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
            {popular.map((p) => (
              <View key={p.id} style={{ width: (SW - 48) / 2.2 }}>
                <ProductCard product={p} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* All products title */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-bold text-gray-900">✨ Все товары</Text>
      </View>
    </View>
  ), [banners, categories, popular]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-2 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          {/* Address picker */}
          <TouchableOpacity onPress={() => { setAddrInput(address); setAddrModal(true); }} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} activeOpacity={0.7}>
            <MapPin size={15} color="#8B5CF6" />
            <View>
              <Text style={{ fontSize: 10, color: "#9ca3af", fontWeight: "500" }}>Ваш адрес</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }} numberOfLines={1}>{address}</Text>
                <ChevronDown size={13} color="#6b7280" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Bell */}
          <TouchableOpacity onPress={() => router.push("/notifications" as any)} style={{ width: 36, height: 36, backgroundColor: "#F5F3FF", borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
            <Bell size={18} color="#8B5CF6" />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#fff" }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/search" as any)} className="flex-row items-center bg-gray-100 rounded-2xl px-4 gap-2" activeOpacity={0.7}>
          <Search size={18} color="#9ca3af" />
          <Text className="flex-1 py-3 text-sm text-gray-400">Искать товары и категории</Text>
        </TouchableOpacity>
      </View>

      {/* Address Modal */}
      <Modal visible={addrModal} transparent animationType="slide" onRequestClose={() => setAddrModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setAddrModal(false)} />
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Выберите город</Text>
            <TouchableOpacity onPress={() => setAddrModal(false)}>
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Custom input */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TextInput
              value={addrInput}
              onChangeText={setAddrInput}
              placeholder="Введите адрес..."
              placeholderTextColor="#9ca3af"
              style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827" }}
            />
            <TouchableOpacity onPress={() => saveAddress(addrInput)} style={{ backgroundColor: "#8B5CF6", borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>OK</Text>
            </TouchableOpacity>
          </View>

          {/* City list */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CITIES.map((city) => (
              <TouchableOpacity
                key={city}
                onPress={() => saveAddress(city)}
                style={{ backgroundColor: address === city ? "#8B5CF6" : "#f3f4f6", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: address === city ? "#fff" : "#374151" }}>{city}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: 8, paddingHorizontal: 12 }}
        contentContainerStyle={{ paddingBottom: 32, gap: 8 }}
        ListHeaderComponent={<Header />}
        removeClippedSubviews={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => { if (hasMore && !loadingMore && !loading) fetchProducts(false); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? <ActivityIndicator color="#8B5CF6" style={{ marginTop: 20 }} /> : null
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color="#8B5CF6" style={{ paddingVertical: 16 }} /> : null
        }
        renderItem={({ item }) => <View style={{ flex: 1 }}><ProductCard product={item} /></View>}
      />
    </SafeAreaView>
  );
}
