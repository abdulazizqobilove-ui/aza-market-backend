import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput, Pressable,
  ActivityIndicator, RefreshControl, ScrollView, Dimensions, Linking,
} from "react-native";
import { useRouter, useFocusEffect, useNavigation } from "expo-router";
import { Search, Mic, Camera, Bell, MapPin, ChevronDown, X } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { Product, ProductsResponse, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import ProductCard from "@/components/ProductCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useThemeColors, useIsDark } from "@/lib/theme";
import { SkeletonHome, SkeletonBanner } from "@/components/Skeleton";


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

const FALLBACK_BANNERS: Banner[] = [];

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
            style={{ width: SW - 24, borderRadius: 16, overflow: "hidden", backgroundColor: b.bg_color }}
          >
            {b.image_url ? (
              <View style={{ height: 250 }}>
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
              <View style={{ padding: 20, minHeight: 200, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
  const isDark = useIsDark();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);
  const flatListRef = useRef<any>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const unsub = navigation.addListener("tabPress" as any, () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsub;
  }, [navigation]);

  const user = useAuthStore((s) => s.user);

  const [unreadCount, setUnreadCount] = useState(0);
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

  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const fetchProducts = useCallback(async (reset = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const p = reset ? 1 : pageRef.current;
    if (reset) { setLoading(true); setError(false); } else setLoadingMore(true);
    try {
      let res: any;
      try {
        res = await api.get<ProductsResponse>(`/products?limit=20&page=${p}&sort=popular`);
      } catch (e: any) {
        // only fall back on server error (not timeout/network) to avoid double wait
        if (e?.response?.status) {
          res = await api.get<ProductsResponse>(`/products?limit=20&page=${p}&sort=newest`);
        } else {
          throw e;
        }
      }
      if (reset) setProducts(shuffle(res.data.items));
      else setProducts((prev) => [...prev, ...shuffle(res.data.items)]);
      setHasMore(res.data.page < res.data.pages);
      pageRef.current = p + 1;
    } catch {
      if (reset) setError(true);
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
      setBanners(res.data.length > 0 ? res.data : FALLBACK_BANNERS);
    } catch {
      setBanners(FALLBACK_BANNERS);
    } finally {
      setBannersLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchProducts(true);
  }, []);

  useFocusEffect(useCallback(() => {
    loadBanners();
  }, [loadBanners]));

  const onRefresh = async () => {
    setRefreshing(true);
    pageRef.current = 1;
    await Promise.race([
      Promise.all([loadBanners(), fetchProducts(true)]),
      new Promise<void>((r) => setTimeout(r, 8000)),
    ]);
    setRefreshing(false);
  };



  const Header = useCallback(() => (
    <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
      {bannersLoaded ? <BannerCarousel banners={banners} /> : <SkeletonBanner />}
      <Text style={{ fontSize: 16, fontWeight: "800", color: c.text, marginBottom: 8, marginTop: 14 }}>Подобрали для вас</Text>
    </View>
  ), [banners, bannersLoaded, c]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Fixed header */}
      <View style={{ backgroundColor: c.bg }}>
        {/* Address + Bell */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 12 }}>
          <TouchableOpacity onPress={() => { setAddrInput(address); setAddrModal(true); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }} activeOpacity={0.7}>
            <MapPin size={16} color="#8B5CF6" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }} numberOfLines={1}>{address}</Text>
            <ChevronDown size={15} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/notifications" as any)} style={{ position: "relative" }}>
            <Bell size={24} color={c.textSub} />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: c.card }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
          <TouchableOpacity onPress={() => router.push("/search" as any)} activeOpacity={0.85}
            style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#1e1b4b" : "#ede9fe", borderRadius: 30, paddingHorizontal: 18, height: 52, gap: 10 }}>
            <Search size={18} color="#8B5CF6" />
            <Text style={{ flex: 1, fontSize: 16, color: "#8B5CF6", fontWeight: "500" }}>Поиск</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Mic size={22} color="#8B5CF6" />
              <Camera size={22} color="#8B5CF6" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Address Modal */}
      <Modal visible={addrModal} transparent animationType="slide" onRequestClose={() => setAddrModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setAddrModal(false)} />
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Выберите город</Text>
            <TouchableOpacity onPress={() => setAddrModal(false)}><X size={20} color={c.textMuted} /></TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TextInput value={addrInput} onChangeText={setAddrInput} placeholder="Введите адрес..." placeholderTextColor={c.textMuted}
              style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: c.text }} />
            <TouchableOpacity onPress={() => saveAddress(addrInput)} style={{ backgroundColor: "#8B5CF6", borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>OK</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["Душанбе","Худжанд","Бохтар","Куляб","Хорог","Истаравшан","Турсунзаде","Пенджикент","Канибадам","Вахдат"].map((city) => (
              <TouchableOpacity key={city} onPress={() => saveAddress(city)}
                style={{ backgroundColor: address === city ? "#8B5CF6" : c.iconBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: address === city ? "#fff" : c.textSub }}>{city}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <FlatList
        ref={flatListRef}
        data={products}
        numColumns={2}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: 4, paddingHorizontal: 4 }}
        contentContainerStyle={{ paddingBottom: 96, gap: 8, paddingTop: 4 }}
        ListHeaderComponent={<Header />}
        removeClippedSubviews={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => { if (hasMore && !loadingMore && !loading) fetchProducts(false); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? <SkeletonHome /> : error ? (
            <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📡</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 8, textAlign: "center" }}>Нет подключения</Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center", marginBottom: 24 }}>Не удалось загрузить товары. Проверь интернет и попробуй снова.</Text>
              <TouchableOpacity
                onPress={async () => { setRetrying(true); await fetchProducts(true); setRetrying(false); }}
                disabled={retrying}
                style={{ backgroundColor: "#8B5CF6", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                {retrying && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{retrying ? "Подключение..." : "Повторить"}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color="#8B5CF6" style={{ paddingVertical: 16 }} /> : null
        }
        renderItem={({ item }) => <View style={{ flex: 1 }}><ProductCard product={item} /></View>}
      />
    </SafeAreaView>
  );
}
