import { View, Text, FlatList, TouchableOpacity as RNTouch } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Star, Heart, ShoppingCart } from "lucide-react-native";
import { useRef, useState } from "react";
import Toast from "react-native-toast-message";
import { Product, imgUrl } from "@/lib/api";
import { useThemeColors } from "@/lib/theme";
import { useFavoritesStore } from "@/store/favorites";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";

function deliveryDate() {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 15) return "Сегодня";
  if (hour < 20) return "Завтра";
  const d = new Date(now);
  d.setDate(now.getDate() + 2);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const c = useThemeColors();
  const [activeImg, setActiveImg] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Показываем только фото первой модели (variant_index=0),
  // если таких нет — фото без варианта, если нет — все фото
  const firstVariantImgs = product.images.filter((i) => i.variant_index === 0);
  const noVariantImgs = product.images.filter((i) => i.variant_index == null);
  const images = firstVariantImgs.length > 0 ? firstVariantImgs
    : noVariantImgs.length > 0 ? noVariantImgs
    : product.images;

  const displayPrice = product.price;
  const displayOriginal = product.original_price;
  const hasDiscount = !!(displayOriginal && displayOriginal > displayPrice);

  const user = useAuthStore((s) => s.user);
  const isFav = useFavoritesStore((s) => !!s.ids[product.id]);
  const toggle = useFavoritesStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.add);
  const inCart = useCartStore((s) => s.items.some((i) => i.product.id === product.id));

  const navigate = () => router.push(`/products/${product.id}`);

  return (
    <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: c.card }}>

      {/* Image — фото первой модели */}
      <TouchableOpacity onPress={navigate} activeOpacity={0.95}>
        <View style={{ aspectRatio: 3 / 4 }} onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}>
          {images.length > 0 && cardWidth > 0 ? (
            <>
              <FlatList
                ref={flatListRef}
                data={images}
                horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(img) => String(img.id)}
                onMomentumScrollEnd={(e) => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / cardWidth))}
                renderItem={({ item: img }) => (
                  <Image
                    source={{ uri: imgUrl(img.url) ?? "" }}
                    style={{ width: cardWidth, height: cardWidth * (4 / 3) }}
                    contentFit="cover"
                  />
                )}
                getItemLayout={(_, i) => ({ length: cardWidth, offset: cardWidth * i, index: i })}
                scrollEnabled={images.length > 1}
              />
              {images.length > 1 && (
                <View style={{ position: "absolute", bottom: 6, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 4 }}>
                  {images.map((_, i) => (
                    <View key={i} style={{ width: i === activeImg ? 14 : 5, height: 4, borderRadius: 2, backgroundColor: i === activeImg ? "#fff" : "rgba(255,255,255,0.5)" }} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={{ flex: 1, backgroundColor: c.placeholder, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 40 }}>📦</Text>
            </View>
          )}

          {product.stock === 0 && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#6b7280", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>Нет в наличии</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Info */}
      <RNTouch onPress={navigate} activeOpacity={0.9}>
        <View style={{ padding: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.text }}>{displayPrice.toLocaleString()} сом.</Text>
            {hasDiscount && (
              <Text style={{ fontSize: 10, color: c.textMuted, textDecorationLine: "line-through" }}>{displayOriginal!.toLocaleString()}</Text>
            )}
          </View>
          <Text style={{ fontSize: 11, color: c.textSub, marginTop: 2, height: 30 }} numberOfLines={2}>{product.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
            <Star size={10} color={product.reviews_count > 0 ? "#facc15" : c.placeholder} fill={product.reviews_count > 0 ? "#facc15" : c.placeholder} />
            <Text style={{ fontSize: 10, color: c.textSub }}>{product.reviews_count > 0 && product.rating ? Number(product.rating).toFixed(1) : "0.0"}</Text>
            <Text style={{ fontSize: 10, color: c.textMuted }}>· {product.reviews_count}</Text>
          </View>
        </View>
      </RNTouch>

      {/* Cart button */}
      <RNTouch
        onPress={async () => {
          if (!user) { router.push("/(auth)/login" as any); return; }
          if (!inCart) {
            try { await addToCart(product); }
            catch { Toast.show({ type: "error", text1: "Не удалось добавить в корзину" }); }
          } else {
            router.push(`/products/${product.id}`);
          }
        }}
        style={{ marginHorizontal: 8, marginBottom: 8 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#8B5CF6", borderRadius: 10, paddingVertical: 11 }}>
          <ShoppingCart size={14} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
            {inCart ? "В корзине" : deliveryDate()}
          </Text>
        </View>
      </RNTouch>

      {/* Heart */}
      <RNTouch
        onPress={() => toggle(product)}
        style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center", zIndex: 10 }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Heart size={14} color={isFav ? "#ef4444" : "#fff"} fill={isFav ? "#ef4444" : "transparent"} />
      </RNTouch>
    </View>
  );
}
