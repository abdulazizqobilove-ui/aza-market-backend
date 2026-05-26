import { useEffect, useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Dimensions, Animated, Share, Modal, Alert,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft, Heart, Star, ShoppingCart, Plus, Minus,
  Clock, Truck, Shield, Store, ChevronRight, MessageCircle,
  Share2, ChevronDown, ChevronUp, Flag, X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api, { Product, API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import ProductCard from "@/components/ProductCard";

const { width } = Dimensions.get("window");

interface Shop { id: number; username: string; shop_name?: string; shop_logo_url?: string; }

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
  const user = useAuthStore((s) => s.user);
  const { items, add, updateQty } = useCartStore();
  const favToggle = useFavoritesStore((s) => s.toggle);
  const favIds = useFavoritesStore((s) => s.ids);

  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [inWaitlist, setInWaitlist] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showSpecs, setShowSpecs] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);

  const imgScrollRef = useRef<ScrollView>(null);
  const favScale = useRef(new Animated.Value(1)).current;
  const isFav = !!favIds[Number(id)];
  const cartItem = product ? items.find((i) => i.product.id === product.id) : null;
  const inCart = !!cartItem;

  const handleFav = () => {
    if (!user) { router.push("/(auth)/login"); return; }
    Animated.sequence([
      Animated.spring(favScale, { toValue: 1.5, useNativeDriver: true, speed: 50 }),
      Animated.spring(favScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    favToggle(Number(id));
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `${product.title}\n${product.price.toLocaleString()} сом. | AZA Market`,
      });
    } catch {}
  };

  useEffect(() => {
    setProduct(null);
    setActiveImage(0);
    api.get<Product>(`/products/${id}`).then((r) => {
      setProduct(r.data);
      api.get<Shop>(`/shop/${r.data.seller_id}`).then((s) => setShop(s.data)).catch(() => {});
      api.get(`/products?category=${r.data.category?.id}&limit=6`).then((s: any) => {
        setRelated(s.data.items.filter((p: Product) => p.id !== r.data.id).slice(0, 6));
      }).catch(() => {});
    });
    if (user) api.get<any[]>("/waitlist").then((r) => setInWaitlist(r.data.some((w: any) => w.product_id === Number(id)))).catch(() => {});
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) { router.push("/(auth)/login"); return; }
    setAdding(true);
    try { await add(product!.id, 1); Toast.show({ type: "success", text1: "Добавлено в корзину!" }); }
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
      Toast.show({ type: "success", text1: "Жалоба отправлена", text2: "Мы рассмотрим её в ближайшее время" });
    } catch { Toast.show({ type: "error", text1: "Ошибка отправки" }); }
    finally { setReportSending(false); }
  };

  const scrollToImage = (i: number) => {
    imgScrollRef.current?.scrollTo({ x: i * width, animated: true });
    setActiveImage(i);
  };

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;
  const images = product.images.length > 0 ? product.images : [];
  const descLong = (product.description || "").length > 150;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Back / fav buttons */}
      <View className="absolute top-12 left-0 right-0 flex-row justify-between px-4 z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm">
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={handleShare} className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm">
            <Share2 size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFav} className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm">
            <Animated.View style={{ transform: [{ scale: favScale }] }}>
              <Heart size={20} color={isFav ? "#ef4444" : "#6b7280"} fill={isFav ? "#ef4444" : "transparent"} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Image gallery */}
        <View style={{ backgroundColor: "#f9fafb" }}>
          <ScrollView
            ref={imgScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
            style={{ height: 340 }}
          >
            {images.length > 0 ? images.map((img) => (
              <Image key={img.id} source={{ uri: `${API_URL}${img.url}` }} style={{ width, height: 340 }} contentFit="contain" />
            )) : (
              <View style={{ width, height: 340 }} className="items-center justify-center">
                <Text style={{ fontSize: 80 }}>📦</Text>
              </View>
            )}
          </ScrollView>

          {discount && (
            <View className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-xl shadow-sm">
              <Text className="text-white text-sm font-bold">-{discount}%</Text>
            </View>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
              {images.map((img, i) => (
                <TouchableOpacity key={img.id} onPress={() => scrollToImage(i)}>
                  <View style={{
                    width: 52, height: 52, borderRadius: 10, overflow: "hidden",
                    borderWidth: 2, borderColor: i === activeImage ? "#2563EB" : "transparent",
                  }}>
                    <Image source={{ uri: `${API_URL}${img.url}` }} style={{ width: 52, height: 52 }} contentFit="cover" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product info */}
        <View className="px-4 pt-4 pb-2 bg-white">
          {product.brand && (
            <View className="self-start bg-blue-50 px-3 py-1 rounded-full mb-2">
              <Text className="text-xs font-bold text-blue-600 uppercase tracking-wide">{product.brand}</Text>
            </View>
          )}
          <Text className="text-xl font-bold text-gray-900 leading-tight">{product.title}</Text>

          <View className="flex-row items-end gap-3 mt-3">
            <Text style={{ fontSize: 30, fontWeight: "900", color: "#2563EB" }}>{product.price.toLocaleString()} сом.</Text>
            {product.original_price && product.original_price > product.price && (
              <Text className="text-base text-gray-400 line-through mb-1">{product.original_price.toLocaleString()} сом.</Text>
            )}
          </View>

          <View className="flex-row items-center gap-2 mt-1.5">
            <View className={`w-2 h-2 rounded-full ${product.stock > 0 ? "bg-green-500" : "bg-red-400"}`} />
            <Text className={`text-sm font-medium ${product.stock > 0 ? "text-green-600" : "text-red-500"}`}>
              {product.stock > 0 ? `В наличии: ${product.stock} шт.` : "Нет в наличии"}
            </Text>
          </View>

          {/* Reviews row → opens full screen */}
          <TouchableOpacity
            onPress={() => router.push(`/reviews/${id}` as any)}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Stars rating={product.rating} size={13} />
              {product.reviews_count > 0 ? (
                <>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>{product.rating.toFixed(1)}</Text>
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>· {product.reviews_count} отзывов</Text>
                </>
              ) : (
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>Нет отзывов · оставьте первый</Text>
              )}
            </View>
            <ChevronRight size={15} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Delivery */}
        <View className="mx-4 mt-3 bg-blue-50 rounded-2xl px-4 py-3 flex-row gap-0">
          <View className="flex-1 flex-row items-center gap-2">
            <Truck size={17} color="#2563EB" />
            <View>
              <Text className="text-xs font-semibold text-blue-800">Бесплатно</Text>
              <Text className="text-xs text-blue-600">Доставка по Таджикистану</Text>
            </View>
          </View>
          <View className="flex-1 flex-row items-center gap-2">
            <Shield size={17} color="#2563EB" />
            <View>
              <Text className="text-xs font-semibold text-blue-800">Гарантия</Text>
              <Text className="text-xs text-blue-600">Безопасная оплата</Text>
            </View>
          </View>
        </View>

        {/* Shop */}
        <TouchableOpacity
          onPress={() => router.push(`/shop/${product.seller_id}` as any)}
          className="mx-4 mt-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 flex-row items-center gap-3 shadow-sm"
        >
          <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center overflow-hidden">
            {shop?.shop_logo_url
              ? <Image source={{ uri: `${API_URL}${shop.shop_logo_url}` }} className="w-full h-full" contentFit="cover" />
              : <Store size={22} color="#2563EB" />}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-900">{shop?.shop_name || shop?.username || "Магазин"}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">Перейти в магазин продавца</Text>
          </View>
          <ChevronRight size={16} color="#d1d5db" />
        </TouchableOpacity>

        {/* Chat with seller */}
        {user && user.id !== product.seller_id && (
          <TouchableOpacity
            onPress={async () => {
              try {
                const res = await api.post<{ id: number }>("/chats", { seller_id: product.seller_id, product_id: product.id });
                router.push(`/chat/${res.data.id}` as any);
              } catch {
                Toast.show({ type: "error", text1: "Ошибка" });
              }
            }}
            style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f0fdf4", borderRadius: 16, paddingVertical: 13, borderWidth: 1.5, borderColor: "#bbf7d0" }}
          >
            <MessageCircle size={18} color="#16a34a" />
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#16a34a" }}>Написать продавцу</Text>
          </TouchableOpacity>
        )}

        {/* Report button */}
        {user && user.id !== product.seller_id && (
          <TouchableOpacity
            onPress={() => setReportVisible(true)}
            style={{ marginHorizontal: 16, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 }}
          >
            <Flag size={13} color="#9ca3af" />
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>Пожаловаться на товар</Text>
          </TouchableOpacity>
        )}

        {/* Description */}
        {product.description && (
          <View className="mx-4 mt-3 bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm">
            <Text className="font-bold text-gray-900 mb-2">Описание</Text>
            <Text className="text-gray-600 text-sm leading-relaxed" numberOfLines={showFullDesc || !descLong ? undefined : 4}>
              {product.description}
            </Text>
            {descLong && (
              <TouchableOpacity onPress={() => setShowFullDesc((v) => !v)} className="mt-2">
                <Text className="text-blue-600 font-medium text-sm">{showFullDesc ? "Свернуть" : "Читать полностью"}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Characteristics */}
        {(() => {
          const specs: { key: string; value: string }[] = [];
          if (product.brand) specs.push({ key: "Бренд", value: product.brand });
          if (product.category?.name) specs.push({ key: "Категория", value: product.category.name });
          if (product.attributes) {
            Object.entries(product.attributes).forEach(([k, v]) => specs.push({ key: k, value: String(v) }));
          }
          if (specs.length === 0) return null;
          return (
            <View style={{ marginHorizontal: 16, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setShowSpecs((v) => !v)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#f3f4f6" }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>Характеристики</Text>
                {showSpecs ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
              </TouchableOpacity>
              {showSpecs && (
                <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: "hidden" }}>
                  {specs.map((s, i) => (
                    <View key={s.key} style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                      <Text style={{ flex: 1, fontSize: 13, color: "#6b7280" }}>{s.key}</Text>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: "#111827", textAlign: "right" }}>{s.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })()}

        {/* About product */}
        {product.about && (
          <View style={{ marginHorizontal: 16, marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => setShowAbout((v) => !v)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#f3f4f6" }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>О товаре</Text>
              {showAbout ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
            </TouchableOpacity>
            {showAbout && (
              <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text style={{ fontSize: 13, color: "#374151", lineHeight: 22 }}>{product.about}</Text>
              </View>
            )}
          </View>
        )}

        {/* Related */}
        {related.length > 0 && (
          <View className="mt-4">
            <View className="flex-row items-center justify-between px-4 mb-3">
              <Text className="font-bold text-gray-900">Похожие товары</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/catalog")}>
                <Text className="text-sm text-blue-600 font-medium">Все</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {related.map((p) => (
                <View key={p.id} style={{ width: (width - 48) / 2.2 }}>
                  <ProductCard product={p} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Report Modal */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setReportVisible(false)} />
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Пожаловаться на товар</Text>
              <TouchableOpacity onPress={() => setReportVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Выберите причину жалобы:</Text>
            {["Поддельный товар", "Неверное описание", "Запрещённый товар", "Мошенничество", "Другое"].map((reason) => (
              <TouchableOpacity key={reason} onPress={() => setReportReason(reason)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: reportReason === reason ? "#8B5CF6" : "#d1d5db", backgroundColor: reportReason === reason ? "#8B5CF6" : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {reportReason === reason && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />}
                </View>
                <Text style={{ fontSize: 14, color: "#111827" }}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={sendReport} disabled={reportSending || !reportReason}
              style={{ marginTop: 20, backgroundColor: reportReason ? "#8B5CF6" : "#e5e7eb", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
              {reportSending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontWeight: "700", color: reportReason ? "#fff" : "#9ca3af", fontSize: 15 }}>Отправить жалобу</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom bar */}
      {user?.role !== "seller" && user?.role !== "admin" && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
          <View className="flex-row items-center gap-3">
            <View className="flex-shrink-0">
              <Text className="text-xs text-gray-400">Итого</Text>
              <Text className="font-black text-blue-600" style={{ fontSize: 20 }}>
                {(product.price * (cartItem?.quantity || 1)).toLocaleString()} сом.
              </Text>
            </View>

            {product.stock === 0 ? (
              <TouchableOpacity
                onPress={toggleWaitlist}
                className={`flex-1 rounded-2xl flex-row items-center justify-center gap-2 py-4 ${inWaitlist ? "bg-gray-100" : "bg-blue-600"}`}
              >
                <Clock size={18} color={inWaitlist ? "#4b5563" : "white"} />
                <Text className={`font-bold text-sm ${inWaitlist ? "text-gray-600" : "text-white"}`}>
                  {inWaitlist ? "В листе ожидания" : "Уведомить о наличии"}
                </Text>
              </TouchableOpacity>
            ) : inCart ? (
              <View className="flex-1 flex-row items-center justify-between border-2 border-blue-600 rounded-2xl overflow-hidden">
                <TouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity - 1)} className="w-14 items-center justify-center py-3.5">
                  <Minus size={18} color="#2563EB" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text className="text-base font-black text-blue-600">{cartItem!.quantity}</Text>
                <TouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity + 1)} className="w-14 items-center justify-center py-3.5">
                  <Plus size={18} color="#2563EB" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleAddToCart}
                disabled={adding}
                className="flex-1 bg-blue-600 rounded-2xl flex-row items-center justify-center gap-2 py-4"
              >
                {adding ? <ActivityIndicator color="white" size="small" /> : <ShoppingCart size={18} color="white" />}
                <Text className="text-white font-bold text-base">В корзину</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
