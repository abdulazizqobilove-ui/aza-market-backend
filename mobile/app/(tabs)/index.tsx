import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Dimensions,
  Modal, TextInput, Pressable, Linking,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Search, Bell, ChevronRight, MapPin, ChevronDown, X } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { Product, ProductsResponse, Category, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import ProductCard from "@/components/ProductCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useThemeColors } from "@/lib/theme";

const CITIES = ["Душанбе", "Худжанд", "Бохтар", "Куляб", "Хорог", "Истаравшан", "Турсунзаде", "Пенджикент", "Канибадам", "Вахдат"];

const { width: SW } = Dimensions.get("window");

const CATEGORY_ICONS: Record<string, string> = {
  electronics: "📱", clothing: "👕", "home-garden": "🏠",
  sport: "⚽", beauty: "💄", kids: "🧸", food: "🛒", auto: "🚗",
};

interface Banner {
  id: number; title: string; subtitle?: string;
  bg_color: string; accent_color: string; emoji?: string;
  image_url?: string | null; link_url?: string | null;
}

const FALLBACK_BANNERS: Banner[] = [
  { id: 1, bg_color: "#7C3AED", accent_color: "#C4B5FD", title: "Скидки до 30%", subtitle: "на электронику этой недели", emoji: "📱" },
  { id: 2, bg_color: "#7c3aed", accent_color: "#c4b5fd", title: "Новая коллекция", subtitle: "одежда и аксессуары 2026", emoji: "👗" },
  { id: 3, bg_color: "#059669", accent_color: "#6ee7b7", title: "Бесплатная доставка", subtitle: "при заказе от 500 сом", emoji: "🚚" },
];

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const handleBannerPress = (linkUrl?: string | null) => {
    if (!linkUrl) return;
    if (linkUrl.startsWith("category:")) {
      const slug = linkUrl.replace("category:", "");
      router.push(`/(tabs)/catalog?cat_slug=${slug}` as any);
    } else if (linkUrl.startsWith("http://") || linkUrl.startsWith("https://")) {
      Linking.openURL(linkUrl);
    }
  };

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
          <TouchableOpacity
            key={b.id}
            activeOpacity={b.link_url ? 0.85 : 1}
            onPress={() => handleBannerPress(b.link_url)}
            style={{ width: SW - 24, borderRadius: 20, overflow: "hidden", backgroundColor: b.bg_color }}
          >
            {b.image_url ? (
              <View style={{ height: 160 }}>
                <Image source={{ uri: imgUrl(b.image_url) ?? "" }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.38)", padding: 20, justifyContent: "flex-end" }}>
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 26, marginBottom: 4 }}>{b.title}</Text>
                  {b.subtitle && <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{b.subtitle}</Text>}
                  {b.link_url && (
                    <View style={{ marginTop: 12, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" }}>
                      <Text style={{ color: b.bg_color, fontWeight: "700", fontSize: 12 }}>Смотреть →</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: b.accent_color, fontSize: 11, fontWeight: "600", marginBottom: 4, letterSpacing: 0.5 }}>AZA MARKET</Text>
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 26, marginBottom: 6 }}>{b.title}</Text>
                  {b.subtitle && <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{b.subtitle}</Text>}
                  {b.link_url && (
                    <View style={{ marginTop: 14, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" }}>
                      <Text style={{ color: b.bg_color, fontWeight: "700", fontSize: 12 }}>Смотреть →</Text>
                    </View>
                  )}
                </View>
                {b.emoji && <Text style={{ fontSize: 64, marginLeft: 12 }}>{b.emoji}</Text>}
              </View>
            )}
          </TouchableOpacity>
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
  const c = useThemeColors();
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

  const loadBanners = useCallback(async () => {
    try {
      const res = await api.get<Banner[]>("/banners");
      if (res.data.length > 0) setBanners(res.data);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get<ProductsResponse>("/products?limit=6&sort=popular"),
        api.get<Category[]>("/products/categories"),
      ]);
      setPopular(pRes.data.items);
      setCategories(cRes.data);
    } catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchProducts(true);
    load();
  }, []);

  useFocusEffect(useCallback(() => {
    loadBanners();
  }, [loadBanners]));

  const onRefresh = () => {
    setRefreshing(true);
    pageRef.current = 1;
    load();
    loadBanners();
    fetchProducts(true);
  };



  const Header = useCallback(() => (
    <View style={{ paddingHorizontal: 12, paddingTop: 16 }}>
      <BannerCarousel banners={banners} />

      {/* Categories */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>Категории</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/catalog")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 14, color: "#8B5CF6", fontWeight: "500" }}>Все</Text>
            <ChevronRight size={14} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => router.push("/(tabs)/catalog" as any)}
              style={{ backgroundColor: c.card, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: c.border, minWidth: (SW - 60) / 4 - 2 }}
            >
              <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat.slug] || "🛍️"}</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.textSub, flexShrink: 1 }} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Popular horizontal */}
      {popular.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>🔥 Популярное</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/catalog")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 14, color: "#8B5CF6", fontWeight: "500" }}>Все</Text>
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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>✨ Все товары</Text>
      </View>
    </View>
  ), [banners, categories, popular, c]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          {/* Address picker */}
          <TouchableOpacity onPress={() => { setAddrInput(address); setAddrModal(true); }} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} activeOpacity={0.7}>
            <MapPin size={15} color="#8B5CF6" />
            <View>
              <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: "500" }}>Ваш адрес</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: c.text }} numberOfLines={1}>{address}</Text>
                <ChevronDown size={13} color={c.textSub} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Bell */}
          <TouchableOpacity onPress={() => router.push("/notifications" as any)} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
            <Bell size={18} color="#8B5CF6" />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: c.card }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/search" as any)} style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.iconBg, borderRadius: 16, paddingHorizontal: 16, gap: 8 }} activeOpacity={0.7}>
          <Search size={18} color={c.textMuted} />
          <Text style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: c.textMuted }}>Искать товары и категории</Text>
        </TouchableOpacity>
      </View>

      {/* Address Modal */}
      <Modal visible={addrModal} transparent animationType="slide" onRequestClose={() => setAddrModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setAddrModal(false)} />
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Выберите город</Text>
            <TouchableOpacity onPress={() => setAddrModal(false)}>
              <X size={20} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Custom input */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TextInput
              value={addrInput}
              onChangeText={setAddrInput}
              placeholder="Введите адрес..."
              placeholderTextColor={c.textMuted}
              style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: c.text }}
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
                style={{ backgroundColor: address === city ? "#8B5CF6" : c.iconBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: address === city ? "#fff" : c.textSub }}>{city}</Text>
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
