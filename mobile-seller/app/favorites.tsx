import { useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import ProductCard from "@/components/ProductCard";
import { useThemeColors } from "@/lib/theme";

export default function FavoritesScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const { ids, products, fetch } = useFavoritesStore();

  useEffect(() => {
    if (user) fetch();
  }, [user?.id]);

  const favProducts = Object.keys(ids)
    .filter((id) => ids[+id] && products[+id])
    .map((id) => products[+id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={18} color={c.textSub} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>Избранное</Text>
            {favProducts.length > 0 && (
              <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>{favProducts.length} товаров</Text>
            )}
          </View>
          <View style={{ width: 36, height: 36, backgroundColor: "#fef2f2", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
            <Heart size={18} color="#ef4444" fill="#ef4444" />
          </View>
        </View>
      </View>

      {favProducts.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Heart size={44} color="#fca5a5" fill="#fca5a5" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 8, textAlign: "center" }}>Пока пусто</Text>
          <Text style={{ fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 32 }}>
            Нажимайте ♡ на карточках товаров, чтобы добавить в избранное
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/")}
            style={{ backgroundColor: "#8B5CF6", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <ShoppingBag size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Перейти к покупкам</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favProducts}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={{ gap: 2, paddingHorizontal: 2 }}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32, gap: 2 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <View style={{ flex: 1, maxWidth: "50%" }}><ProductCard product={item} /></View>}
        />
      )}
    </SafeAreaView>
  );
}
