import { useEffect, useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator,
  Dimensions, Animated, Share, Modal, Alert,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft, Heart, Star, ShoppingCart, Plus, Minus,
  Clock, Store, ChevronRight, MessageCircle,
  Share2, ChevronDown, ChevronUp, Flag, X,
  Truck, RotateCcw, ShieldCheck, Package, BadgeCheck, FileText,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api, { Product, ProductsResponse, API_URL, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import ProductCard from "@/components/ProductCard";
import { useThemeColors, useIsDark } from "@/lib/theme";
import { SkeletonProductDetail } from "@/components/Skeleton";

const { width } = Dimensions.get("window");
const P = "#2563EB";

const SIZE_NUMBER_MAP: Record<string, string> = {
  "XS": "44", "S": "46", "M": "48", "L": "50",
  "XL": "52", "XXL": "54", "3XL": "56", "4XL": "58", "5XL": "60",
};

const COLOR_MAP: Record<string, string> = {
  "Красный": "#ef4444", "Розовый": "#ec4899", "Оранжевый": "#f97316",
  "Жёлтый": "#eab308", "Зелёный": "#22c55e", "Голубой": "#38bdf8",
  "Синий": "#3b82f6", "Фиолетовый": "#2563EB", "Чёрный": "#111827",
  "Тёмно-серый": "#6b7280", "Серый": "#d1d5db", "Белый": "#f9fafb",
  "Коричневый": "#92400e", "Бежевый": "#d4b896", "Бордовый": "#881337",
  "Хаки": "#84754e", "Золотой": "#d97706", "Серебряный": "#9ca3af",
};

interface Shop {
  id: number; username: string; shop_name?: string;
  shop_logo_url?: string; rating?: number; reviews_count?: number;
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} color={s <= Math.round(rating) ? "#facc15" : "#e5e7eb"} fill={s <= Math.round(rating) ? "#facc15" : "#e5e7eb"} />
      ))}
    </View>
  );
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const isDark = useIsDark();
  const user = useAuthStore((s) => s.user);
  const { items, add, updateQty } = useCartStore();
  const favToggle = useFavoritesStore((s) => s.toggle);
  const favIds = useFavoritesStore((s) => s.ids);

  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [recProducts, setRecProducts] = useState<Product[]>([]);
  const [recPage, setRecPage] = useState(2);
  const [recHasMore, setRecHasMore] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const recLoadingRef = useRef(false);
  const [activeImage, setActiveImage] = useState(0);
  const [inWaitlist, setInWaitlist] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);

  const imgScrollRef = useRef<FlatList>(null);
  const favScale = useRef(new Animated.Value(1)).current;
  const isFav = product ? !!favIds[product.id] : false;
  const cartItem = product ? items.find((i) => {
    if (i.product.id !== product.id) return false;
    const ia = i.selected_attrs || {};
    return Object.entries(selectedAttrs).every(([k, v]) => ia[k] === v) &&
      Object.entries(ia).every(([k, v]) => selectedAttrs[k] === v);
  }) : null;
  const inCart = !!cartItem;

  const handleFav = () => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!product) return;
    Animated.sequence([
      Animated.spring(favScale, { toValue: 1.5, useNativeDriver: true, speed: 50 }),
      Animated.spring(favScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    favToggle(product);
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({ message: `${product.title}\n${product.price.toLocaleString()} сом. | AZA Market` });
    } catch {}
  };

  useEffect(() => {
    setProduct(null);
    setActiveImage(0);
    setSelectedAttrs({});
    setRecProducts([]);
    setRecPage(2);
    setRecHasMore(false);
    api.get<Product>(`/products/${id}`).then((r) => {
      setProduct(r.data);
      // Init selected attrs with first value of each
      if (r.data.attributes) {
        const init: Record<string, string> = {};
        Object.entries(r.data.attributes).forEach(([k, v]) => {
          const vals = String(v).split(",").map((x) => x.trim()).filter(Boolean);
          if (vals.length > 0) init[k] = vals[0];
        });
        setSelectedAttrs(init);
      }
      api.get<Shop>(`/shop/${r.data.seller_id}`).then((s) => setShop(s.data)).catch(() => {});
      api.get<any[]>(`/products/${id}/reviews`).then((r) => {
        const photos = r.data.flatMap((rv: any) => rv.images || []).filter(Boolean);
        setReviewPhotos(photos);
      }).catch(() => {});
      api.get<ProductsResponse>(`/products?limit=10&page=1&sort=newest`).then((s) => {
        const items = s.data.items.filter((p) => p.id !== r.data.id);
        setRecProducts(items);
        setRecHasMore(s.data.page < s.data.pages);
        setRecPage(2);
      }).catch(() => {});
    });
    if (user) api.get<any[]>("/waitlist").then((r) => setInWaitlist(r.data.some((w: any) => w.product_id === Number(id)))).catch(() => {});
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) { router.push("/(auth)/login"); return; }
    setAdding(true);
    try { await add(product!, 1, Object.keys(selectedAttrs).length > 0 ? { ...selectedAttrs } : undefined); Toast.show({ type: "success", text1: "Добавлено в корзину!" }); }
    catch { Toast.show({ type: "error", text1: "Ошибка при добавлении" }); }
    finally { setAdding(false); }
  };

  const toggleWaitlist = async () => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (inWaitlist) {
      await api.delete(`/waitlist/${id}`).catch(() => {});
      setInWaitlist(false);
      Toast.show({ type: "success", text1: "Удалено из листа ожидания" });
    } else {
      await api.post(`/waitlist/${id}`).catch(() => {});
      setInWaitlist(true);
      Toast.show({ type: "success", text1: "Уведомим когда появится!" });
    }
  };

  const sendReport = async () => {
    if (!reportReason.trim()) { Alert.alert("Укажите причину"); return; }
    setReportSending(true);
    try {
      await api.post("/admin/reports", { type: "product", target_id: Number(id), reason: reportReason.trim() });
      setReportVisible(false);
      setReportReason("");
      Toast.show({ type: "success", text1: "Жалоба отправлена" });
    } catch { Toast.show({ type: "error", text1: "Ошибка отправки" }); }
    finally { setReportSending(false); }
  };

  const scrollToImage = (i: number) => {
    imgScrollRef.current?.scrollToIndex({ index: i, animated: true });
    setActiveImage(i);
  };

  const loadMoreRec = () => {
    if (recLoadingRef.current || !recHasMore || !product) return;
    recLoadingRef.current = true;
    setRecLoading(true);
    api.get<ProductsResponse>(`/products?limit=10&page=${recPage}&sort=newest`)
      .then((s) => {
        const items = s.data.items.filter((p) => p.id !== product.id);
        setRecProducts((prev) => [...prev, ...items]);
        setRecHasMore(s.data.page < s.data.pages);
        setRecPage((p) => p + 1);
      })
      .catch(() => {})
      .finally(() => { setRecLoading(false); recLoadingRef.current = false; });
  };

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 500) {
      loadMoreRec();
    }
  };

  if (!product) return <SkeletonProductDetail />;

  const images = product.images.length > 0 ? product.images : [];
  const descText = product.description || product.about || "";
  const descLong = descText.length > 200;

  // Parse attributes into multi-value if comma-separated
  const attrEntries = product.attributes
    ? Object.entries(product.attributes).map(([k, v]) => ({
        key: k,
        values: String(v).split(",").map((x) => x.trim()).filter(Boolean),
      }))
    : [];

  // Compute visible images based on selected color
  const colorValues = product.attributes?.["Цвет"]
    ? String(product.attributes["Цвет"]).split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const selectedColorIdx = colorValues.length > 0
    ? Math.max(0, colorValues.indexOf(selectedAttrs["Цвет"] ?? colorValues[0]))
    : 0;
  const activeVariant = product.variants?.find(v => v.index === selectedColorIdx) ?? null;
  const displayPrice = activeVariant?.price ?? product.price;
  const displayOriginal = activeVariant?.original_price ?? product.original_price ?? null;
  const discount = displayOriginal && displayOriginal > displayPrice
    ? Math.round((1 - displayPrice / displayOriginal) * 100) : null;
  const imgsPerColor = colorValues.length > 1
    ? Math.max(1, Math.ceil(images.length / colorValues.length))
    : images.length;
  const hasVariantIndex = images.some(img => img.variant_index != null);
  const visibleImages = colorValues.length > 1
    ? hasVariantIndex
      ? images.filter(img => img.variant_index === selectedColorIdx)
      : images.slice(selectedColorIdx * imgsPerColor, (selectedColorIdx + 1) * imgsPerColor)
    : images;

  const specs: { key: string; value: string }[] = [];
  specs.push({ key: "Артикул", value: product.sku || `AZA-${String(product.id).padStart(5, "0")}` });
  if (product.barcode) specs.push({ key: "Штрихкод", value: product.barcode });
  if (product.brand) specs.push({ key: "Бренд", value: product.brand });
  if (product.category?.name) specs.push({ key: "Категория", value: product.category.name });
  attrEntries.forEach(({ key, values }) => specs.push({ key, value: values.join(", ") }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {/* Floating top buttons */}
      <View style={{ position: "absolute", top: 52, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, zIndex: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity onPress={handleShare} style={{ width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
            <Share2 size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFav} style={{ width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={{ transform: [{ scale: favScale }] }}>
              <Heart size={20} color={isFav ? "#ef4444" : "#6b7280"} fill={isFav ? "#ef4444" : "transparent"} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={handleScroll}
        scrollEventThrottle={300}
      >

        {/* Image gallery */}
        <View style={{ backgroundColor: c.iconBg }}>
          {visibleImages.length > 0 ? (
            <FlatList
              ref={imgScrollRef}
              data={visibleImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={width}
              snapToAlignment="center"
              keyExtractor={(img) => String(img.id)}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
              style={{ height: width * (4 / 3) }}
              renderItem={({ item: img }) => (
                <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width, height: width * (4 / 3) }} contentFit="cover" />
              )}
            />
          ) : (
            <View style={{ width, height: width * (4 / 3), alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 80 }}>📦</Text>
            </View>
          )}
          {/* Dot indicators */}
          {visibleImages.length > 1 && (
            <View style={{ position: "absolute", bottom: 10, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {visibleImages.map((_, i) => (
                <View key={i} style={{ width: i === activeImage ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeImage ? "#fff" : "rgba(255,255,255,0.5)" }} />
              ))}
            </View>
          )}
          {/* Thumbnail strip */}
          {visibleImages.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
              {visibleImages.map((img, i) => (
                <TouchableOpacity key={img.id} onPress={() => scrollToImage(i)}>
                  <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", borderWidth: 2.5, borderColor: i === activeImage ? P : "transparent" }}>
                    <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: 56, height: 56 }} contentFit="cover" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Price & Title */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: c.card, gap: 10 }}>
          {product.brand && (
            <View style={{ alignSelf: "flex-start", backgroundColor: "#f0f0ff", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: P, letterSpacing: 0.5 }}>{product.brand.toUpperCase()}</Text>
            </View>
          )}
          <Text style={{ fontSize: 20, fontWeight: "700", color: c.text, lineHeight: 27 }}>{product.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
            <Text style={{ fontSize: 32, fontWeight: "900", color: P }}>{displayPrice.toLocaleString()} сом.</Text>
            {displayOriginal && displayOriginal > displayPrice && (
              <Text style={{ fontSize: 16, color: c.textMuted, textDecorationLine: "line-through", marginBottom: 4 }}>
                {displayOriginal.toLocaleString()}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: product.stock > 0 ? "#22c55e" : "#f87171" }} />
              <Text style={{ fontSize: 13, color: product.stock > 0 ? "#16a34a" : "#ef4444", fontWeight: "500" }}>
                {product.stock > 0 ? `В наличии · ${product.stock} шт.` : "Нет в наличии"}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: "#6b7280" }}>· Продано {product.sales_count ?? 0} шт.</Text>
          </View>
        </View>

        {/* Rating card */}
        <TouchableOpacity
          onPress={() => router.push(`/reviews/${id}` as any)}
          activeOpacity={0.8}
          style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: c.card, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 36, fontWeight: "900", color: c.text }}>{product.reviews_count > 0 ? product.rating.toFixed(1) : "0.0"}</Text>
              <View>
                <Stars rating={product.rating} size={16} />
                <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>
                  {product.reviews_count} отзывов
                  {product.sales_count ? ` · ${product.sales_count > 100 ? "100+" : product.sales_count} заказов` : ""}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
            {reviewPhotos.slice(0, 2).map((url, i) => (
              <View key={i} style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", backgroundColor: c.iconBg }}>
                <Image source={{ uri: imgUrl(url) ?? "" }} style={{ width: 44, height: 44 }} contentFit="cover" />
              </View>
            ))}
            {reviewPhotos.length > 2 && (
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSub }}>+{reviewPhotos.length - 2}</Text>
              </View>
            )}
            <ChevronRight size={16} color={c.textMuted} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>


        {/* Attribute selectors */}
        {attrEntries.filter((a) => a.values.length >= 1).map(({ key, values }) => {
          const isColor = key === "Цвет";
          const isSize  = key === "Размер";
          const chosen  = selectedAttrs[key] ?? values[0];

          if (isColor) return (
            <View key={key} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: c.textSub }}>{chosen}</Text>
                <Text style={{ fontSize: 14, color: P, fontWeight: "600" }}>Все {values.length}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {values.map((val, i) => {
                  const img = images[i * imgsPerColor] ?? images[i];
                  const sel = chosen === val;
                  const hex = COLOR_MAP[val] ?? "#9ca3af";
                  return (
                    <TouchableOpacity key={val}
                      onPress={() => { setSelectedAttrs((prev) => ({ ...prev, [key]: val })); setActiveImage(0); imgScrollRef.current?.scrollToIndex({ index: 0, animated: true }); }}
                      style={{ width: 70, height: 70, borderRadius: 16, overflow: "hidden", borderWidth: sel ? 3 : 1.5, borderColor: sel ? P : "transparent" }}>
                      {img ? (
                        <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                      ) : (
                        <View style={{ flex: 1, backgroundColor: hex }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );

          if (isSize) return (
            <View key={key} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: c.textMuted }}>Соответствует размеру</Text>
                <Text style={{ fontSize: 13, color: P, fontWeight: "600" }}>Таблица размеров</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {Object.keys(SIZE_NUMBER_MAP).map((val) => {
                  const available = values.includes(val);
                  const sel = chosen === val;
                  const num = SIZE_NUMBER_MAP[val];
                  return (
                    <TouchableOpacity key={val}
                      onPress={() => available && setSelectedAttrs((prev) => ({ ...prev, [key]: val }))}
                      activeOpacity={available ? 0.7 : 1}
                      style={{ width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", opacity: available ? 1 : 0.35,
                        backgroundColor: sel ? "#2d2d3a" : isDark ? "#1e293b" : "#f3f4f6" }}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: sel ? "#fff" : c.text }}>{val}</Text>
                      {num && <Text style={{ fontSize: 12, color: sel ? "#a5b4fc" : c.textMuted, marginTop: 2 }}>{num}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );

          if (values.length < 2) return null;
          return (
            <View key={key} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 14, color: c.textSub, marginBottom: 10 }}>
                {key}: <Text style={{ fontWeight: "700", color: c.text }}>{chosen}</Text>
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {values.map((val) => {
                  const sel = chosen === val;
                  return (
                    <TouchableOpacity key={val} onPress={() => setSelectedAttrs((prev) => ({ ...prev, [key]: val }))}
                      style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: sel ? P : c.border, backgroundColor: sel ? "#f0f0ff" : c.card }}>
                      <Text style={{ fontSize: 14, fontWeight: sel ? "700" : "500", color: sel ? P : c.textSub }}>{val}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* О товаре */}
        {descText.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 10 }}>О товаре</Text>
            <Text style={{ fontSize: 14, color: c.textSub, lineHeight: 22 }} numberOfLines={showFullDesc || !descLong ? undefined : 6}>
              {descText}
            </Text>
            {descLong && (
              <TouchableOpacity onPress={() => setShowFullDesc((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                <Text style={{ color: P, fontWeight: "600", fontSize: 14 }}>{showFullDesc ? "Свернуть" : "Далее"}</Text>
                {showFullDesc ? <ChevronUp size={14} color={P} /> : <ChevronDown size={14} color={P} />}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Characteristics */}
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}>
          <TouchableOpacity
            onPress={() => setShowSpecs((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>Характеристики</Text>
            {showSpecs ? <ChevronUp size={18} color={c.textMuted} /> : <ChevronDown size={18} color={c.textMuted} />}
          </TouchableOpacity>
          {showSpecs && (
            <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
              {specs.map((s, i) => (
                <View key={s.key} style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: i % 2 === 0 ? c.inputBg : c.card }}>
                  <Text style={{ flex: 1, fontSize: 13, color: c.textMuted }}>{s.key}</Text>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: c.text, textAlign: "right" }}>{s.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Delivery */}
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>Доставка</Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: !product.delivery_price ? "#dcfce7" : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
              <Truck size={18} color={!product.delivery_price ? "#16a34a" : "#6b7280"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: !product.delivery_price ? "#16a34a" : c.text }}>
                {!product.delivery_price ? "Бесплатная доставка" : `Доставка ${product.delivery_price.toLocaleString()} сом.`}
              </Text>
              <Text style={{ fontSize: 13, color: c.textSub, marginTop: 2, lineHeight: 18 }}>1–3 рабочих дня · по всему Таджикистану</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: c.border }} />
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <Package size={20} color="#f59e0b" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Можно примерить при получении</Text>
              <Text style={{ fontSize: 13, color: c.textSub, marginTop: 2, lineHeight: 18 }}>Проверьте товар перед оплатой. Если не подойдёт — откажитесь бесплатно</Text>
            </View>
          </View>
        </View>

        {/* Return & Guarantee */}
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>Возврат и гарантия</Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" }}>
              <RotateCcw size={18} color={P} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>10 дней на возврат</Text>
              <Text style={{ fontSize: 13, color: c.textSub, marginTop: 2, lineHeight: 18 }}>Если передумаете — вернём деньги. Сохраните товарный вид и упаковку</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: c.border }} />
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={18} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Гарантия 6 месяцев</Text>
              <Text style={{ fontSize: 13, color: c.textSub, marginTop: 2, lineHeight: 18 }}>Вернём деньги или заменим товар, если возникнет проблема</Text>
            </View>
          </View>
        </View>

        {/* Authenticity documents */}
        {product.documents && product.documents.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} color="#2563EB" />
              <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>Документы на товар</Text>
            </View>
            {product.documents.map((doc) => {
              const docLabel = doc.doc_type === "certificate" ? "Сертификат" : doc.doc_type === "invoice" ? "Инвойс поставщика" : "Документ";
              return (
                <View key={doc.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#eff6ff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                  <FileText size={18} color="#2563EB" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#1D4ED8" }}>{docLabel}</Text>
                    {doc.filename && <Text style={{ fontSize: 11, color: "#3B82F6", marginTop: 2 }} numberOfLines={1}>{doc.filename}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Seller */}
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: c.card, borderRadius: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 14 }}>Продавец</Text>
          <TouchableOpacity
            onPress={() => router.push(`/shop/${product.seller_id}` as any)}
            activeOpacity={0.8}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {shop?.shop_logo_url
                ? <Image source={{ uri: imgUrl(shop.shop_logo_url) ?? "" }} style={{ width: 56, height: 56 }} contentFit="cover" />
                : <Store size={24} color="#2563EB" />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>{shop?.shop_name || shop?.username || "Магазин"}</Text>
                {product.seller_verified && (
                  <BadgeCheck size={16} color="#2563EB" />
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Star size={13} color="#facc15" fill="#facc15" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }}>{shop?.rating?.toFixed(1) ?? "—"}</Text>
                {shop?.reviews_count ? <Text style={{ fontSize: 12, color: c.textMuted }}>{shop.reviews_count.toLocaleString()} оценок</Text> : null}
              </View>
            </View>
            <ChevronRight size={16} color={c.border} />
          </TouchableOpacity>

          {user && user.id !== product.seller_id && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  const res = await api.post<{ id: number }>("/chats", { seller_id: product.seller_id, product_id: product.id });
                  router.push(`/chat/${res.data.id}` as any);
                } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
              }}
              style={{ backgroundColor: c.iconBg, borderRadius: 14, paddingVertical: 13, alignItems: "center" }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.textSub }}>Спросить продавца</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Report */}
        {user && user.id !== product.seller_id && (
          <TouchableOpacity
            onPress={() => setReportVisible(true)}
            style={{ marginHorizontal: 16, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 }}
          >
            <Flag size={13} color={c.textMuted} />
            <Text style={{ fontSize: 12, color: c.textMuted }}>Пожаловаться на товар</Text>
          </TouchableOpacity>
        )}

        {/* Recommendations */}
        {recProducts.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.text, paddingHorizontal: 16, marginBottom: 10 }}>Похожие товары</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, paddingHorizontal: 4 }}>
              {recProducts.map((p) => (
                <View key={p.id} style={{ width: (width - 12) / 2 }}>
                  <ProductCard product={p} />
                </View>
              ))}
            </View>
            {recLoading && <ActivityIndicator color={P} style={{ marginVertical: 20 }} />}
          </View>
        )}
      </ScrollView>

      {/* Report Modal */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setReportVisible(false)} />
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Пожаловаться на товар</Text>
              <TouchableOpacity onPress={() => setReportVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            {["Поддельный товар", "Неверное описание", "Запрещённый товар", "Мошенничество", "Другое"].map((reason) => (
              <TouchableOpacity key={reason} onPress={() => setReportReason(reason)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: c.border }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: reportReason === reason ? P : c.border, backgroundColor: reportReason === reason ? P : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {reportReason === reason && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />}
                </View>
                <Text style={{ fontSize: 14, color: c.text }}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={sendReport} disabled={reportSending || !reportReason}
              style={{ marginTop: 20, backgroundColor: reportReason ? P : c.iconBg, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
              {reportSending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontWeight: "700", color: reportReason ? "#fff" : c.textMuted, fontSize: 15 }}>Отправить жалобу</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom bar */}
      {user?.role !== "seller" && user?.role !== "admin" && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flexShrink: 0 }}>
              <Text style={{ fontSize: 11, color: c.textMuted }}>Итого</Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: P }}>
                {(displayPrice * (cartItem?.quantity || 1)).toLocaleString()} сом.
              </Text>
            </View>
            {product.stock === 0 ? (
              <TouchableOpacity onPress={toggleWaitlist} style={{ flex: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, backgroundColor: inWaitlist ? c.iconBg : P }}>
                <Clock size={18} color={inWaitlist ? c.textSub : "#fff"} />
                <Text style={{ fontWeight: "700", fontSize: 14, color: inWaitlist ? c.textSub : "#fff" }}>{inWaitlist ? "В листе ожидания" : "Уведомить о наличии"}</Text>
              </TouchableOpacity>
            ) : inCart ? (
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 2, borderColor: P, borderRadius: 16, overflow: "hidden" }}>
                <TouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity - 1)} style={{ width: 56, alignItems: "center", justifyContent: "center", paddingVertical: 14 }}>
                  <Minus size={18} color={P} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: "900", color: P }}>{cartItem!.quantity}</Text>
                <TouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity + 1)} style={{ width: 56, alignItems: "center", justifyContent: "center", paddingVertical: 14 }}>
                  <Plus size={18} color={P} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleAddToCart} disabled={adding} style={{ flex: 1, backgroundColor: P, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 }}>
                {adding ? <ActivityIndicator color="#fff" size="small" /> : <ShoppingCart size={18} color="#fff" />}
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>В корзину</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
