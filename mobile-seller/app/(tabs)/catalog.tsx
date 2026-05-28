import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigation } from "expo-router";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Dimensions, Modal, KeyboardAvoidingView, Platform, BackHandler,
} from "react-native";
import { Search, ArrowLeft, SlidersHorizontal, X, Star, ChevronRight } from "lucide-react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import api, { Product, ProductsResponse, Category, imgUrl } from "@/lib/api";
import { SkeletonProductGrid } from "@/components/Skeleton";
import ProductCard from "@/components/ProductCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useThemeColors, useIsDark } from "@/lib/theme";

const { width: SW } = Dimensions.get("window");

interface ApiBanner { id: number; title: string; subtitle?: string; bg_color: string; accent_color: string; emoji?: string; link_url?: string | null; image_url?: string | null; }

const SUBCAT_EMOJI: Record<string, string> = {
  smartphones: "📱", laptops: "💻", tablets: "📟", audio: "🎧",
  tvs: "📺", photo: "📷", smartwatches: "⌚", gaming: "🎮", "tech-accessories": "🔌",
  "mens-clothing": "👔", "womens-clothing": "👗", "sport-clothing": "🩱", outerwear: "🧥", underwear: "🩲", swimwear: "👙",
  "mens-shoes": "👞", "womens-shoes": "👠", "kids-shoes": "👟", "sport-shoes": "👟", sandals: "🩴",
  bags: "👜", belts: "🪢", glasses: "👓", jewelry: "💍", watches: "⌚", hats: "🧢",
  bedding: "🛏️", kitchenware: "🍳", lighting: "💡", decor: "🖼️", bathroom: "🚿", storage: "📦",
  sofas: "🛋️", beds: "🛏️", tables: "🪑", wardrobes: "🗄️", "kids-furniture": "🧸",
  tools: "🔧", paints: "🎨", plumbing: "🚰", electrical: "⚡", "doors-windows": "🚪",
  football: "⚽", fitness: "🏋️", tourism: "🎣", cycling: "🚴", "martial-arts": "🥋", swimming: "🏊",
  "face-care": "✨", "hair-care": "💆", perfume: "🌸", makeup: "💄", nails: "💅",
  vitamins: "💊", medical: "🏥", massagers: "💆", monitors: "📊",
  toys: "🧸", "kids-clothing": "👕", strollers: "🍼", school: "📚", "baby-food": "🍼",
  "car-accessories": "🚗", "car-chem": "🧴", tires: "🔄", "car-parts": "⚙️", dashcams: "📹",
  grocery: "🧺", drinks: "🥤", sweets: "🍬", dairy: "🥛", halal: "🥩",
  "pet-food": "🦴", "pet-accessories": "🐾", vet: "💉",
  art: "🎨", music: "🎸", "board-games": "🎲", collecting: "🏆",
};

const FEATURED = [
  { id: "abroad",   label: "Товары из-за рубежа",    emoji: "✈️",  bg: "#7C3AED", slug: null },
  { id: "farm",     label: "Для коз и овец",           emoji: "🐑",  bg: "#16a34a", slug: null },
  { id: "sale",     label: "Летняя распродажа",        emoji: "☀️",  bg: "#ea580c", slug: null },
  { id: "football", label: "Футбол",                   emoji: "⚽",  bg: "#15803d", slug: "sport" },
  { id: "summer",   label: "Летняя коллекция",         emoji: "👗",  bg: "#7c3aed", slug: "clothing" },
  { id: "price",    label: "Гарантия низких цен",      emoji: "💰",  bg: "#b45309", slug: null },
];

const CATS = [
  { id: "furniture",    label: "Мебель",                    emoji: "🛋️",  slug: "home-garden" },
  { id: "tourism",      label: "Туризм, рыбалка и охота",   emoji: "🎣",  slug: "sport" },
  { id: "electronics",  label: "Электроника",               emoji: "📱",  slug: "electronics" },
  { id: "appliances",   label: "Бытовая техника",           emoji: "🏠",  slug: "home-garden" },
  { id: "clothing",     label: "Одежда",                    emoji: "👕",  slug: "clothing" },
  { id: "shoes",        label: "Обувь",                     emoji: "👟",  slug: "clothing" },
  { id: "accessories",  label: "Аксессуары",                emoji: "👜",  slug: "clothing" },
  { id: "beauty",       label: "Красота и уход",            emoji: "💄",  slug: "beauty" },
  { id: "health",       label: "Здоровье",                  emoji: "💊",  slug: "beauty" },
  { id: "home",         label: "Товары для дома",           emoji: "🏡",  slug: "home-garden" },
  { id: "build",        label: "Строительство и ремонт",    emoji: "🔨",  slug: null },
  { id: "auto",         label: "Автотовары",                emoji: "🚗",  slug: "auto" },
  { id: "kids",         label: "Детские товары",            emoji: "🧸",  slug: "kids" },
  { id: "hobby",        label: "Хобби и творчество",        emoji: "🎨",  slug: null },
  { id: "sport",        label: "Спорт и отдых",             emoji: "⚽",  slug: "sport" },
  { id: "food",         label: "Продукты питания",          emoji: "🥕",  slug: "food" },
  { id: "chem",         label: "Бытовая химия",             emoji: "🧴",  slug: null },
  { id: "office",       label: "Канцтовары",                emoji: "✏️",  slug: null },
  { id: "pets",         label: "Зоотовары",                 emoji: "🐾",  slug: null },
  { id: "books",        label: "Книги",                     emoji: "📖",  slug: null },
  { id: "garden",       label: "Дача, сад и огород",        emoji: "🌱",  slug: null },
  { id: "animals",      label: "Животные",                  emoji: "🐄",  slug: null },
];

const SORTS = [
  { key: "popular",    label: "Популярное" },
  { key: "newest",     label: "Новинки" },
  { key: "price_asc",  label: "Дешевле" },
  { key: "price_desc", label: "Дороже" },
  { key: "rating",     label: "Рейтинг" },
];

interface ActiveCat { label: string; slug: string | null }

interface Filters {
  minPrice: string;
  maxPrice: string;
  minRating: number | null;
  brand: string;
}

const RATINGS = [
  { label: "Любой", value: null },
  { label: "4+ ★", value: 4 },
  { label: "3+ ★", value: 3 },
  { label: "2+ ★", value: 2 },
];

export default function CatalogScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const c = useThemeColors();
  const isDark = useIsDark();
  const { cat_slug } = useLocalSearchParams<{ cat_slug?: string }>();
  const [apiBanners, setApiBanners] = useState<ApiBanner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState<ActiveCat | null>(null);
  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [subCats, setSubCats] = useState<Category[]>([]);
  const [activeSubCat, setActiveSubCat] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("popular");
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ minPrice: "", maxPrice: "", minRating: null, brand: "" });
  const [pendingFilters, setPendingFilters] = useState<Filters>({ minPrice: "", maxPrice: "", minRating: null, brand: "" });
  const pageRef = useRef(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<any>(null);
  const activeRef = useRef(active);
  const activeSubCatRef = useRef(activeSubCat);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { activeSubCatRef.current = activeSubCat; }, [activeSubCat]);

  const goBack = useCallback(() => {
    if (activeSubCatRef.current) {
      selectSubCat(null);
    } else {
      setActive(null);
      setActiveSubCat(null);
      setSubCats([]);
      setQ("");
      setFilters({ minPrice: "", maxPrice: "", minRating: null, brand: "" });
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("tabPress" as any, () => {
      if (activeRef.current) {
        setActive(null);
        setActiveSubCat(null);
        setSubCats([]);
        setQ("");
        setFilters({ minPrice: "", maxPrice: "", minRating: null, brand: "" });
      }
    });
    return unsub;
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeSubCatRef.current) { selectSubCat(null); return true; }
      if (activeRef.current) {
        setActive(null); setActiveSubCat(null); setSubCats([]); setQ("");
        setFilters({ minPrice: "", maxPrice: "", minRating: null, brand: "" });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []));

  const activeFilterCount = [filters.minPrice, filters.maxPrice, filters.brand, filters.minRating != null ? "1" : ""].filter(Boolean).length;

  useEffect(() => {
    api.get<Category[]>("/products/categories").then((r) => {
      setCategories(r.data);
      if (cat_slug) {
        const matched = r.data.find((c: Category) => c.slug === cat_slug);
        if (matched) {
          setActive({ label: matched.name, slug: matched.slug });
          setActiveCatId(matched.id);
        }
      }
    }).catch(() => {});
  }, [cat_slug]);

  useFocusEffect(useCallback(() => {
    api.get<ApiBanner[]>("/banners").then((r) => setApiBanners(r.data)).catch(() => {});
  }, []));

  const loadProducts = useCallback(async (
    reset: boolean,
    catId: number | null,
    subCatId: number | null,
    sortKey: string,
    search: string,
    f: Filters,
  ) => {
    const p = reset ? 1 : pageRef.current;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ sort: sortKey, page: String(p), limit: "20" });
      if (subCatId) params.set("category_id", String(subCatId));
      else if (catId) params.set("category_id", String(catId));
      if (search.trim()) params.set("q", search.trim());
      if (f.minPrice) params.set("min_price", f.minPrice);
      if (f.maxPrice) params.set("max_price", f.maxPrice);
      if (f.brand.trim()) params.set("brand", f.brand.trim());
      if (f.minRating != null) params.set("min_rating", String(f.minRating));
      const res = await api.get<ProductsResponse>(`/products?${params}`);
      if (reset) setProducts(res.data.items);
      else setProducts((prev) => [...prev, ...res.data.items]);
      setHasMore(res.data.page < res.data.pages);
      pageRef.current = p + 1;
    } catch {} finally { setLoading(false); setLoadingMore(false); }
  }, []);

  const openCat = async (label: string, slug: string | null, initialQ: string = "") => {
    const emptyFilters: Filters = { minPrice: "", maxPrice: "", minRating: null, brand: "" };
    setActive({ label, slug });
    setActiveSubCat(null);
    setSubCats([]);
    setProducts([]);
    setQ(initialQ);
    setSort("newest");
    setFilters(emptyFilters);
    setPendingFilters(emptyFilters);
    pageRef.current = 1;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    const cat = categories.find((c) => c.slug === slug);
    const catId = cat?.id ?? null;
    setActiveCatId(catId);
    api.get<ApiBanner[]>("/banners").then((r) => setApiBanners(r.data)).catch(() => {});
    if (catId) {
      api.get<Category[]>(`/products/categories/${catId}/subcategories`).then((r) => setSubCats(r.data)).catch(() => {});
    }
    loadProducts(true, catId, null, "newest", initialQ, emptyFilters);
  };

  const selectSubCat = (sub: Category | null) => {
    setActiveSubCat(sub);
    setProducts([]);
    pageRef.current = 1;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    loadProducts(true, activeCatId, sub?.id ?? null, sort, q, filters);
  };

  const applyFilters = () => {
    setFilters(pendingFilters);
    setShowFilters(false);
    setProducts([]);
    pageRef.current = 1;
    loadProducts(true, activeCatId, activeSubCat?.id ?? null, sort, q, pendingFilters);
  };

  const resetFilters = () => {
    const empty: Filters = { minPrice: "", maxPrice: "", minRating: null, brand: "" };
    setPendingFilters(empty);
    setFilters(empty);
    setShowFilters(false);
    setProducts([]);
    pageRef.current = 1;
    loadProducts(true, activeCatId, activeSubCat?.id ?? null, sort, q, empty);
  };

  // Debounced search
  const handleSearch = (text: string) => {
    setQ(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setProducts([]);
      pageRef.current = 1;
      loadProducts(true, activeCatId, activeSubCat?.id ?? null, sort, text, filters);
    }, 400);
  };

  useEffect(() => {
    if (!active) return;
    setProducts([]);
    pageRef.current = 1;
    loadProducts(true, activeCatId, activeSubCat?.id ?? null, sort, q, filters);
  }, [sort]);

  // ── Products view ──────────────────────────────────────────
  if (active) {
    const banner = apiBanners.find((b) => b.link_url === `category:${active.slug}`) ?? null;

    const ListHeader = (
      <View>
        {/* Banner */}
        <View style={{ marginHorizontal: 12, marginTop: 12, borderRadius: 20, overflow: "hidden" }}>
          {banner ? (
            <View style={{ backgroundColor: banner.bg_color, height: 250 }}>
              {banner.image_url ? (
                <>
                  <Image source={{ uri: imgUrl(banner.image_url) ?? "" }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", padding: 20, justifyContent: "flex-end" }}>
                    {banner.title ? <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>{banner.title}</Text> : null}
                    {banner.subtitle ? <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 3 }}>{banner.subtitle}</Text> : null}
                  </View>
                </>
              ) : (
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 }}>
                  <View style={{ flex: 1 }}>
                    {banner.title ? <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", lineHeight: 24 }}>{banner.title}</Text> : null}
                    {banner.subtitle ? <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 }}>{banner.subtitle}</Text> : null}
                  </View>
                  {banner.emoji ? <Text style={{ fontSize: 52, marginLeft: 12 }}>{banner.emoji}</Text> : null}
                </View>
              )}
            </View>
          ) : (
            <View style={{ backgroundColor: c.iconBg, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 80 }}>
              <Text style={{ color: c.text, fontSize: 20, fontWeight: "800" }}>{active.label}</Text>
            </View>
          )}
        </View>

        {/* Subcategories */}
        {subCats.length > 0 && (
          <View style={{ backgroundColor: c.card, marginTop: 10, paddingVertical: 14 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}>
              {[{ id: -1, name: "Все", slug: "" }, ...subCats].map((s) => {
                const sel = s.id === -1 ? !activeSubCat : activeSubCat?.id === s.id;
                const emoji = SUBCAT_EMOJI[s.slug] ?? "🏷️";
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => selectSubCat(s.id === -1 ? null : (s as Category))}
                    activeOpacity={0.7}
                    style={{ alignItems: "center", gap: 6, width: 68 }}
                  >
                    <View style={{
                      width: 52, height: 52, borderRadius: 16,
                      backgroundColor: sel ? "#8B5CF6" : c.iconBg,
                      alignItems: "center", justifyContent: "center",
                      shadowColor: sel ? "#8B5CF6" : "transparent",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                      elevation: sel ? 4 : 0,
                    }}>
                      <Text style={{ fontSize: s.id === -1 ? 20 : 22 }}>{s.id === -1 ? "✦" : emoji}</Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: sel ? "700" : "500", color: sel ? "#8B5CF6" : c.textMuted, textAlign: "center", lineHeight: 13 }} numberOfLines={2}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Sort + filter row */}
        <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flex: 1 }}>
            {SORTS.map((s) => {
              const sel = sort === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setSort(s.key)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: sel ? "#8B5CF6" : c.iconBg }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: sel ? "#fff" : c.textSub }}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            onPress={() => { setPendingFilters(filters); setShowFilters(true); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: activeFilterCount > 0 ? "#8B5CF6" : c.iconBg }}
          >
            <SlidersHorizontal size={14} color={activeFilterCount > 0 ? "#fff" : c.textSub} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: activeFilterCount > 0 ? "#fff" : c.textSub }}>
              {activeFilterCount > 0 ? `Фильтры · ${activeFilterCount}` : "Фильтры"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 8 }}>
            {filters.minPrice || filters.maxPrice ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, color: "#8B5CF6", fontWeight: "600" }}>
                  {filters.minPrice ? `${Number(filters.minPrice).toLocaleString()} сом.` : "0"} — {filters.maxPrice ? `${Number(filters.maxPrice).toLocaleString()} сом.` : "∞"}
                </Text>
              </View>
            ) : null}
            {filters.minRating != null && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef9c3", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                <Star size={11} color="#d97706" fill="#d97706" />
                <Text style={{ fontSize: 12, color: "#d97706", fontWeight: "600" }}>{filters.minRating}+</Text>
              </View>
            )}
            {filters.brand ? (
              <View style={{ backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "600" }}>{filters.brand}</Text>
              </View>
            ) : null}
            <TouchableOpacity onPress={resetFilters} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fee2e2", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
              <X size={11} color="#ef4444" />
              <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "600" }}>Сбросить</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    );

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={goBack}
              style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
            >
              <ArrowLeft size={18} color={c.textSub} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "800", color: c.text, flex: 1 }} numberOfLines={1}>
              {activeSubCat ? activeSubCat.name : active.label}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, gap: 8 }}>
            <Search size={15} color={c.textMuted} />
            <TextInput
              value={q}
              onChangeText={handleSearch}
              placeholder="Поиск в категории..."
              placeholderTextColor={c.textMuted}
              returnKeyType="search"
              style={{ flex: 1, paddingVertical: 9, fontSize: 13, color: c.text }}
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <X size={16} color={c.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={{ gap: 4, paddingHorizontal: 4 }}
          contentContainerStyle={{ paddingBottom: 32, gap: 8 }}
          ListHeaderComponent={ListHeader}
          onEndReached={() => { if (hasMore && !loading && !loadingMore) loadProducts(false, activeCatId, activeSubCat?.id ?? null, sort, q, filters); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            loading
              ? <SkeletonProductGrid rows={4} />
              : (
                <View style={{ alignItems: "center", paddingTop: 60 }}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>📦</Text>
                  <Text style={{ color: c.textMuted, fontSize: 14 }}>
                    {activeFilterCount > 0 || q ? "Ничего не найдено" : "Товаров пока нет"}
                  </Text>
                  {(activeFilterCount > 0 || q) && (
                    <TouchableOpacity onPress={resetFilters} style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.iconBg, borderRadius: 12 }}>
                      <Text style={{ fontSize: 13, color: c.textSub, fontWeight: "600" }}>Сбросить фильтры</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#8B5CF6" style={{ paddingVertical: 16 }} /> : null}
          renderItem={({ item }) => <View style={{ flex: 1 }}><ProductCard product={item} /></View>}
        />

        {/* Filter Modal */}
        <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
            <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Фильтры</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={c.textSub} />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

                {/* Price range */}
                <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 14 }}>Цена (сом.)</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>От</Text>
                      <TextInput
                        value={pendingFilters.minPrice}
                        onChangeText={(v) => setPendingFilters((f) => ({ ...f, minPrice: v.replace(/\D/g, "") }))}
                        placeholder="0"
                        placeholderTextColor={c.textMuted}
                        keyboardType="numeric"
                        style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: pendingFilters.minPrice ? "#8B5CF6" : c.border }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>До</Text>
                      <TextInput
                        value={pendingFilters.maxPrice}
                        onChangeText={(v) => setPendingFilters((f) => ({ ...f, maxPrice: v.replace(/\D/g, "") }))}
                        placeholder="999 999"
                        placeholderTextColor={c.textMuted}
                        keyboardType="numeric"
                        style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: pendingFilters.maxPrice ? "#8B5CF6" : c.border }}
                      />
                    </View>
                  </View>
                  {/* Quick price presets */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
                    {[["До 500", "", "500"], ["500–2000", "500", "2000"], ["2000–10000", "2000", "10000"], ["Выше 10000", "10000", ""]].map(([label, min, max]) => (
                      <TouchableOpacity
                        key={label}
                        onPress={() => setPendingFilters((f) => ({ ...f, minPrice: min, maxPrice: max }))}
                        style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: pendingFilters.minPrice === min && pendingFilters.maxPrice === max ? "#8B5CF6" : c.iconBg }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: pendingFilters.minPrice === min && pendingFilters.maxPrice === max ? "#fff" : c.textSub }}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Rating */}
                <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 14 }}>Рейтинг</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {RATINGS.map((r) => {
                      const sel = pendingFilters.minRating === r.value;
                      return (
                        <TouchableOpacity
                          key={String(r.value)}
                          onPress={() => setPendingFilters((f) => ({ ...f, minRating: r.value }))}
                          style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: sel ? "#8B5CF6" : c.iconBg }}
                        >
                          {r.value != null && <Star size={13} color={sel ? "#fbbf24" : c.textMuted} fill={sel ? "#fbbf24" : c.textMuted} />}
                          <Text style={{ fontSize: 12, fontWeight: "700", color: sel ? "#fff" : c.textSub, marginTop: 3 }}>{r.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Brand */}
                <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 14 }}>Бренд</Text>
                  <TextInput
                    value={pendingFilters.brand}
                    onChangeText={(v) => setPendingFilters((f) => ({ ...f, brand: v }))}
                    placeholder="Например: Samsung, Nike..."
                    placeholderTextColor={c.textMuted}
                    style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: pendingFilters.brand ? "#8B5CF6" : c.border }}
                  />
                </View>

              </ScrollView>
            </KeyboardAvoidingView>

            <View style={{ padding: 16, paddingBottom: 32, gap: 10, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border }}>
              <TouchableOpacity onPress={applyFilters} style={{ backgroundColor: "#8B5CF6", paddingVertical: 15, borderRadius: 16, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Применить</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetFilters} style={{ paddingVertical: 13, borderRadius: 16, alignItems: "center", backgroundColor: c.iconBg }}>
                <Text style={{ color: c.textSub, fontWeight: "600", fontSize: 14 }}>Сбросить всё</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  const CAT_COLORS = [
    { bg: "#ede9fe", icon: "#7c3aed" },
    { bg: "#fce7f3", icon: "#db2777" },
    { bg: "#ffedd5", icon: "#ea580c" },
    { bg: "#dcfce7", icon: "#16a34a" },
    { bg: "#dbeafe", icon: "#0284c7" },
    { bg: "#f3e8ff", icon: "#9333ea" },
    { bg: "#fee2e2", icon: "#dc2626" },
    { bg: "#fef9c3", icon: "#ca8a04" },
    { bg: "#cffafe", icon: "#0891b2" },
    { bg: "#e0e7ff", icon: "#4f46e5" },
    { bg: "#fce7f3", icon: "#be185d" },
    { bg: "#dcfce7", icon: "#15803d" },
    { bg: "#fef3c7", icon: "#b45309" },
    { bg: "#ede9fe", icon: "#7c3aed" },
    { bg: "#dbeafe", icon: "#0369a1" },
    { bg: "#ffedd5", icon: "#c2410c" },
    { bg: "#f3e8ff", icon: "#6d28d9" },
    { bg: "#d1fae5", icon: "#047857" },
    { bg: "#dbeafe", icon: "#1d4ed8" },
    { bg: "#fee2e2", icon: "#b91c1c" },
    { bg: "#fef3c7", icon: "#92400e" },
    { bg: "#d1fae5", icon: "#065f46" },
  ];

  const colSize = (SW - 24 - 8) / 3;

  // ── Category browser ──────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: c.text, marginBottom: 12 }}>Каталог</Text>
        <TouchableOpacity onPress={() => router.push("/search" as any)} activeOpacity={0.85}
          style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#1e1b4b" : "#ede9fe", borderRadius: 26, paddingHorizontal: 16, height: 46, gap: 10 }}>
          <Search size={16} color="#8B5CF6" />
          <Text style={{ flex: 1, fontSize: 14, color: "#8B5CF6", fontWeight: "500" }}>Поиск товаров...</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 88, paddingHorizontal: 12 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {CATS.map((cat, i) => {
            const palette = CAT_COLORS[i % CAT_COLORS.length];
            const bg = isDark ? palette.icon + "22" : palette.bg;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => openCat(cat.label, cat.slug)}
                activeOpacity={0.75}
                style={{
                  width: colSize,
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                  backgroundColor: c.card,
                  borderRadius: 16,
                  gap: 8,
                }}
              >
                <View style={{
                  width: 54, height: 54, borderRadius: 16,
                  backgroundColor: bg,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 28 }}>{cat.emoji}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.text, textAlign: "center", lineHeight: 14 }} numberOfLines={2}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
