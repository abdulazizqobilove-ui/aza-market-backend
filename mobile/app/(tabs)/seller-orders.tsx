import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClipboardList, ChevronRight } from "lucide-react-native";
import Toast from "react-native-toast-message";
import api, { Order } from "@/lib/api";
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
const NEXT_STATUS: Record<string, string> = { pending: "confirmed", confirmed: "processing", processing: "shipped", shipped: "delivered" };
const NEXT_LABEL: Record<string, string> = { pending: "Подтвердить", confirmed: "В обработку", processing: "Отправить", shipped: "Доставлен" };

export default function SellerOrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>("/seller/orders").then((r) => setOrders(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const updateStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      const res = await api.patch<Order>(`/orders/${order.id}/status`, { status: next });
      setOrders((prev) => prev.map((o) => o.id === order.id ? res.data : o));
      Toast.show({ type: "success", text1: "Статус обновлён" });
    } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Заказы покупателей</Text>
        <Text className="text-xs text-gray-400 mt-0.5">{orders.length} заказов</Text>
      </View>

      {loading ? <ActivityIndicator color="#2563EB" className="mt-10" /> : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <ClipboardList size={48} color="#e5e7eb" />
              <Text className="text-gray-400 mt-3">Заказов пока нет</Text>
            </View>
          }
          renderItem={({ item: order }) => {
            const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
            const nextLabel = NEXT_LABEL[order.status];
            return (
              <View className="bg-white rounded-2xl p-4 shadow-sm gap-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm font-bold text-gray-800">Заказ #{order.id}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString("ru-RU")}</Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: sc.bg }}>
                    <Text className="text-xs font-semibold" style={{ color: sc.text }}>{STATUS_LABELS[order.status]}</Text>
                  </View>
                </View>

                {order.items.map((item) => (
                  <View key={item.id} className="flex-row justify-between">
                    <Text className="text-sm text-gray-700 flex-1 mr-2" numberOfLines={1}>{item.product.title}</Text>
                    <Text className="text-xs text-gray-400 mr-2">× {item.quantity}</Text>
                    <Text className="text-sm font-semibold">{(item.price * item.quantity).toLocaleString()} сом.</Text>
                  </View>
                ))}

                <View className="flex-row justify-between items-center pt-2 border-t border-gray-50">
                  <Text className="text-sm font-bold text-blue-600">{order.total_price.toLocaleString()} сом.</Text>
                  {nextLabel && (
                    <TouchableOpacity onPress={() => updateStatus(order)} className="bg-blue-600 px-4 py-2 rounded-xl">
                      <Text className="text-white text-xs font-bold">{nextLabel}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
