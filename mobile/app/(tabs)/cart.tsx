import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { API_URL } from "@/lib/api";
import { useState, useEffect } from "react";

export default function CartScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { items, fetch, remove, updateQty, loading } = useCartStore();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { if (user) fetch(); }, [user]);
  useEffect(() => {
    setSelected(new Set(items.filter((i) => i.product.stock > 0).map((i) => i.id)));
  }, [items.length]);

  if (!user) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
      <ShoppingBag size={64} color="#e5e7eb" />
      <Text className="text-lg font-bold text-gray-700 mt-4 mb-1">Корзина пуста</Text>
      <Text className="text-sm text-gray-400 mb-6 text-center">Войдите чтобы добавить товары</Text>
      <TouchableOpacity onPress={() => router.push("/(auth)/login")} className="bg-blue-600 px-8 py-3.5 rounded-2xl">
        <Text className="text-white font-bold">Войти</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const selectedItems = items.filter((i) => selected.has(i.id));
  const selectedTotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const selectedQty = selectedItems.reduce((s, i) => s + i.quantity, 0);

  const toggleOne = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const ids = [...selected].join(",");

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Корзина</Text>
        <Text className="text-xs text-gray-400 mt-0.5">{items.length} товаров</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#2563EB" className="mt-10" />
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ShoppingBag size={48} color="#e5e7eb" />
          <Text className="text-gray-400 mt-3">Корзина пуста</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 140 }}
          renderItem={({ item }) => {
            const img = item.product.images.find((i) => i.is_main) || item.product.images[0];
            const inStock = item.product.stock > 0;
            const isSel = selected.has(item.id);
            return (
              <View className={`bg-white rounded-2xl p-4 ${!inStock ? "opacity-50" : ""}`}>
                <View className="flex-row gap-3">
                  {inStock && (
                    <TouchableOpacity onPress={() => toggleOne(item.id)} className="w-5 h-5 rounded-md border-2 items-center justify-center mt-1" style={{ borderColor: isSel ? "#2563EB" : "#d1d5db", backgroundColor: isSel ? "#2563EB" : "transparent" }}>
                      {isSel && <Text className="text-white text-[10px] font-bold">✓</Text>}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => router.push(`/products/${item.product.id}`)} className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                    {img ? <Image source={{ uri: `${API_URL}${img.url}` }} className="w-full h-full" contentFit="cover" /> : <View className="flex-1 items-center justify-center"><Text className="text-2xl">📦</Text></View>}
                  </TouchableOpacity>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-800" numberOfLines={2}>{item.product.title}</Text>
                    {inStock && <Text className="text-base font-bold text-gray-900 mt-1">{(item.product.price * item.quantity).toLocaleString()} сом.</Text>}
                    {!inStock && <Text className="text-xs text-red-500 mt-1">Нет в наличии</Text>}
                  </View>
                  <TouchableOpacity onPress={() => remove(item.id)} className="w-8 h-8 items-center justify-center">
                    <Trash2 size={16} color="#d1d5db" />
                  </TouchableOpacity>
                </View>
                {inStock && (
                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <Text className="text-xs text-gray-400">{item.product.price.toLocaleString()} сом. × {item.quantity}</Text>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity onPress={() => item.quantity <= 1 ? remove(item.id) : updateQty(item.id, item.quantity - 1)} className="w-8 h-8 bg-gray-100 rounded-xl items-center justify-center">
                        <Minus size={14} color="#4b5563" />
                      </TouchableOpacity>
                      <Text className="text-sm font-bold w-4 text-center">{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQty(item.id, item.quantity + 1)} className="w-8 h-8 bg-gray-100 rounded-xl items-center justify-center">
                        <Plus size={14} color="#4b5563" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {items.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-4 pb-8">
          <View className="flex-row items-end justify-between mb-3">
            <View>
              <Text className="text-xs text-gray-400 mb-0.5">Выбрано {selectedQty} товаров</Text>
              <Text className="text-2xl font-bold text-gray-900">{selectedTotal.toLocaleString()} сом.</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => selected.size > 0 && router.push(`/checkout?ids=${ids}` as any)}
            disabled={selected.size === 0}
            className={`py-4 rounded-2xl items-center ${selected.size > 0 ? "bg-blue-600" : "bg-gray-100"}`}
          >
            <Text className={`font-bold text-base ${selected.size > 0 ? "text-white" : "text-gray-400"}`}>
              {selected.size > 0 ? `Оформить ${selected.size} товара` : "Выберите товары"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
