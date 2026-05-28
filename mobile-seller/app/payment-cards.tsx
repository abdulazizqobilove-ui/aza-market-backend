import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Plus, Trash2, Star, CreditCard } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import api from "@/lib/api";
import { useThemeColors } from "@/lib/theme";
import { SkeletonListItem } from "@/components/Skeleton";

interface Card {
  id: number;
  last4: string;
  card_holder: string;
  expiry: string;
  card_type: string;
  is_default: boolean;
}

const CARD_COLORS: Record<string, { bg: string; text: string }> = {
  visa:       { bg: "#1a1f71", text: "#fff" },
  mastercard: { bg: "#eb001b", text: "#fff" },
  uzcard:     { bg: "#00a651", text: "#fff" },
  humo:       { bg: "#f7941d", text: "#fff" },
};

const CARD_TYPES = [
  { key: "visa", label: "Visa" },
  { key: "mastercard", label: "Mastercard" },
  { key: "uzcard", label: "Uzcard" },
  { key: "humo", label: "Humo" },
];

function CardItem({ card, onDelete, onDefault }: { card: Card; onDelete: () => void; onDefault: () => void }) {
  const colors = CARD_COLORS[card.card_type] || { bg: "#374151", text: "#fff" };
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 20, padding: 20, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <View style={{ backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>{card.card_type.toUpperCase()}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {!card.is_default && (
            <TouchableOpacity onPress={onDefault} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <Star size={15} color={colors.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={15} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", letterSpacing: 4, marginBottom: 16 }}>
        •••• •••• •••• {card.last4}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginBottom: 2 }}>ДЕРЖАТЕЛЬ КАРТЫ</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{card.card_holder}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginBottom: 2 }}>СРОК</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{card.expiry}</Text>
        </View>
      </View>
      {card.is_default && (
        <View style={{ marginTop: 12, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" }}>
          <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>Основная карта</Text>
        </View>
      )}
    </View>
  );
}

export default function PaymentCardsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cardType, setCardType] = useState("visa");
  const [last4, setLast4] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [adding, setAdding] = useState(false);

  const load = () => {
    api.get<Card[]>("/users/me/cards")
      .then((r) => setCards(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const addCard = async () => {
    if (last4.length !== 4 || !holder || expiry.length < 4) {
      Toast.show({ type: "error", text1: "Заполните все поля" });
      return;
    }
    setAdding(true);
    try {
      const res = await api.post<Card>("/users/me/cards", { last4, card_holder: holder, expiry, card_type: cardType });
      setCards((p) => [...p, res.data]);
      setShowModal(false);
      setLast4(""); setHolder(""); setExpiry(""); setCardType("visa");
      Toast.show({ type: "success", text1: "Карта добавлена!" });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.detail || "Ошибка" });
    } finally {
      setAdding(false);
    }
  };

  const deleteCard = (id: number) => {
    Alert.alert("Удалить карту?", "Карта будет удалена", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
        await api.delete(`/users/me/cards/${id}`).catch(() => {});
        setCards((p) => p.filter((card) => card.id !== id));
        Toast.show({ type: "success", text1: "Карта удалена" });
      }},
    ]);
  };

  const setDefault = async (id: number) => {
    const res = await api.patch<Card>(`/users/me/cards/${id}/default`).catch(() => null);
    if (res) setCards((p) => p.map((card) => ({ ...card, is_default: card.id === id })));
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Способы оплаты</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center" }}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ gap: 10, paddingTop: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonListItem key={i} />)}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {cards.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <CreditCard size={36} color={c.textMuted} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 6 }}>Нет сохранённых карт</Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center", marginBottom: 24 }}>Добавьте карту для быстрой оплаты</Text>
              <TouchableOpacity onPress={() => setShowModal(true)} style={{ backgroundColor: "#8B5CF6", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Plus size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Добавить карту</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cards.map((card) => (
              <CardItem key={card.id} card={card} onDelete={() => deleteCard(card.id)} onDefault={() => setDefault(card.id)} />
            ))
          )}
        </ScrollView>
      )}

      {/* Add card modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
          <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <TouchableOpacity onPress={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
              <ChevronLeft size={20} color={c.textSub} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Добавить карту</Text>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
              {/* Card type */}
              <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSub, marginBottom: 10 }}>Тип карты</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {CARD_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setCardType(t.key)}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: cardType === t.key ? "#8B5CF6" : c.iconBg }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: cardType === t.key ? "#fff" : c.textSub }}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>Последние 4 цифры карты</Text>
                  <TextInput
                    value={last4}
                    onChangeText={(v) => setLast4(v.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                    maxLength={4}
                    style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20, color: c.text, letterSpacing: 8, fontWeight: "700" }}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>Имя держателя</Text>
                  <TextInput
                    value={holder}
                    onChangeText={(v) => setHolder(v.toUpperCase())}
                    placeholder="IVAN IVANOV"
                    placeholderTextColor={c.textMuted}
                    autoCapitalize="characters"
                    style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text }}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSub, marginBottom: 6 }}>Срок действия</Text>
                  <TextInput
                    value={expiry}
                    onChangeText={(v) => setExpiry(formatExpiry(v))}
                    placeholder="MM/YY"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                    maxLength={5}
                    style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text }}
                  />
                </View>
              </View>

              {/* Preview */}
              {(last4 || holder) ? (
                <View style={{ backgroundColor: CARD_COLORS[cardType]?.bg || "#374151", borderRadius: 18, padding: 20 }}>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 20 }}>{cardType.toUpperCase()}</Text>
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: 4, marginBottom: 16 }}>
                    •••• •••• •••• {last4 || "????"}
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{holder || "ИМЯ ДЕРЖАТЕЛЯ"}</Text>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{expiry || "MM/YY"}</Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={addCard}
                disabled={adding}
                style={{ backgroundColor: "#8B5CF6", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
              >
                {adding ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Добавить карту</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
