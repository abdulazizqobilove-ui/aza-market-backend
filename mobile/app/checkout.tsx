import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, MapPin, Phone, Banknote, CreditCard, CheckCircle2, Package } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api, { API_URL } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";

interface Card { id: number; last4: string; card_holder: string; expiry: string; card_type: string; is_default: boolean; }

const CITIES = ["Душанбе", "Худжанд", "Бохтар", "Куляб", "Истаравшан", "Пенджикент", "Вахдат", "Турсунзаде"];

export default function CheckoutScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const { items, fetch: fetchCart } = useCartStore();
  const user = useAuthStore((s) => s.user);

  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [payMethod, setPayMethod] = useState<"cash" | "card">("cash");
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const idSet = new Set((ids || "").split(",").map(Number).filter(Boolean));
  const selectedItems = items.filter((i) => idSet.has(i.id));
  const total = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalQty = selectedItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (items.length === 0) fetchCart();
    api.get<Card[]>("/users/me/cards").then((r) => {
      setCards(r.data);
      const def = r.data.find((c) => c.is_default);
      if (def) setSelectedCardId(def.id);
    }).catch(() => {});
  }, []);

  const place = async () => {
    if (!city) { Toast.show({ type: "error", text1: "Выберите город" }); return; }
    if (!address.trim()) { Toast.show({ type: "error", text1: "Укажите адрес доставки" }); return; }
    if (!phone.trim()) { Toast.show({ type: "error", text1: "Укажите номер телефона" }); return; }
    if (payMethod === "card" && !selectedCardId) { Toast.show({ type: "error", text1: "Выберите карту" }); return; }

    setPlacing(true);
    try {
      const card = payMethod === "card" ? cards.find((c) => c.id === selectedCardId) : null;
      const res = await api.post<{ id: number }>("/orders", {
        delivery_address: address.trim(),
        delivery_city: city,
        contact_phone: phone.trim(),
        payment_method: card ? `card_${card.last4}` : "cash",
        item_ids: [...idSet],
      });
      setOrderId(res.data.id);
      fetchCart();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.detail || "Ошибка оформления" });
    } finally {
      setPlacing(false);
    }
  };

  // Success screen
  if (orderId !== null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <CheckCircle2 size={56} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: "#111827", marginBottom: 8 }}>Заказ оформлен!</Text>
          <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 6 }}>Заказ #{orderId} принят в обработку</Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", marginBottom: 40 }}>
            Продавец свяжется с вами по номеру{"\n"}{phone}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/orders" as any)}
            style={{ backgroundColor: "#111827", paddingVertical: 15, borderRadius: 16, width: "100%", alignItems: "center", marginBottom: 12 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Мои заказы</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)" as any)} style={{ paddingVertical: 14, width: "100%", alignItems: "center" }}>
            <Text style={{ color: "#6b7280", fontWeight: "600", fontSize: 14 }}>На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      <View style={{ backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Оформление заказа</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

          {/* Items */}
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Package size={15} color="#6b7280" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Товары · {totalQty} шт.</Text>
            </View>
            {selectedItems.map((item) => {
              const img = item.product.images?.find((i) => i.is_main) || item.product.images?.[0];
              return (
                <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                    {img ? <Image source={{ uri: `${API_URL}${img.url}` }} style={{ width: 48, height: 48 }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 18 }}>📦</Text></View>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }} numberOfLines={1}>{item.product.title}</Text>
                    <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{item.quantity} × {item.product.price.toLocaleString()} сом.</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>{(item.product.price * item.quantity).toLocaleString()}</Text>
                </View>
              );
            })}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6", marginTop: 2 }}>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>Доставка</Text>
              <Text style={{ fontSize: 13, color: "#16a34a", fontWeight: "600" }}>Бесплатно</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>Итого</Text>
              <Text style={{ fontSize: 17, fontWeight: "900", color: "#111827" }}>{total.toLocaleString()} сом.</Text>
            </View>
          </View>

          {/* Delivery */}
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MapPin size={15} color="#6b7280" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Доставка</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 8 }}>Город</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {CITIES.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setCity(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: city === c ? "#111827" : "#f3f4f6" }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: city === c ? "#fff" : "#374151" }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 6 }}>Адрес</Text>
              <TextInput value={address} onChangeText={setAddress} placeholder="Улица, дом, квартира" style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827" }} />
            </View>
          </View>

          {/* Contact */}
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Phone size={15} color="#6b7280" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Контактный телефон</Text>
            </View>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+992 XX XXX XXXX" keyboardType="phone-pad" style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827" }} />
          </View>

          {/* Payment */}
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <CreditCard size={15} color="#6b7280" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Способ оплаты</Text>
            </View>

            <TouchableOpacity onPress={() => setPayMethod("cash")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: payMethod === "cash" ? "#111827" : "#f3f4f6", backgroundColor: payMethod === "cash" ? "#f9fafb" : "#fff" }}>
              <Banknote size={20} color={payMethod === "cash" ? "#111827" : "#9ca3af"} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: payMethod === "cash" ? "#111827" : "#6b7280" }}>Наличными</Text>
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>При получении</Text>
              </View>
              {payMethod === "cash" && <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✓</Text></View>}
            </TouchableOpacity>

            {cards.length > 0 && (
              <>
                <TouchableOpacity onPress={() => setPayMethod("card")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: payMethod === "card" ? "#111827" : "#f3f4f6", backgroundColor: payMethod === "card" ? "#f9fafb" : "#fff" }}>
                  <CreditCard size={20} color={payMethod === "card" ? "#111827" : "#9ca3af"} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: payMethod === "card" ? "#111827" : "#6b7280" }}>Картой</Text>
                    <Text style={{ fontSize: 12, color: "#9ca3af" }}>Сохранённая карта</Text>
                  </View>
                  {payMethod === "card" && <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✓</Text></View>}
                </TouchableOpacity>
                {payMethod === "card" && (
                  <View style={{ gap: 8, paddingHorizontal: 4 }}>
                    {cards.map((card) => (
                      <TouchableOpacity key={card.id} onPress={() => setSelectedCardId(card.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, backgroundColor: selectedCardId === card.id ? "#111827" : "#f9fafb" }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: selectedCardId === card.id ? "#fff" : "#374151" }}>{card.card_type.toUpperCase()} •••• {card.last4}</Text>
                        <Text style={{ fontSize: 12, color: selectedCardId === card.id ? "rgba(255,255,255,0.6)" : "#9ca3af", flex: 1 }}>{card.card_holder}</Text>
                        {card.is_default && <View style={{ backgroundColor: selectedCardId === card.id ? "rgba(255,255,255,0.15)" : "#e5e7eb", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}><Text style={{ fontSize: 10, fontWeight: "700", color: selectedCardId === card.id ? "#fff" : "#6b7280" }}>Основная</Text></View>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6", padding: 16, paddingBottom: 32 }}>
        <TouchableOpacity onPress={place} disabled={placing} style={{ backgroundColor: "#111827", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}>
          {placing ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Оформить заказ · {total.toLocaleString()} сом.</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
