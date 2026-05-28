import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft, MapPin, Phone, CreditCard, CheckCircle2,
  Package, Clock, Calendar, Plus, X, Tag, Truck, ChevronRight,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api, { imgUrl } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useThemeColors } from "@/lib/theme";

interface Card { id: number; last4: string; card_holder: string; expiry: string; card_type: string; is_default: boolean; }

const CITIES = ["Душанбе", "Худжанд", "Бохтар", "Куляб", "Истаравшан", "Пенджикент", "Вахдат", "Турсунзаде"];
const TIME_SLOTS = ["9:00–12:00", "12:00–15:00", "15:00–18:00", "18:00–21:00"];
const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_FULL = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

type PayType = "card_online" | "on_delivery";

function getDeliveryDates() {
  const now = new Date();
  const minOffset = now.getHours() < 15 ? 1 : 2;
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + minOffset + i);
    return d;
  });
}

function detectCardType(num: string): string {
  if (num.startsWith("4")) return "visa";
  if (num.startsWith("5")) return "mastercard";
  if (num.startsWith("9860") || num.startsWith("8600")) return "uzcard";
  return "visa";
}

const P = "#8B5CF6";

export default function CheckoutScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const { items, fetch: fetchCart } = useCartStore();
  const user = useAuthStore((s) => s.user);

  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [payType, setPayType] = useState<PayType>("on_delivery");
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const deliveryDates = getDeliveryDates();
  const [deliveryDate, setDeliveryDate] = useState<Date>(deliveryDates[0]);
  const [deliveryTime, setDeliveryTime] = useState<string>(TIME_SLOTS[1]);

  const [addCardModal, setAddCardModal] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  const idSet = new Set((ids || "").split(",").map(Number).filter(Boolean));
  const selectedItems = items.filter((i) => idSet.has(i.id));
  const subtotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const originalTotal = selectedItems.reduce((s, i) => s + (i.product.original_price ?? i.product.price) * i.quantity, 0);
  const discount = originalTotal - subtotal;
  const total = subtotal;
  const totalQty = selectedItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (items.length === 0) fetchCart();
    api.get<Card[]>("/users/me/cards").then((r) => {
      setCards(r.data);
      const def = r.data.find((cd) => cd.is_default);
      if (def) setSelectedCardId(def.id);
    }).catch(() => {});
  }, []);

  const formatCardNum = (val: string) => val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  };

  const addCard = async () => {
    const digits = cardNum.replace(/\s/g, "");
    if (digits.length < 16) { Toast.show({ type: "error", text1: "Введите 16 цифр карты" }); return; }
    if (!cardHolder.trim()) { Toast.show({ type: "error", text1: "Введите имя держателя" }); return; }
    if (cardExpiry.length < 5) { Toast.show({ type: "error", text1: "Введите срок действия" }); return; }
    setAddingCard(true);
    try {
      const r = await api.post<Card>("/users/me/cards", {
        last4: digits.slice(-4),
        card_holder: cardHolder.trim().toUpperCase(),
        expiry: cardExpiry,
        card_type: detectCardType(digits),
      });
      setCards((prev) => [...prev, r.data]);
      setSelectedCardId(r.data.id);
      setPayType("card_online");
      setAddCardModal(false);
      setCardNum(""); setCardHolder(""); setCardExpiry(""); setCardCvv("");
      Toast.show({ type: "success", text1: "Карта добавлена" });
    } catch {
      Toast.show({ type: "error", text1: "Не удалось добавить карту" });
    } finally {
      setAddingCard(false);
    }
  };

  const place = async () => {
    if (!city) { Toast.show({ type: "error", text1: "Выберите город" }); return; }
    if (!address.trim()) { Toast.show({ type: "error", text1: "Укажите адрес доставки" }); return; }
    if (!phone.trim()) { Toast.show({ type: "error", text1: "Укажите номер телефона" }); return; }
    if (payType === "card_online" && !selectedCardId) { Toast.show({ type: "error", text1: "Выберите карту" }); return; }

    setPlacing(true);
    try {
      const card = payType === "card_online" ? cards.find((cd) => cd.id === selectedCardId) : null;
      await api.post<{ id: number }>("/orders", {
        delivery_address: address.trim(),
        delivery_city: city,
        contact_phone: phone.trim(),
        payment_method: card ? `card_${card.last4}` : "on_delivery",
        delivery_date: `${deliveryDate.getDate()} ${MONTHS_FULL[deliveryDate.getMonth()]}`,
        delivery_time: deliveryTime,
        item_ids: [...idSet],
      }).then((res) => {
        setOrderId(res.data.id);
        fetchCart();
      });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.detail || "Ошибка оформления" });
    } finally {
      setPlacing(false);
    }
  };

  if (orderId !== null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <CheckCircle2 size={56} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: c.text, marginBottom: 8 }}>Заказ оформлен!</Text>
          <Text style={{ fontSize: 14, color: c.textSub, textAlign: "center", marginBottom: 16 }}>Заказ #{orderId} принят в обработку</Text>
          <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, width: "100%", marginBottom: 24, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Calendar size={14} color={P} />
              <Text style={{ fontSize: 13, color: c.textSub }}>Доставка <Text style={{ fontWeight: "700", color: c.text }}>{deliveryDate.getDate()} {MONTHS_FULL[deliveryDate.getMonth()]}</Text></Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Clock size={14} color={P} />
              <Text style={{ fontSize: 13, color: c.textSub }}>Время <Text style={{ fontWeight: "700", color: c.text }}>{deliveryTime}</Text></Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Phone size={14} color={P} />
              <Text style={{ fontSize: 13, color: c.textSub }}>Свяжемся по <Text style={{ fontWeight: "700", color: c.text }}>{phone}</Text></Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.replace("/orders" as any)}
            style={{ backgroundColor: P, paddingVertical: 15, borderRadius: 16, width: "100%", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Мои заказы</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)" as any)} style={{ paddingVertical: 14, width: "100%", alignItems: "center" }}>
            <Text style={{ color: c.textSub, fontWeight: "600", fontSize: 14 }}>На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Оформление заказа</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

          {/* Delivery date + time */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Calendar size={15} color={P} />
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>Дата доставки</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {deliveryDates.map((d, i) => {
                const sel = d.toDateString() === deliveryDate.toDateString();
                return (
                  <TouchableOpacity key={i} onPress={() => setDeliveryDate(d)}
                    style={{ width: 64, paddingVertical: 10, borderRadius: 14, alignItems: "center", borderWidth: 2, borderColor: sel ? P : c.border, backgroundColor: sel ? P : c.card }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: sel ? "rgba(255,255,255,0.8)" : c.textMuted, marginBottom: 2 }}>{WEEKDAYS[d.getDay()]}</Text>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: sel ? "#fff" : c.text }}>{d.getDate()}</Text>
                    <Text style={{ fontSize: 10, color: sel ? "rgba(255,255,255,0.7)" : c.textMuted, marginTop: 1 }}>{MONTHS_SHORT[d.getMonth()]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Clock size={15} color={P} />
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>Удобное время</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TIME_SLOTS.map((slot) => {
                const sel = deliveryTime === slot;
                return (
                  <TouchableOpacity key={slot} onPress={() => setDeliveryTime(slot)}
                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: sel ? P : c.border, backgroundColor: sel ? P : c.card }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? "#fff" : c.textSub }}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Address */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MapPin size={15} color={P} />
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>Адрес доставки</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CITIES.map((cityName) => (
                <TouchableOpacity key={cityName} onPress={() => setCity(cityName)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: city === cityName ? P : c.border, backgroundColor: city === cityName ? P : c.card }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: city === cityName ? "#fff" : c.textSub }}>{cityName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput value={address} onChangeText={setAddress} placeholder="Улица, дом, квартира" placeholderTextColor={c.textMuted}
              style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
          </View>

          {/* Contact */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Phone size={15} color={P} />
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>Контактный телефон</Text>
            </View>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+992 XX XXX XXXX" placeholderTextColor={c.textMuted}
              keyboardType="phone-pad" style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
          </View>

          {/* Payment */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.text, marginBottom: 2 }}>Способ оплаты</Text>

            {/* Card online */}
            <TouchableOpacity onPress={() => setPayType("card_online")}
              style={{ borderWidth: 2, borderRadius: 16, borderColor: payType === "card_online" ? P : c.border, backgroundColor: payType === "card_online" ? P + "0D" : c.card, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center" }}>
                  <CreditCard size={20} color={P} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Картой онлайн</Text>
                  <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>UZCARD, HUMO, Visa, Mastercard</Text>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: payType === "card_online" ? P : c.border, backgroundColor: payType === "card_online" ? P : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {payType === "card_online" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" }} />}
                </View>
              </View>

              {payType === "card_online" && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {cards.map((card) => (
                    <TouchableOpacity key={card.id} onPress={() => setSelectedCardId(card.id)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: selectedCardId === card.id ? P : c.inputBg }}>
                      <CreditCard size={16} color={selectedCardId === card.id ? "#fff" : c.textSub} />
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: selectedCardId === card.id ? "#fff" : c.text }}>
                        {card.card_type.toUpperCase()} •••• {card.last4}
                      </Text>
                      <Text style={{ fontSize: 12, color: selectedCardId === card.id ? "rgba(255,255,255,0.65)" : c.textMuted }}>{card.expiry}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setAddCardModal(true)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: P, borderStyle: "dashed" }}>
                    <Plus size={15} color={P} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: P }}>Добавить карту</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>

            {/* On delivery */}
            <TouchableOpacity onPress={() => setPayType("on_delivery")}
              style={{ borderWidth: 2, borderRadius: 16, borderColor: payType === "on_delivery" ? "#111" : c.border, backgroundColor: payType === "on_delivery" ? (c.bg) : c.card, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: payType === "on_delivery" ? "#1a1a2e" : c.iconBg, alignItems: "center", justifyContent: "center" }}>
                  <Truck size={20} color={payType === "on_delivery" ? "#fff" : c.textSub} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Оплата при получении</Text>
                  <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>Наличными или картой курьеру</Text>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: payType === "on_delivery" ? "#111" : c.border, backgroundColor: payType === "on_delivery" ? "#111" : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {payType === "on_delivery" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" }} />}
                </View>
              </View>
              {payType === "on_delivery" && (
                <View style={{ marginTop: 10, backgroundColor: "#f3f4f6", borderRadius: 10, padding: 10 }}>
                  <Text style={{ fontSize: 12, color: "#6b7280" }}>Оплата курьеру при получении заказа</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Promo code */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, overflow: "hidden" }}>
            <TouchableOpacity onPress={() => setPromoOpen(!promoOpen)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center" }}>
                <Tag size={16} color={P} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.text }}>Добавить промокод</Text>
              <ChevronRight size={16} color={c.textMuted} style={{ transform: [{ rotate: promoOpen ? "90deg" : "0deg" }] }} />
            </TouchableOpacity>
            {promoOpen && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", gap: 10 }}>
                <TextInput value={promoCode} onChangeText={(v) => setPromoCode(v.toUpperCase())}
                  placeholder="Введите промокод" placeholderTextColor={c.textMuted} autoCapitalize="characters"
                  style={{ flex: 1, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text }} />
                <TouchableOpacity style={{ backgroundColor: P, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Применить</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Order summary */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Package size={15} color={P} />
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>Ваш заказ</Text>
            </View>
            {selectedItems.map((item) => {
              const img = item.product.images?.find((i) => i.is_main) || item.product.images?.[0];
              return (
                <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", backgroundColor: c.iconBg }}>
                    {img ? <Image source={{ uri: imgUrl(img.url) ?? "" }} style={{ width: 44, height: 44 }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text>📦</Text></View>}
                  </View>
                  <Text style={{ flex: 1, fontSize: 12, color: c.textSub }} numberOfLines={2}>{item.product.title}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }}>{(item.product.price * item.quantity).toLocaleString()}</Text>
                </View>
              );
            })}
            <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10, gap: 8, marginTop: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: c.textSub }}>{totalQty} {totalQty === 1 ? "товар" : "товара"}</Text>
                <Text style={{ fontSize: 13, color: c.textSub }}>{originalTotal.toLocaleString()} сом.</Text>
              </View>
              {discount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: "#16a34a" }}>Скидка</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>−{discount.toLocaleString()} сом.</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: c.textSub }}>Доставка</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Бесплатно</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>К оплате</Text>
                <Text style={{ fontSize: 18, fontWeight: "900", color: c.text }}>{total.toLocaleString()} сом.</Text>
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 11, color: c.textMuted, textAlign: "center", lineHeight: 16 }}>
            Размещая заказ, вы соглашаетесь с условиями{"\n"}обработки персональных данных платформы
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: c.textMuted }}>К оплате</Text>
          <Text style={{ fontSize: 20, fontWeight: "900", color: c.text }}>{total.toLocaleString()} сом.</Text>
        </View>
        <TouchableOpacity onPress={place} disabled={placing}
          style={{ backgroundColor: P, paddingVertical: 16, borderRadius: 16, alignItems: "center" }}>
          {placing ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Оформить заказ</Text>}
        </TouchableOpacity>
      </View>

      {/* Add card modal */}
      <Modal visible={addCardModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>Добавить карту</Text>
              <TouchableOpacity onPress={() => setAddCardModal(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={c.textSub} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>Номер карты</Text>
                <TextInput value={cardNum} onChangeText={(v) => setCardNum(formatCardNum(v))} placeholder="0000 0000 0000 0000"
                  placeholderTextColor={c.textMuted} keyboardType="number-pad" maxLength={19}
                  style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.text, letterSpacing: 1 }} />
              </View>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>Имя держателя</Text>
                <TextInput value={cardHolder} onChangeText={(v) => setCardHolder(v.toUpperCase())} placeholder="IVAN IVANOV"
                  placeholderTextColor={c.textMuted} autoCapitalize="characters"
                  style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>Срок действия</Text>
                  <TextInput value={cardExpiry} onChangeText={(v) => setCardExpiry(formatExpiry(v))} placeholder="MM/YY"
                    placeholderTextColor={c.textMuted} keyboardType="number-pad" maxLength={5}
                    style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>CVV</Text>
                  <TextInput value={cardCvv} onChangeText={setCardCvv} placeholder="•••" placeholderTextColor={c.textMuted}
                    keyboardType="number-pad" maxLength={4} secureTextEntry
                    style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }} />
                </View>
              </View>
              <TouchableOpacity onPress={addCard} disabled={addingCard}
                style={{ backgroundColor: P, paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 4 }}>
                {addingCard ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Добавить карту</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
