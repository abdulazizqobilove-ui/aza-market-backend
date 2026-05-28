import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowLeft, MapPin, ChevronRight, Clock, CheckCircle2, Truck, Star, MessageCircle, Send, CreditCard, XCircle, X, Plus } from "lucide-react-native";
import { EmptyState } from "@/components/EmptyState";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api, { Order, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemeColors } from "@/lib/theme";
import { SkeletonOrderItem } from "@/components/Skeleton";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает", confirmed: "Подтверждён", processing: "В обработке",
  shipped: "В пути", delivered: "Доставлен", cancelled: "Отменён",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "#fef3c7", text: "#d97706" },
  confirmed:  { bg: "#dbeafe", text: "#2563eb" },
  processing: { bg: "#dbeafe", text: "#2563eb" },
  shipped:    { bg: "#e0e7ff", text: "#4f46e5" },
  delivered:  { bg: "#dcfce7", text: "#16a34a" },
  cancelled:  { bg: "#fee2e2", text: "#ef4444" },
};
const TIMELINE = [
  { key: "pending",   label: "Принят",       icon: Clock         },
  { key: "confirmed", label: "Подтверждён",  icon: CheckCircle2  },
  { key: "shipped",   label: "В пути",       icon: Truck         },
  { key: "delivered", label: "Доставлен",    icon: Star          },
];
const STATUS_STEP: Record<string, number> = {
  pending: 0, confirmed: 1, processing: 1, shipped: 2, delivered: 3, cancelled: -1,
};

const P = "#8B5CF6";

interface MsgItem { id: number; sender_id: number; sender_name: string; text: string; created_at: string; }
interface ChatItem { id: number; }
interface Card { id: number; last4: string; card_holder: string; expiry: string; card_type: string; is_default: boolean; }

export default function OrdersScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Chat state
  const [chatOrderId, setChatOrderId] = useState<number | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MsgItem[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Pay modal
  const [payModalOrder, setPayModalOrder] = useState<Order | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [cardsLoading, setCardsLoading] = useState(false);

  useEffect(() => {
    setCardsLoading(true);
    api.get<Card[]>("/users/me/cards").then((r) => {
      setCards(r.data);
      const def = r.data.find((c) => c.is_default);
      if (def) setSelectedCardId(def.id);
    }).catch(() => {}).finally(() => setCardsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>("/orders").then((r) => setOrders(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user?.id]);

  const openChat = async (order: Order) => {
    const sellerId = order.items[0]?.product?.seller_id;
    if (!sellerId) return;
    setLoadingChat(true);
    setChatOrderId(order.id);
    try {
      const r = await api.post<ChatItem>("/chats", { seller_id: sellerId, product_id: order.items[0]?.product?.id });
      setChatId(r.data.id);
      const msgs = await api.get<MsgItem[]>(`/chats/${r.data.id}/messages`);
      setMessages(msgs.data);
    } catch {
      Toast.show({ type: "error", text1: "Не удалось открыть чат" });
      setChatOrderId(null);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendMsg = async () => {
    if (!msgText.trim() || !chatId) return;
    setSending(true);
    const text = msgText.trim();
    setMsgText("");
    try {
      const r = await api.post<MsgItem>(`/chats/${chatId}/messages`, { text });
      setMessages((prev) => [...prev, r.data]);
    } catch {
      Toast.show({ type: "error", text1: "Не удалось отправить" });
    } finally {
      setSending(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    setActionLoading(orderId);
    try {
      const r = await api.post<Order>(`/orders/${orderId}/cancel`);
      setOrders((prev) => prev.map((o) => o.id === orderId ? r.data : o));
      Toast.show({ type: "success", text1: "Заказ отменён" });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.detail || "Ошибка" });
    } finally {
      setActionLoading(null);
    }
  };

  const openPayModal = (order: Order) => setPayModalOrder(order);

  const confirmPay = async () => {
    if (!payModalOrder) return;
    setActionLoading(payModalOrder.id);
    try {
      const r = await api.post<Order>(`/orders/${payModalOrder.id}/pay`);
      setOrders((prev) => prev.map((o) => o.id === payModalOrder.id ? r.data : o));
      setPayModalOrder(null);
      Toast.show({ type: "success", text1: "Заказ оплачен!" });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.detail || "Ошибка" });
    } finally {
      setActionLoading(null);
    }
  };

  const closeChat = () => { setChatOrderId(null); setChatId(null); setMessages([]); setMsgText(""); };

  // Chat overlay
  if (chatOrderId !== null) {
    const order = orders.find((o) => o.id === chatOrderId);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
          <TouchableOpacity onPress={closeChat} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={18} color={c.textSub} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>Заказ #{chatOrderId}</Text>
            <Text style={{ fontSize: 12, color: c.textMuted }}>Сообщение продавцу</Text>
          </View>
        </View>

        {loadingChat ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={P} />
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <FlatList
              data={messages}
              keyExtractor={(m) => String(m.id)}
              contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: messages.length === 0 ? "center" : "flex-end" }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", gap: 8 }}>
                  <MessageCircle size={40} color={c.border} />
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>Напишите вопрос продавцу</Text>
                </View>
              }
              renderItem={({ item: msg }) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <View style={{ alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {!isMe && <Text style={{ fontSize: 11, color: c.textMuted, marginBottom: 2 }}>{msg.sender_name}</Text>}
                    <View style={{ maxWidth: "75%", backgroundColor: isMe ? P : c.card, borderRadius: 16, borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4, paddingHorizontal: 14, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 14, color: isMe ? "#fff" : c.text }}>{msg.text}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>
                      {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                );
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border }}>
              <TextInput
                value={msgText}
                onChangeText={setMsgText}
                placeholder="Написать сообщение..."
                placeholderTextColor={c.textMuted}
                style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: c.text }}
                multiline
                onSubmitEditing={sendMsg}
              />
              <TouchableOpacity onPress={sendMsg} disabled={sending || !msgText.trim()}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: msgText.trim() ? P : c.iconBg, alignItems: "center", justifyContent: "center" }}>
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color={msgText.trim() ? "#fff" : c.textMuted} />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>Мои заказы</Text>
      </View>

      {loading ? (
        <View style={{ gap: 8, paddingTop: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonOrderItem key={i} />)}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 24 }}
          ListEmptyComponent={
            <EmptyState emoji="📦" title="Заказов пока нет" subtitle="Здесь появятся ваши заказы после первой покупки" />
          }
          renderItem={({ item: order }) => {
            const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
            const isExp = expanded === order.id;
            const canCancel = ["pending", "confirmed"].includes(order.status);
            const isLoading = actionLoading === order.id;

            return (
              <View style={{ backgroundColor: c.card, borderRadius: 18, overflow: "hidden" }}>
                <TouchableOpacity onPress={() => setExpanded(isExp ? null : order.id)} style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Заказ #{order.id}</Text>
                      <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
                        {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: sc.bg }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: sc.text }}>{STATUS_LABELS[order.status]}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: order.is_paid ? "#dcfce7" : "#fee2e2" }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: order.is_paid ? "#16a34a" : "#ef4444" }}>
                          {order.is_paid ? "Оплачен" : "Не оплачен"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", gap: 6, flex: 1 }}>
                      {order.items.slice(0, 3).map((item) => {
                        const img = item.product.images?.find((i) => i.is_main) || item.product.images?.[0];
                        return (
                          <View key={item.id} style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", backgroundColor: c.iconBg }}>
                            {img ? <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: 48, height: 48 }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text>📦</Text></View>}
                          </View>
                        );
                      })}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>{order.total_price.toLocaleString()} сом.</Text>
                      <Text style={{ fontSize: 12, color: c.textMuted }}>{order.items.length} товаров</Text>
                    </View>
                    <ChevronRight size={16} color={c.textMuted} style={{ transform: [{ rotate: isExp ? "90deg" : "0deg" }] }} />
                  </View>
                </TouchableOpacity>

                {isExp && (
                  <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>

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
                                  {idx > 0 && <View style={{ flex: 1, height: 2, backgroundColor: idx <= step ? P : c.border }} />}
                                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: done ? P : c.iconBg, alignItems: "center", justifyContent: "center" }}>
                                    <Icon size={14} color={done ? "#fff" : c.textMuted} />
                                  </View>
                                  {idx < TIMELINE.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: idx < step ? P : c.border }} />}
                                </View>
                                <Text style={{ fontSize: 9, color: done ? c.text : c.textMuted, fontWeight: done ? "700" : "400", marginTop: 4, textAlign: "center" }}>{t.label}</Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()}

                    {/* Items */}
                    {order.items.map((item) => (
                      <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 13, color: c.textSub, flex: 1, marginRight: 8 }} numberOfLines={1}>{item.product.title}</Text>
                        <Text style={{ fontSize: 12, color: c.textMuted, marginRight: 8 }}>× {item.quantity}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>{(item.price * item.quantity).toLocaleString()} сом.</Text>
                      </View>
                    ))}

                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSub }}>Итого</Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: c.text }}>{order.total_price.toLocaleString()} сом.</Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MapPin size={13} color={c.textMuted} />
                      <Text style={{ fontSize: 12, color: c.textMuted }}>{order.delivery_city}, {order.delivery_address}</Text>
                    </View>

                    {(order.delivery_date || order.delivery_time) && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Clock size={13} color={c.textMuted} />
                        <Text style={{ fontSize: 12, color: c.textMuted }}>
                          {[order.delivery_date, order.delivery_time].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                    )}

                    {/* Action buttons */}
                    <View style={{ gap: 8, marginTop: 4 }}>
                      {/* Chat */}
                      <TouchableOpacity onPress={() => openChat(order)}
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: P + "15", borderRadius: 14, paddingVertical: 12 }}>
                        <MessageCircle size={16} color={P} />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: P }}>Написать продавцу</Text>
                      </TouchableOpacity>

                      {/* Pay */}
                      {!order.is_paid && order.status !== "cancelled" && (
                        <TouchableOpacity onPress={() => openPayModal(order)}
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#16a34a", borderRadius: 14, paddingVertical: 12 }}>
                          <CreditCard size={16} color="#fff" />
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Оплатить заказ</Text>
                        </TouchableOpacity>
                      )}

                      {/* Cancel */}
                      {canCancel && (
                        <TouchableOpacity onPress={() => cancelOrder(order.id)} disabled={isLoading}
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fee2e2", borderRadius: 14, paddingVertical: 12 }}>
                          {isLoading ? <ActivityIndicator size="small" color="#ef4444" /> : <>
                            <XCircle size={16} color="#ef4444" />
                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#ef4444" }}>Отменить заказ</Text>
                          </>}
                        </TouchableOpacity>
                      )}
                    </View>

                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Pay modal */}
      <Modal visible={!!payModalOrder} transparent animationType="slide" presentationStyle="overFullScreen">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>Оплата заказа</Text>
                <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>Заказ #{payModalOrder?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setPayModalOrder(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={c.textSub} />
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={{ backgroundColor: c.inputBg, borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: c.textSub }}>К оплате</Text>
              <Text style={{ fontSize: 22, fontWeight: "900", color: c.text }}>{payModalOrder?.total_price.toLocaleString()} сом.</Text>
            </View>

            {/* Cards */}
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSub, marginBottom: 10 }}>Выберите карту</Text>
            {cardsLoading ? (
              <ActivityIndicator color={P} style={{ marginVertical: 16 }} />
            ) : cards.length === 0 ? (
              <TouchableOpacity onPress={() => { setPayModalOrder(null); router.push("/payment-cards" as any); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: P, borderStyle: "dashed", marginBottom: 16 }}>
                <Plus size={16} color={P} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: P }}>Добавить карту для оплаты</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 8, marginBottom: 16 }}>
                {cards.map((card) => (
                  <TouchableOpacity key={card.id} onPress={() => setSelectedCardId(card.id)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: selectedCardId === card.id ? P : c.border, backgroundColor: selectedCardId === card.id ? P + "0D" : c.card }}>
                    <CreditCard size={18} color={selectedCardId === card.id ? P : c.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>{card.card_type.toUpperCase()} •••• {card.last4}</Text>
                      <Text style={{ fontSize: 12, color: c.textMuted }}>{card.card_holder} · {card.expiry}</Text>
                    </View>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedCardId === card.id ? P : c.border, backgroundColor: selectedCardId === card.id ? P : "transparent", alignItems: "center", justifyContent: "center" }}>
                      {selectedCardId === card.id && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={confirmPay}
              disabled={actionLoading !== null || (cards.length > 0 && !selectedCardId)}
              style={{ backgroundColor: (actionLoading !== null || (cards.length > 0 && !selectedCardId)) ? c.iconBg : "#16a34a", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}>
              {actionLoading !== null ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  Подтвердить оплату · {payModalOrder?.total_price.toLocaleString()} сом.
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
