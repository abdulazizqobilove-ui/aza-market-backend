import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowLeft, Package, MapPin, ChevronRight, Clock, CheckCircle2, Truck, Star } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { Order, API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const STATUS_LABELS: Record<string, string> = { pending: "Ожидает", confirmed: "Подтверждён", processing: "В обработке", shipped: "В пути", delivered: "Доставлен", cancelled: "Отменён" };
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fef3c7", text: "#d97706" },
  confirmed: { bg: "#dbeafe", text: "#2563eb" },
  processing: { bg: "#dbeafe", text: "#2563eb" },
  shipped: { bg: "#e0e7ff", text: "#4f46e5" },
  delivered: { bg: "#dcfce7", text: "#16a34a" },
  cancelled: { bg: "#fee2e2", text: "#ef4444" },
};

const TIMELINE = [
  { key: "pending", label: "Принят", icon: Clock },
  { key: "confirmed", label: "Подтверждён", icon: CheckCircle2 },
  { key: "shipped", label: "В пути", icon: Truck },
  { key: "delivered", label: "Доставлен", icon: Star },
];
const STATUS_STEP: Record<string, number> = { pending: 0, confirmed: 1, processing: 1, shipped: 2, delivered: 3, cancelled: -1 };

export default function OrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>("/orders").then((r) => setOrders(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 flex-row items-center gap-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
          <ArrowLeft size={18} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Мои заказы</Text>
      </View>

      {loading ? <ActivityIndicator color="#2563EB" className="mt-10" /> : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Package size={48} color="#e5e7eb" />
              <Text className="text-gray-400 mt-3">Заказов пока нет</Text>
            </View>
          }
          renderItem={({ item: order }) => {
            const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
            const isExp = expanded === order.id;
            return (
              <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <TouchableOpacity onPress={() => setExpanded(isExp ? null : order.id)} className="px-4 py-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <View>
                      <Text className="text-sm font-bold text-gray-800">Заказ #{order.id}</Text>
                      <Text className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</Text>
                    </View>
                    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: sc.bg }}>
                      <Text className="text-xs font-semibold" style={{ color: sc.text }}>{STATUS_LABELS[order.status]}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="flex-row gap-1.5 flex-1">
                      {order.items.slice(0, 3).map((item) => {
                        const img = item.product.images?.find((i) => i.is_main) || item.product.images?.[0];
                        return (
                          <View key={item.id} className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100">
                            {img ? <Image source={{ uri: `${API_URL}${img.url}` }} className="w-full h-full" contentFit="cover" /> : <View className="flex-1 items-center justify-center"><Text>📦</Text></View>}
                          </View>
                        );
                      })}
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-bold text-gray-900">{order.total_price.toLocaleString()} сом.</Text>
                      <Text className="text-xs text-gray-400">{order.items.length} товаров</Text>
                    </View>
                    <ChevronRight size={16} color="#d1d5db" style={{ transform: [{ rotate: isExp ? "90deg" : "0deg" }] }} />
                  </View>
                </TouchableOpacity>

                {isExp && (
                  <View style={{ borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
                    {/* Timeline */}
                    {order.status !== "cancelled" && (() => {
                      const step = STATUS_STEP[order.status] ?? 0;
                      return (
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                          {TIMELINE.map((t, idx) => {
                            const done = idx <= step;
                            const Icon = t.icon;
                            return (
                              <View key={t.key} style={{ flex: 1, alignItems: "center" }}>
                                <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
                                  {idx > 0 && <View style={{ flex: 1, height: 2, backgroundColor: idx <= step ? "#111827" : "#e5e7eb" }} />}
                                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: done ? "#111827" : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                                    <Icon size={14} color={done ? "#fff" : "#d1d5db"} />
                                  </View>
                                  {idx < TIMELINE.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: idx < step ? "#111827" : "#e5e7eb" }} />}
                                </View>
                                <Text style={{ fontSize: 9, color: done ? "#111827" : "#9ca3af", fontWeight: done ? "700" : "400", marginTop: 4, textAlign: "center" }}>{t.label}</Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()}

                    {/* Items */}
                    {order.items.map((item) => (
                      <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 13, color: "#374151", flex: 1, marginRight: 8 }} numberOfLines={1}>{item.product.title}</Text>
                        <Text style={{ fontSize: 12, color: "#9ca3af", marginRight: 8 }}>× {item.quantity}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>{(item.price * item.quantity).toLocaleString()} сом.</Text>
                      </View>
                    ))}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#6b7280" }}>Итого</Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>{order.total_price.toLocaleString()} сом.</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MapPin size={13} color="#9ca3af" />
                      <Text style={{ fontSize: 12, color: "#9ca3af" }}>{order.delivery_city}, {order.delivery_address}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
