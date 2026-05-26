import { View, Text, ActivityIndicator, Animated, FlatList } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Heart, Star, ShoppingCart, Plus, Minus } from "lucide-react-native";
import { useState, useRef } from "react";
import Toast from "react-native-toast-message";
import { Product, API_URL, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import { useCartStore } from "@/store/cart";
import { useThemeColors } from "@/lib/theme";

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const toggle = useFavoritesStore((s) => s.toggle);
  const ids = useFavoritesStore((s) => s.ids);
  const { items, add, updateQty } = useCartStore();
  const c = useThemeColors();
  const [adding, setAdding] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);

  const faved = !!ids[product.id];
  const cartItem = items.find((i) => i.product.id === product.id);
  const inCart = !!cartItem;
  const images = product.images.length > 0 ? product.images : null;
  const scale = useRef(new Animated.Value(1)).current;

  const handleFav = () => {
    if (!user) { router.push("/(auth)/login"); return; }
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    toggle(product.id);
  };

  const handleAdd = async () => {
    if (!user) { router.push("/(auth)/login"); return; }
    setAdding(true);
    try { await add(product.id, 1); }
    catch { Toast.show({ type: "error", text1: "Ошибка при добавлении" }); }
    finally { setAdding(false); }
  };

  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/products/${product.id}`)}
      style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}
      activeOpacity={0.95}
    >
      <View style={{ aspectRatio: 3 / 4 }} onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}>
        {images && cardWidth > 0 ? (
          <>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(img) => String(img.id)}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                setActiveImg(idx);
              }}
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

            {/* Dots */}
            {images.length > 1 && (
              <View style={{ position: "absolute", bottom: 8, left: 0, right: 0, alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                  {images.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: i === activeImg ? 6 : 5,
                        height: i === activeImg ? 6 : 5,
                        borderRadius: 3,
                        backgroundColor: i === activeImg ? "#fff" : "rgba(255,255,255,0.45)",
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: c.placeholder, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 40 }}>📦</Text>
          </View>
        )}

        {discount && (
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#ef4444", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>-{discount}%</Text>
          </View>
        )}

        {product.stock === 0 && (
          <View className="absolute inset-0 bg-white/60 items-center justify-center">
            <Text className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full">Нет в наличии</Text>
          </View>
        )}

        <TouchableOpacity onPress={handleFav} style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Heart size={15} color={faved ? "#ef4444" : "#9ca3af"} fill={faved ? "#ef4444" : "transparent"} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 10, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#8B5CF6" }}>{product.price.toLocaleString()} сом.</Text>
          {product.original_price && product.original_price > product.price && (
            <Text style={{ fontSize: 11, color: c.textMuted, textDecorationLine: "line-through" }}>{product.original_price.toLocaleString()}</Text>
          )}
        </View>
        {product.brand && <Text style={{ fontSize: 11, color: c.textSub, fontWeight: "500" }} numberOfLines={1}>{product.brand}</Text>}
        <Text style={{ fontSize: 11, color: c.text }} numberOfLines={2}>{product.title}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Star size={11} color={product.reviews_count > 0 ? "#facc15" : c.placeholder} fill={product.reviews_count > 0 ? "#facc15" : c.placeholder} />
          <Text style={{ fontSize: 11, color: c.textSub }}>{product.reviews_count > 0 ? product.rating.toFixed(1) : "0.0"}</Text>
          <Text style={{ fontSize: 11, color: c.textMuted }}>· {product.reviews_count} отзывов</Text>
        </View>

        {product.stock > 0 ? (
          inCart ? (
            <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 2, borderColor: "#8B5CF6", borderRadius: 12, overflow: "hidden" }}>
              <TouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity - 1)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                <Minus size={15} color="#8B5CF6" strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#8B5CF6" }}>{cartItem!.quantity}</Text>
              <TouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity + 1)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                <Plus size={15} color="#8B5CF6" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleAdd} disabled={adding} style={{ marginTop: 6, backgroundColor: "#8B5CF6", borderRadius: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {adding ? <ActivityIndicator size="small" color="white" /> : <ShoppingCart size={13} color="white" />}
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>В корзину</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={{ marginTop: 6, backgroundColor: c.iconBg, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "500", color: c.textMuted }}>Нет в наличии</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
