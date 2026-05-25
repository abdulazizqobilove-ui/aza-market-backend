import { View, Text, ActivityIndicator, Animated, FlatList, TouchableOpacity as RNTouchableOpacity } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Heart, Star, ShoppingCart, Plus, Minus } from "lucide-react-native";
import { useState, useRef } from "react";
import Toast from "react-native-toast-message";
import { Product, API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import { useCartStore } from "@/store/cart";

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const toggle = useFavoritesStore((s) => s.toggle);
  const ids = useFavoritesStore((s) => s.ids);
  const { items, add, updateQty } = useCartStore();
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
      style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" }}
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
                  source={{ uri: `${API_URL}${img.url}` }}
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
          <View style={{ flex: 1, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
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

        <RNTouchableOpacity onPress={handleFav} className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full items-center justify-center shadow">
          <Animated.View style={{ transform: [{ scale }] }}>
            <Heart size={15} color={faved ? "#ef4444" : "#9ca3af"} fill={faved ? "#ef4444" : "transparent"} />
          </Animated.View>
        </RNTouchableOpacity>
      </View>

      <View className="p-2.5 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-violet-500">{product.price.toLocaleString()} сом.</Text>
          {product.original_price && product.original_price > product.price && (
            <Text className="text-xs text-gray-400 line-through">{product.original_price.toLocaleString()}</Text>
          )}
        </View>
        {product.brand && <Text className="text-xs text-gray-500 font-medium" numberOfLines={1}>{product.brand}</Text>}
        <Text className="text-xs text-gray-800" numberOfLines={2}>{product.title}</Text>

        <View className="flex-row items-center gap-1 mt-0.5">
          <Star size={11} color={product.reviews_count > 0 ? "#facc15" : "#e5e7eb"} fill={product.reviews_count > 0 ? "#facc15" : "#e5e7eb"} />
          <Text className="text-xs text-gray-500">{product.reviews_count > 0 ? product.rating.toFixed(1) : "0.0"}</Text>
          <Text className="text-xs text-gray-400">· {product.reviews_count} отзывов</Text>
        </View>

        {product.stock > 0 ? (
          inCart ? (
            <View className="mt-1.5 flex-row items-center justify-between border-2 border-violet-500 rounded-xl overflow-hidden">
              <RNTouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity - 1)} className="w-9 h-9 items-center justify-center">
                <Minus size={15} color="#8B5CF6" strokeWidth={2.5} />
              </RNTouchableOpacity>
              <Text className="text-sm font-bold text-violet-500">{cartItem!.quantity}</Text>
              <RNTouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity + 1)} className="w-9 h-9 items-center justify-center">
                <Plus size={15} color="#8B5CF6" strokeWidth={2.5} />
              </RNTouchableOpacity>
            </View>
          ) : (
            <RNTouchableOpacity onPress={handleAdd} disabled={adding} className="mt-1.5 bg-violet-500 rounded-xl py-2.5 flex-row items-center justify-center gap-1.5">
              {adding ? <ActivityIndicator size="small" color="white" /> : <ShoppingCart size={13} color="white" />}
              <Text className="text-xs font-semibold text-white">В корзину</Text>
            </RNTouchableOpacity>
          )
        ) : (
          <View className="mt-1.5 bg-gray-100 rounded-xl py-2.5 items-center">
            <Text className="text-xs font-medium text-gray-400">Нет в наличии</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
