import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrendingUp, Wallet, ArrowDownCircle, Clock, CheckCircle, XCircle } from "lucide-react-native";
import Toast from "react-native-toast-message";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemeColors } from "@/lib/theme";
import { SkeletonStatCard } from "@/components/Skeleton";

const P = "#8B5CF6";

interface Payout { id: number; amount: number; status: string; bank_details?: string; created_at: string; comment?: string; }
interface Balance { balance: number; total_earned: number; total_withdrawn: number; payouts: Payout[]; }

const STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending:  { label: "Ожидает",   color: "#f59e0b", icon: Clock },
  approved: { label: "Выплачено", color: "#16a34a", icon: CheckCircle },
  paid:     { label: "Выплачено", color: "#16a34a", icon: CheckCircle },
  rejected: { label: "Отклонено", color: "#ef4444", icon: XCircle },
  cancelled:{ label: "Отменено",  color: "#ef4444", icon: XCircle },
};

export default function SellerAnalyticsScreen() {
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    api.get<Balance>("/seller/balance")
      .then((r) => setBalance(r.data))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [user]);

  useEffect(() => { load(); }, []);

  const requestPayout = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 100) { Toast.show({ type: "error", text1: "Минимум 100 сом." }); return; }
    if (!bankDetails.trim()) { Toast.show({ type: "error", text1: "Введите реквизиты" }); return; }
    if (amt > (balance?.balance || 0)) { Toast.show({ type: "error", text1: "Недостаточно средств" }); return; }
    setRequesting(true);
    try {
      await api.post("/seller/payouts", { amount: amt, bank_details: bankDetails.trim() });
      Toast.show({ type: "success", text1: "Заявка на вывод отправлена" });
      setModal(false);
      setAmount(""); setBankDetails("");
      load();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Ошибка" });
    } finally { setRequesting(false); }
  };

  const bal = balance?.balance || 0;
  const earned = balance?.total_earned || 0;
  const withdrawn = balance?.total_withdrawn || 0;
  const payouts = balance?.payouts || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Финансы</Text>
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={P} />}
        >
          {/* Balance card */}
          <View style={{ backgroundColor: P, borderRadius: 24, padding: 24, gap: 4 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "500" }}>Доступный баланс</Text>
            <Text style={{ color: "#fff", fontSize: 36, fontWeight: "900" }}>{bal.toLocaleString()} сом.</Text>
            <TouchableOpacity
              onPress={() => bal > 0 ? setModal(true) : Toast.show({ type: "info", text1: "Баланс пуст" })}
              style={{ marginTop: 14, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              <ArrowDownCircle size={16} color={P} />
              <Text style={{ color: P, fontWeight: "700", fontSize: 14 }}>Вывести средства</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 6 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={16} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>{earned.toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "500" }}>Всего заработано</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 6 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={16} color={P} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>{withdrawn.toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "500" }}>Выведено</Text>
            </View>
          </View>

          {/* Payout history */}
          <View style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: c.border }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>История выплат</Text>
            </View>
            {payouts.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Wallet size={36} color={c.border} />
                <Text style={{ color: c.textMuted, marginTop: 10, fontSize: 13 }}>Выплат ещё не было</Text>
              </View>
            ) : payouts.map((p, i) => {
              const s = STATUS[p.status] || STATUS.pending;
              const Icon = s.icon;
              return (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: i < payouts.length - 1 ? 0.5 : 0, borderBottomColor: c.border, gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.color + "15", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color={s.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>{p.amount.toLocaleString()} сом.</Text>
                    {p.bank_details && <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 1 }} numberOfLines={1}>{p.bank_details}</Text>}
                    {p.comment && <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 1 }}>{p.comment}</Text>}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View style={{ backgroundColor: s.color + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: s.color }}>{s.label}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: c.textMuted }}>{new Date(p.created_at).toLocaleDateString("ru-RU")}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Payout Modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setModal(false)} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, marginBottom: 6 }}>Вывод средств</Text>
          <Text style={{ fontSize: 13, color: c.textMuted, marginBottom: 20 }}>Доступно: {bal.toLocaleString()} сом.</Text>

          <Text style={{ fontSize: 12, color: c.textSub, marginBottom: 6, fontWeight: "500" }}>Сумма (мин. 100 сом.)</Text>
          <TextInput
            value={amount} onChangeText={setAmount}
            placeholder="0" placeholderTextColor={c.textMuted}
            keyboardType="numeric"
            style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: "700", color: c.text, marginBottom: 14, borderWidth: 1, borderColor: c.border }}
          />

          <Text style={{ fontSize: 12, color: c.textSub, marginBottom: 6, fontWeight: "500" }}>Реквизиты (номер карты, IBAN)</Text>
          <TextInput
            value={bankDetails} onChangeText={setBankDetails}
            placeholder="1234 5678 9012 3456" placeholderTextColor={c.textMuted}
            style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, marginBottom: 20, borderWidth: 1, borderColor: c.border }}
          />

          <TouchableOpacity onPress={requestPayout} disabled={requesting} style={{ backgroundColor: P, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
            {requesting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Отправить заявку</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
