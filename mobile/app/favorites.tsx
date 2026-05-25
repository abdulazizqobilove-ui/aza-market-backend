import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { Product } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import ProductCard from "@/components/ProductCard";

export default function FavoritesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { ids } = useFavoritesStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get<Product[]>("/favorites")
      .then((r) => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    setProducts((prev) => prev.filter((p) => !!ids[p.id]));
  }, [ids]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, backgroundColor: "#f3f4f6", borderRadius: 12, alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={18} color="#374151" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>Избранное</Text>
            {!loading && products.length > 0 && (
              <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{products.length} товаров</Text>
            )}
          </View>
          <View style={{ width: 36, height: 36, backgroundColor: "#fef2f2", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
            <Heart size={18} color="#ef4444" fill="#ef4444" />
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 60 }} />
      ) : products.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Heart size={44} color="#fca5a5" fill="#fca5a5" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" }}>
            Пока пусто
          </Text>
          <Text style={{ fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 20, marginBottom: 32 }}>
            Нажимайте ♡ на карточках товаров, чтобы добавить в избранное
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/")}
            style={{ backgroundColor: "#111827", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <ShoppingBag size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Перейти к покупкам</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 12 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, gap: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <View style={{ flex: 1, maxWidth: "50%" }}><ProductCard product={item} /></View>}
        />
      )}
    </SafeAreaView>
  );
}
