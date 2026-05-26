import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClipboardList, ChevronRight } from "lucide-react-native";
import Toast from "react-native-toast-message";
import api, { Order } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const P = "#8B5CF6";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает", confirmed: "Подтверждён", processing: "В обработке",
  shipped: "В пути", delivered: "Доставлен", cancelled: "Отменён",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "#fef3c7", text: "#d97706" },
  confirmed:  { bg: "#ede9fe", text: "#7c3aed" },
  processing: { bg: "#dbeafe", text: "#2563eb" },
  shipped:    { bg: "#e0e7ff", text: "#4f46e5" },
  delivered:  { bg: "#dcfce7", text: "#16a34a" },
  cancelled:  { bg: "#fee2e2", text: "#ef4444" },
};
const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed", confirmed: "processing", processing: "shipped", shipped: "delivered",
};
const NEXT_LABEL: Record<string, string> = {
  pending: "Подтвердить", confirmed: "В обработку", processing: "Отправить", shipped: "Доставлен",
};

const FILTERS = ["Все", "Ожидает", "В обработке", "В пути", "Доставлен", "Отменён"];
const FILTER_MAP: Record<string, string> = {
  "Ожидает": "pending", "В обработке": "confirmed,processing",
  "В пути": "shipped", "Доставлен": "delivered", "Отменён": "cancelled",
};

export default function SellerOrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("Все");

  const load = useCallback(() => {
    if (!user) return;
    api.get<Order[]>("/seller/orders")
      .then((r) => setOrders(r.data))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [user]);

  useEffect(() => { load(); }, []);

  const updateStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      const res = await api.patch<Order>(`/orders/${order.id}/status`, { status: next });
      setOrders((prev) => prev.map((o) => o.id === order.id ? res.data : o));
      Toast.show({ type: "success", text1: `Статус: ${STATUS_LABELS[next]}` });
    } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
  };

  const filtered = orders.filter((o) => {
    if (filter === "Все") return true;
    const statuses = FILTER_MAP[filter]?.split(",") || [];
    return statuses.includes(o.status);
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Заказы</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
              {orders.length} всего{pendingCount > 0 ? ` · ${pendingCount} новых` : ""}
            </Text>
          </View>
          {pendingCount > 0 && (
            <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#d97706" }}>⚡ {pendingCount} новых</Text>
            </View>
          )}
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f} onPress={() => setFilter(f)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: filter === f ? P : "#f3f4f6" }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: filter === f ? "#fff" : "#6b7280" }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? <ActivityIndicator color={P} style={{ marginTop: 60 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={P} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <ClipboardList size={52} color="#e5e7eb" />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151", marginTop: 16 }}>
                {filter === "Все" ? "Заказов пока нет" : "Нет заказов с таким статусом"}
              </Text>
              <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>Здесь появятся заказы покупателей</Text>
            </View>
          }
          renderItem={({ item: order }) => {
            const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
            const nextLabel = NEXT_LABEL[order.status];
            const total = order.total_price;
            return (
              <View style={{ backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Заказ #{order.id}</Text>
                    <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                  <View style={{ backgroundColor: sc.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: sc.text }}>{STATUS_LABELS[order.status]}</Text>
                  </View>
                </View>

                {/* Items */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
                  {order.items.map((item) => (
                    <View key={item.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 13, color: "#374151", flex: 1, marginRight: 8 }} numberOfLines={1}>{item.product.title}</Text>
                      <Text style={{ fontSize: 12, color: "#9ca3af", marginRight: 8 }}>× {item.quantity}</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>{(item.price * item.quantity).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                {/* Footer */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fafafa", borderTopWidth: 0.5, borderTopColor: "#f3f4f6" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: P }}>{total.toLocaleString()} сом.</Text>
                  {nextLabel ? (
                    <TouchableOpacity onPress={() => updateStatus(order)} style={{ backgroundColor: P, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{nextLabel} →</Text>
                    </TouchableOpacity>
                  ) : order.status === "delivered" ? (
                    <View style={{ backgroundColor: "#dcfce7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>✓ Выполнен</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
