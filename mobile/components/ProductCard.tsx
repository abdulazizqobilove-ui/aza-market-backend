import { View, Text, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
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

  const faved = !!ids[product.id];
  const cartItem = items.find((i) => i.product.id === product.id);
  const inCart = !!cartItem;
  const mainImage = product.images.find((i) => i.is_main) || product.images[0];
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

  return (
    <TouchableOpacity
      onPress={() => router.push(`/products/${product.id}`)}
      className="bg-white rounded-2xl overflow-hidden"
      activeOpacity={0.95}
    >
      <View className="relative" style={{ aspectRatio: 3 / 4 }}>
        {mainImage ? (
          <Image
            source={{ uri: `${API_URL}${mainImage.url}` }}
            className="w-full h-full"
            contentFit="cover"
          />
        ) : (
          <View className="w-full h-full bg-gray-100 items-center justify-center">
            <Text className="text-4xl">📦</Text>
          </View>
        )}

        {product.stock === 0 && (
          <View className="absolute inset-0 bg-white/60 items-center justify-center">
            <Text className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full">Нет в наличии</Text>
          </View>
        )}

        <TouchableOpacity onPress={handleFav} className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full items-center justify-center shadow">
          <Animated.View style={{ transform: [{ scale }] }}>
            <Heart size={15} color={faved ? "#ef4444" : "#9ca3af"} fill={faved ? "#ef4444" : "transparent"} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View className="p-2.5 gap-1">
        <Text className="text-base font-bold text-blue-600">{product.price.toLocaleString()} сом.</Text>
        {product.brand && <Text className="text-xs text-gray-500 font-medium" numberOfLines={1}>{product.brand}</Text>}
        <Text className="text-xs text-gray-800" numberOfLines={2}>{product.title}</Text>

        <View className="flex-row items-center gap-1 mt-0.5">
          <Star size={11} color={product.reviews_count > 0 ? "#facc15" : "#e5e7eb"} fill={product.reviews_count > 0 ? "#facc15" : "#e5e7eb"} />
          <Text className="text-xs text-gray-500">{product.reviews_count > 0 ? product.rating.toFixed(1) : "0.0"}</Text>
          <Text className="text-xs text-gray-400">· {product.reviews_count} отзывов</Text>
        </View>

        {product.stock > 0 ? (
          inCart ? (
            <View className="mt-1.5 flex-row items-center justify-between border-2 border-blue-600 rounded-xl overflow-hidden">
              <TouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity - 1)} className="w-9 h-9 items-center justify-center">
                <Minus size={15} color="#2563EB" strokeWidth={2.5} />
              </TouchableOpacity>
              <Text className="text-sm font-bold text-blue-600">{cartItem!.quantity}</Text>
              <TouchableOpacity onPress={() => updateQty(cartItem!.id, cartItem!.quantity + 1)} className="w-9 h-9 items-center justify-center">
                <Plus size={15} color="#2563EB" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleAdd} disabled={adding} className="mt-1.5 bg-blue-600 rounded-xl py-2.5 flex-row items-center justify-center gap-1.5">
              {adding ? <ActivityIndicator size="small" color="white" /> : <ShoppingCart size={13} color="white" />}
              <Text className="text-xs font-semibold text-white">В корзину</Text>
            </TouchableOpacity>
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
