import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { ChevronLeft, Clock, X, ShoppingBag } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api, { API_URL } from "@/lib/api";

interface WaitlistItem {
  id: number;
  product_id: number;
  product: {
    id: number;
    title: string;
    price: number;
    images: { url: string; is_main: boolean }[];
  };
}

export default function WaitlistScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WaitlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get<WaitlistItem[]>("/waitlist")
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (productId: number) => {
    await api.delete(`/waitlist/${productId}`).catch(() => {});
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
    Toast.show({ type: "success", text1: "Удалено из листа ожидания" });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      <View style={{ backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827", flex: 1 }}>Лист ожидания</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#8B5CF6" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Clock size={36} color="#d1d5db" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Список пуст</Text>
              <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Добавляйте товары не в наличии — уведомим когда появятся</Text>
            </View>
          }
          renderItem={({ item }) => {
            const img = item.product.images?.find((i) => i.is_main)?.url || item.product.images?.[0]?.url;
            return (
              <TouchableOpacity
                onPress={() => router.push(`/products/${item.product_id}` as any)}
                activeOpacity={0.8}
                style={{ backgroundColor: "#fff", borderRadius: 16, flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderWidth: 1, borderColor: "#f3f4f6" }}
              >
                <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: "#f9fafb", overflow: "hidden" }}>
                  {img ? (
                    <Image source={{ uri: `${API_URL}${img}` }} style={{ width: 64, height: 64 }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <ShoppingBag size={24} color="#d1d5db" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }} numberOfLines={2}>{item.product.title}</Text>
                  <Text style={{ fontSize: 13, color: "#8B5CF6", fontWeight: "700", marginTop: 4 }}>{item.product.price.toLocaleString()} сом.</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Clock size={11} color="#9ca3af" />
                    <Text style={{ fontSize: 11, color: "#9ca3af" }}>Ожидаем поступление</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => remove(item.product_id)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff1f2", alignItems: "center", justifyContent: "center" }}>
                  <X size={16} color="#f87171" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
