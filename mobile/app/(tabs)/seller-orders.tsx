import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, ScrollView, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClipboardList, Phone, MapPin, Calendar, Clock, CreditCard, ChevronDown, ChevronUp, MessageCircle, Copy, Share2 } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import api, { Order, imgUrl } from "@/lib/api";
import { Image } from "expo-image";
import { useAuthStore } from "@/store/auth";
import { useThemeColors } from "@/lib/theme";
import { SkeletonOrderItem } from "@/components/Skeleton";

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
  const c = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("Все");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [updating, setUpdating] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    api.get<Order[]>("/seller/orders")
      .then((r) => setOrders(r.data))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [user]);

  useEffect(() => { load(); }, []);

  const toggleExpand = (id: number) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const updateStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(order.id);
    try {
      const res = await api.patch<Order>(`/orders/${order.id}/status`, { status: next });
      setOrders((prev) => prev.map((o) => o.id === order.id ? res.data : o));
      Toast.show({ type: "success", text1: `Статус: ${STATUS_LABELS[next]}` });
    } catch {
      Toast.show({ type: "error", text1: "Ошибка" });
    } finally {
      setUpdating(null);
    }
  };

  const copy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({ type: "success", text1: `${label} скопирован` });
  };

  const shareOrder = (order: Order) => {
    const items = order.items.map((i) => `  • ${i.product.title} × ${i.quantity} — ${(i.price * i.quantity).toLocaleString()} сом.`).join("\n");
    const delivery = [order.delivery_date, order.delivery_time].filter(Boolean).join(", ");
    const paid = order.is_paid ? "✅ Оплачен" : "❌ Не оплачен";
    const payMethod = order.payment_method === "cash" || order.payment_method === "on_delivery"
      ? "При получении" : `Картой •••• ${order.payment_method.replace("card_", "")}`;
    const text = [
      `📦 Заказ #${order.id}`,
      ``,
      `👤 Покупатель`,
      `📞 ${order.contact_phone}`,
      `📍 ${order.delivery_city}, ${order.delivery_address}`,
      delivery ? `🗓 ${delivery}` : null,
      ``,
      `🛍 Товары:`,
      items,
      ``,
      `💳 Оплата: ${payMethod} · ${paid}`,
      `💰 Итого: ${order.total_price.toLocaleString()} сом.`,
    ].filter((l) => l !== null).join("\n");

    Share.share({ message: text });
  };

  const openChat = async (order: Order) => {
    const buyerId = (order as any).buyer_id;
    if (!buyerId) return;
    try {
      const r = await api.post<{ id: number }>("/chats", {
        seller_id: user!.id,
        product_id: order.items[0]?.product?.id,
      });
      router.push(`/chat/${r.data.id}` as any);
    } catch {
      Toast.show({ type: "error", text1: "Не удалось открыть чат" });
    }
  };

  const filtered = orders.filter((o) => {
    if (filter === "Все") return true;
    const statuses = FILTER_MAP[filter]?.split(",") || [];
    return statuses.includes(o.status);
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Заказы</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {orders.length} всего{pendingCount > 0 ? ` · ${pendingCount} новых` : ""}
            </Text>
          </View>
          {pendingCount > 0 && (
            <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#d97706" }}>⚡ {pendingCount} новых</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: filter === f ? P : c.iconBg }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: filter === f ? "#fff" : c.textSub }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ gap: 10, paddingTop: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonOrderItem key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={P} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <ClipboardList size={52} color={c.border} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 16 }}>
                {filter === "Все" ? "Заказов пока нет" : "Нет заказов с таким статусом"}
              </Text>
              <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 6 }}>Здесь появятся заказы покупателей</Text>
            </View>
          }
          renderItem={({ item: order }) => {
            const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
            const nextLabel = NEXT_LABEL[order.status];
            const isExp = expanded.has(order.id);
            const isUpdating = updating === order.id;

            return (
              <View style={{ backgroundColor: c.card, borderRadius: 18, overflow: "hidden" }}>
                {/* Header */}
                <TouchableOpacity onPress={() => toggleExpand(order.id)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: c.border }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Заказ #{order.id}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ backgroundColor: sc.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: sc.text }}>{STATUS_LABELS[order.status]}</Text>
                    </View>
                    {isExp ? <ChevronUp size={16} color={c.textMuted} /> : <ChevronDown size={16} color={c.textMuted} />}
                  </View>
                </TouchableOpacity>

                {/* Items always visible */}
                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: isExp ? 0 : 10, gap: 8 }}>
                  {order.items.map((item) => {
                    const img = item.product.images?.find((i) => i.is_main) || item.product.images?.[0];
                    return (
                      <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", backgroundColor: c.iconBg }}>
                          {img ? <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: 44, height: 44 }} contentFit="cover" />
                            : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text>📦</Text></View>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: c.text, fontWeight: "500" }} numberOfLines={1}>{item.product.title}</Text>
                          <Text style={{ fontSize: 12, color: c.textMuted }}>× {item.quantity} · {(item.price * item.quantity).toLocaleString()} сом.</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Expanded details */}
                {isExp && (
                  <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10, borderTopWidth: 0.5, borderTopColor: c.border, marginTop: 10 }}>

                    {/* Contact */}
                    <View style={{ backgroundColor: c.inputBg, borderRadius: 14, padding: 12, gap: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 2 }}>ПОКУПАТЕЛЬ</Text>
                      <TouchableOpacity onPress={() => copy(order.contact_phone, "Номер")}
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Phone size={14} color={P} />
                        <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }}>{order.contact_phone}</Text>
                        <Copy size={12} color={c.textMuted} style={{ marginLeft: 2 }} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => copy(`${order.delivery_city}, ${order.delivery_address}`, "Адрес")}
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <MapPin size={14} color={P} />
                        <Text style={{ fontSize: 13, color: c.textSub, flex: 1 }}>{order.delivery_city}, {order.delivery_address}</Text>
                        <Copy size={12} color={c.textMuted} />
                      </TouchableOpacity>
                      {(order.delivery_date || order.delivery_time) && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Calendar size={14} color={P} />
                          <Text style={{ fontSize: 13, color: c.textSub }}>
                            {[order.delivery_date, order.delivery_time].filter(Boolean).join(" · ")}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Payment */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.inputBg, borderRadius: 14, padding: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <CreditCard size={14} color={P} />
                        <Text style={{ fontSize: 13, color: c.textSub }}>
                          {order.payment_method === "cash" || order.payment_method === "on_delivery"
                            ? "Наличными / при получении"
                            : `Карта •••• ${order.payment_method.replace("card_", "")}`}
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: order.is_paid ? "#dcfce7" : "#fee2e2" }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: order.is_paid ? "#16a34a" : "#ef4444" }}>
                          {order.is_paid ? "Оплачен" : "Не оплачен"}
                        </Text>
                      </View>
                    </View>

                    {/* Total */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 13, color: c.textSub }}>Итого</Text>
                      <Text style={{ fontSize: 18, fontWeight: "900", color: P }}>{order.total_price.toLocaleString()} сом.</Text>
                    </View>

                    {/* Buttons row */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity onPress={() => openChat(order)}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: P + "15", borderRadius: 14, paddingVertical: 11 }}>
                        <MessageCircle size={15} color={P} />
                        <Text style={{ fontSize: 13, fontWeight: "700", color: P }}>Написать</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => shareOrder(order)}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.inputBg, borderRadius: 14, paddingVertical: 11 }}>
                        <Share2 size={15} color={c.textSub} />
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSub }}>Поделиться</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Status action */}
                {order.status !== "cancelled" && order.status !== "delivered" && (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: c.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSub }}>
                      {order.total_price.toLocaleString()} сом.
                    </Text>
                    {nextLabel && (
                      <TouchableOpacity onPress={() => updateStatus(order)} disabled={isUpdating}
                        style={{ backgroundColor: P, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : (
                          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{nextLabel} →</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {order.status === "delivered" && (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: c.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSub }}>{order.total_price.toLocaleString()} сом.</Text>
                    <View style={{ backgroundColor: "#dcfce7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>✓ Выполнен</Text>
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
