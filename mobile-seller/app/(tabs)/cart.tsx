import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { API_URL, imgUrl } from "@/lib/api";
import { useState, useEffect } from "react";
import { EmptyState } from "@/components/EmptyState";
import { useThemeColors } from "@/lib/theme";
import { SkeletonCartItem } from "@/components/Skeleton";

export default function CartScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const { items, fetch, remove, updateQty, loading } = useCartStore();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { if (user) fetch(); }, [user?.id]);
  useEffect(() => {
    setSelected(new Set(items.filter((i) => i.product.stock > 0).map((i) => i.id)));
  }, [items.length]);

  if (!user) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.card, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <ShoppingBag size={64} color={c.border} />
      <Text style={{ fontSize: 18, fontWeight: "700", color: c.text, marginTop: 16, marginBottom: 4 }}>Корзина пуста</Text>
      <Text style={{ fontSize: 14, color: c.textMuted, marginBottom: 24, textAlign: "center" }}>Войдите чтобы добавить товары</Text>
      <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={{ backgroundColor: "#8B5CF6", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>Войти</Text>
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

  const availableIds = items.filter((i) => i.product.stock > 0).map((i) => i.id);
  const allSelected = availableIds.length > 0 && availableIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(availableIds));

  const ids = [...selected].join(",");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: c.text }}>Корзина</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{items.length} товаров</Text>
          </View>
          {items.length > 0 && availableIds.length > 0 && (
            <TouchableOpacity onPress={toggleAll} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", borderColor: allSelected ? "#8B5CF6" : c.border, backgroundColor: allSelected ? "#8B5CF6" : "transparent" }}>
                {allSelected && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: allSelected ? "#8B5CF6" : c.textSub }}>
                {allSelected ? "Снять все" : "Выбрать все"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ gap: 10, paddingTop: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCartItem key={i} />)}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          emoji="🛒"
          title="Корзина пуста"
          subtitle="Добавьте товары из каталога и они появятся здесь"
          actionLabel="Перейти в каталог"
          onAction={() => router.push("/(tabs)/catalog")}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 220 }}
          renderItem={({ item }) => {
            const img = item.product.images.find((i) => i.is_main) || item.product.images[0];
            const inStock = item.product.stock > 0;
            const isSel = selected.has(item.id);
            return (
              <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, opacity: inStock ? 1 : 0.5 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {inStock && (
                    <TouchableOpacity
                      onPress={() => toggleOne(item.id)}
                      style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 4, borderColor: isSel ? "#8B5CF6" : c.border, backgroundColor: isSel ? "#8B5CF6" : "transparent" }}
                    >
                      {isSel && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>✓</Text>}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => router.push(`/products/${item.product.id}`)} style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", backgroundColor: c.placeholder }}>
                    {img ? <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 24 }}>📦</Text></View>}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: c.text }} numberOfLines={2}>{item.product.title}</Text>
                    {item.selected_attrs && Object.keys(item.selected_attrs).length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {Object.entries(item.selected_attrs).map(([k, v]) => (
                          <View key={k} style={{ backgroundColor: "#ede9fe", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, color: "#7c3aed", fontWeight: "700" }}>{k}: {v}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {inStock && <Text style={{ fontSize: 15, fontWeight: "700", color: c.text, marginTop: 4 }}>{(item.product.price * item.quantity).toLocaleString()} сом.</Text>}
                    {!inStock && <Text style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>Нет в наличии</Text>}
                  </View>
                  <TouchableOpacity onPress={() => remove(item.id)} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={16} color={c.textMuted} />
                  </TouchableOpacity>
                </View>
                {inStock && (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                    <Text style={{ fontSize: 12, color: c.textMuted }}>{item.product.price.toLocaleString()} сом. × {item.quantity}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <TouchableOpacity onPress={() => item.quantity <= 1 ? remove(item.id) : updateQty(item.id, item.quantity - 1)} style={{ width: 32, height: 32, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                        <Minus size={14} color={c.textSub} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 14, fontWeight: "700", width: 16, textAlign: "center", color: c.text }}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQty(item.id, item.quantity + 1)} style={{ width: 32, height: 32, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                        <Plus size={14} color={c.textSub} />
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
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 76 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 2 }}>Выбрано {selectedQty} товаров</Text>
              <Text style={{ fontSize: 22, fontWeight: "700", color: c.text }}>{selectedTotal.toLocaleString()} сом.</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => selected.size > 0 && router.push(`/checkout?ids=${ids}` as any)}
            disabled={selected.size === 0}
            style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: selected.size > 0 ? "#8B5CF6" : c.iconBg }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, color: selected.size > 0 ? "#fff" : c.textMuted }}>
              {selected.size > 0 ? `Оформить ${selected.size} товара` : "Выберите товары"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
