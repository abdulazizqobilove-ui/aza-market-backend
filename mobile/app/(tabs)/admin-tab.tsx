import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Users, Package, ShoppingBag, TrendingUp, CheckCircle, XCircle,
  Plus, Trash2, ToggleLeft, ToggleRight, Shield, Wallet,
  ChevronRight, UserCheck, UserX, Store, RefreshCw, Star, BarChart2,
} from "lucide-react-native";
import { Image } from "expo-image";
import Toast from "react-native-toast-message";
import api from "@/lib/api";

const P = "#8B5CF6";
const SECTIONS = ["Обзор", "Статистика", "Пользователи", "Заявки", "Выплаты", "Баннеры"] as const;
type Section = typeof SECTIONS[number];

interface Stats {
  users: number; products: number; orders: number; sellers: number;
  new_users_7d: number; new_users_30d: number;
  revenue: { total: number; last_7d: number; last_30d: number };
  orders_by_status: Record<string, number>;
  orders_7d: number; orders_30d: number;
  avg_rating: number; total_reviews: number;
  top_products: { id: number; title: string; price: number; sales_count: number; stock: number; image_url: string | null }[];
  top_sellers: { id: number; username: string; shop_name: string; revenue: number; products: number }[];
  chart_7d: { date: string; revenue: number }[];
}
interface AppUser { id: number; username?: string; phone?: string; full_name?: string; role: string; is_active: boolean; created_at: string; }
interface SellerApp { id: number; user_id: number; username?: string; phone?: string; shop_name: string; description?: string; status: string; created_at: string; }
interface Banner { id: number; title: string; subtitle?: string; bg_color: string; accent_color: string; emoji?: string; is_active: boolean; sort_order: number; }
interface Payout { id: number; seller_id: number; amount: number; status: string; comment?: string; created_at: string; }

const ROLE_LABELS: Record<string, string> = { buyer: "Покупатель", seller: "Продавец", admin: "Админ" };
const ROLE_COLORS: Record<string, string> = { buyer: "#3b82f6", seller: "#16a34a", admin: "#7c3aed" };
const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", approved: "#16a34a", rejected: "#ef4444", paid: "#16a34a", cancelled: "#ef4444" };
const STATUS_LABELS: Record<string, string> = { pending: "Ожидает", approved: "Одобрено", rejected: "Отклонено", paid: "Выплачено", cancelled: "Отменено" };

function SectionTab({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={{
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: active ? P : "#f3f4f6", marginRight: 8,
    }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : "#6b7280" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 8 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + "18", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "500" }}>{label}</Text>
    </View>
  );
}

function BannerForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: "", subtitle: "", bg_color: "#7C3AED", accent_color: "#C4B5FD", emoji: "", sort_order: "0" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { Toast.show({ type: "error", text1: "Введите заголовок" }); return; }
    setSaving(true);
    try {
      await api.post("/banners", {
        title: form.title.trim(), subtitle: form.subtitle.trim() || undefined,
        bg_color: form.bg_color, accent_color: form.accent_color,
        emoji: form.emoji.trim() || undefined, sort_order: parseInt(form.sort_order) || 0,
      });
      Toast.show({ type: "success", text1: "Баннер создан" });
      onSave();
    } catch { Toast.show({ type: "error", text1: "Ошибка сохранения" }); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
      <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827", marginBottom: 16 }}>Новый баннер</Text>
      {[
        { label: "Заголовок *", key: "title", placeholder: "Скидки до 50%" },
        { label: "Подзаголовок", key: "subtitle", placeholder: "На все категории" },
        { label: "Фон (hex)", key: "bg_color", placeholder: "#7C3AED" },
        { label: "Акцент (hex)", key: "accent_color", placeholder: "#C4B5FD" },
        { label: "Эмодзи", key: "emoji", placeholder: "📱" },
        { label: "Порядок сортировки", key: "sort_order", placeholder: "0", numeric: true },
      ].map(({ label, key, placeholder, numeric }: any) => (
        <View key={key} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: "500" }}>{label}</Text>
          <TextInput
            value={(form as any)[key]} onChangeText={(v) => set(key, v)}
            placeholder={placeholder} placeholderTextColor="#d1d5db"
            keyboardType={numeric ? "numeric" : "default"}
            style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", borderWidth: 1, borderColor: "#f3f4f6" }}
          />
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 14, paddingVertical: 13, alignItems: "center" }}>
          <Text style={{ fontWeight: "600", color: "#6b7280" }}>Отмена</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving} style={{ flex: 1, backgroundColor: P, borderRadius: 14, paddingVertical: 13, alignItems: "center" }}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontWeight: "700", color: "#fff" }}>Создать</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminTabScreen() {
  const [section, setSection] = useState<Section>("Обзор");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [apps, setApps] = useState<SellerApp[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [sRes, uRes, aRes, bRes, pRes] = await Promise.allSettled([
        api.get<Stats>("/admin/stats"),
        api.get<AppUser[]>("/admin/users"),
        api.get<SellerApp[]>("/seller-applications"),
        api.get<Banner[]>("/banners/all"),
        api.get<Payout[]>("/admin/payouts"),
      ]);
      if (sRes.status === "fulfilled") setStats(sRes.value.data);
      if (uRes.status === "fulfilled") setUsers(uRes.value.data);
      if (aRes.status === "fulfilled") setApps(aRes.value.data);
      if (bRes.status === "fulfilled") setBanners(bRes.value.data);
      if (pRes.status === "fulfilled") setPayouts(pRes.value.data);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadAll(); }, []);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  const reviewApp = async (id: number, action: "approve" | "reject") => {
    try {
      await api.patch(`/seller-applications/${id}`, { status: action === "approve" ? "approved" : "rejected" });
      setApps((prev) => prev.filter((a) => a.id !== id));
      Toast.show({ type: "success", text1: action === "approve" ? "Заявка одобрена" : "Отклонена" });
    } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
  };

  const toggleBanner = async (b: Banner) => {
    try {
      await api.patch(`/banners/${b.id}`, { is_active: !b.is_active });
      setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, is_active: !x.is_active } : x));
    } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
  };

  const deleteBanner = (id: number) => {
    Alert.alert("Удалить баннер?", "", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
        try {
          await api.delete(`/banners/${id}`);
          setBanners((prev) => prev.filter((b) => b.id !== id));
          Toast.show({ type: "success", text1: "Удалён" });
        } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
      }},
    ]);
  };

  const toggleUser = async (u: AppUser) => {
    try {
      await api.patch(`/admin/users/${u.id}/active`, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
      Toast.show({ type: "success", text1: u.is_active ? "Пользователь заблокирован" : "Разблокирован" });
    } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
  };

  const changeRole = (u: AppUser) => {
    const roles: Array<"buyer" | "seller" | "admin"> = ["buyer", "seller", "admin"];
    const options = roles.filter((r) => r !== u.role).map((r) => ({
      text: ROLE_LABELS[r], onPress: async () => {
        try {
          await api.patch(`/admin/users/${u.id}/role`, { role: r });
          setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: r } : x));
          Toast.show({ type: "success", text1: `Роль изменена на ${ROLE_LABELS[r]}` });
        } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
      }
    }));
    Alert.alert("Изменить роль", `${u.username || u.phone}`, [
      ...options,
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const reviewPayout = (p: Payout, status: "paid" | "cancelled") => {
    Alert.alert(status === "paid" ? "Подтвердить выплату?" : "Отклонить выплату?",
      `${p.amount.toLocaleString()} сом.`, [
        { text: "Отмена", style: "cancel" },
        { text: status === "paid" ? "Выплатить" : "Отклонить", style: status === "paid" ? "default" : "destructive",
          onPress: async () => {
            try {
              await api.patch(`/admin/payouts/${p.id}`, { status });
              setPayouts((prev) => prev.map((x) => x.id === p.id ? { ...x, status } : x));
              Toast.show({ type: "success", text1: status === "paid" ? "Выплата подтверждена" : "Выплата отклонена" });
            } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
          }
        },
      ]);
  };

  const pendingApps = apps.filter((a) => a.status === "pending");
  const pendingPayouts = payouts.filter((p) => p.status === "pending");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f3ff" }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} color={P} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Панель администратора</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingRight: 4 }}>
          {SECTIONS.map((s) => (
            <SectionTab key={s} label={s + (s === "Заявки" && pendingApps.length > 0 ? ` (${pendingApps.length})` : s === "Выплаты" && pendingPayouts.length > 0 ? ` (${pendingPayouts.length})` : "")} active={section === s} onPress={() => setSection(s)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={P} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P} />}
        >

          {/* ── ОБЗОР ── */}
          {section === "Обзор" && (
            <>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Пользователей" value={stats?.users ?? 0} icon={Users} color="#8B5CF6" />
                <StatCard label="Продавцов" value={stats?.sellers ?? 0} icon={Store} color="#16a34a" />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Товаров" value={stats?.products ?? 0} icon={Package} color="#f59e0b" />
                <StatCard label="Заказов" value={stats?.orders ?? 0} icon={ShoppingBag} color="#ef4444" />
              </View>

              {/* Быстрые действия */}
              <View style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" }}>
                {[
                  { label: "Статистика", sub: `Выручка: ${(stats?.revenue?.total ?? 0).toLocaleString()} с.`, icon: BarChart2, color: P, sec: "Статистика" as Section },
                  { label: "Пользователи", sub: `${stats?.users ?? 0} аккаунтов`, icon: Users, color: "#8B5CF6", sec: "Пользователи" as Section },
                  { label: "Заявки продавцов", sub: pendingApps.length > 0 ? `${pendingApps.length} ожидают` : "Новых нет", icon: UserCheck, color: "#f59e0b", sec: "Заявки" as Section },
                  { label: "Выплаты", sub: pendingPayouts.length > 0 ? `${pendingPayouts.length} ожидают` : "Новых нет", icon: Wallet, color: "#16a34a", sec: "Выплаты" as Section },
                  { label: "Баннеры", sub: `${banners.length} баннеров`, icon: TrendingUp, color: "#6366f1", sec: "Баннеры" as Section },
                ].map(({ label, sub, icon: Icon, color, sec }, i, arr) => (
                  <TouchableOpacity key={label} onPress={() => setSection(sec)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: "#f3f4f6" }}>
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: color + "15", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{label}</Text>
                      <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{sub}</Text>
                    </View>
                    <ChevronRight size={16} color="#d1d5db" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── СТАТИСТИКА ── */}
          {section === "Статистика" && (() => {
            const chart = stats?.chart_7d ?? [];
            const maxRev = Math.max(...chart.map((d) => d.revenue), 1);
            const ORDER_STATUS: Record<string, { label: string; color: string }> = {
              pending: { label: "Ожидает", color: "#f59e0b" },
              processing: { label: "В обработке", color: "#3b82f6" },
              shipped: { label: "Отправлен", color: "#8b5cf6" },
              delivered: { label: "Доставлен", color: "#16a34a" },
              cancelled: { label: "Отменён", color: "#ef4444" },
            };
            return (
              <>
                {/* Revenue cards */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: P, borderRadius: 16, padding: 16, gap: 4 }}>
                    <Text style={{ fontSize: 11, color: "#e9d5ff", fontWeight: "600" }}>Общая выручка</Text>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: "#fff" }}>{(stats?.revenue?.total ?? 0).toLocaleString()} с.</Text>
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: "#9ca3af", fontWeight: "600" }}>За 7 дней</Text>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>{(stats?.revenue?.last_7d ?? 0).toLocaleString()} с.</Text>
                    </View>
                    <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: "#9ca3af", fontWeight: "600" }}>За 30 дней</Text>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>{(stats?.revenue?.last_30d ?? 0).toLocaleString()} с.</Text>
                    </View>
                  </View>
                </View>

                {/* Bar chart */}
                {chart.length > 0 && (
                  <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 14 }}>Выручка за 7 дней</Text>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80 }}>
                      {chart.map((d, i) => (
                        <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                          <View style={{ flex: 1, width: "100%", justifyContent: "flex-end" }}>
                            <View style={{
                              width: "100%",
                              height: Math.max(4, (d.revenue / maxRev) * 68),
                              backgroundColor: i === chart.length - 1 ? P : "#e9d5ff",
                              borderRadius: 6,
                            }} />
                          </View>
                          <Text style={{ fontSize: 9, color: "#9ca3af", fontWeight: "500" }}>{d.date}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Stat cards row */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <StatCard label="Заказов (7д)" value={stats?.orders_7d ?? 0} icon={ShoppingBag} color="#3b82f6" />
                  <StatCard label="Новых юзеров (7д)" value={stats?.new_users_7d ?? 0} icon={Users} color="#16a34a" />
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <StatCard label="Рейтинг платф." value={stats?.avg_rating ?? 0} icon={Star} color="#f59e0b" />
                  <StatCard label="Отзывов" value={stats?.total_reviews ?? 0} icon={BarChart2} color="#8b5cf6" />
                </View>

                {/* Orders by status */}
                <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 4 }}>Заказы по статусам</Text>
                  {Object.entries(ORDER_STATUS).map(([key, { label, color }]) => {
                    const count = stats?.orders_by_status?.[key] ?? 0;
                    const total = stats?.orders ?? 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <View key={key} style={{ gap: 4 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 12, color: "#374151", fontWeight: "500" }}>{label}</Text>
                          <Text style={{ fontSize: 12, color, fontWeight: "700" }}>{count} ({pct}%)</Text>
                        </View>
                        <View style={{ height: 5, backgroundColor: "#f3f4f6", borderRadius: 4 }}>
                          <View style={{ height: 5, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Top sellers */}
                {(stats?.top_sellers?.length ?? 0) > 0 && (
                  <View style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" }}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>Топ продавцов</Text>
                    </View>
                    {stats!.top_sellers.map((s, i) => (
                      <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: "#f3f4f6" }}>
                        <Text style={{ fontSize: 16, fontWeight: "900", color: i === 0 ? "#f59e0b" : "#9ca3af", width: 20, textAlign: "center" }}>#{i + 1}</Text>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" }}>
                          <Store size={16} color={P} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }} numberOfLines={1}>{s.shop_name}</Text>
                          <Text style={{ fontSize: 11, color: "#9ca3af" }}>{s.products} товаров</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: P }}>{s.revenue.toLocaleString()} с.</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Top products */}
                {(stats?.top_products?.length ?? 0) > 0 && (
                  <View style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" }}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>Топ товаров</Text>
                    </View>
                    {stats!.top_products.map((p, i) => (
                      <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: "#f3f4f6" }}>
                        <Text style={{ fontSize: 16, fontWeight: "900", color: i === 0 ? "#f59e0b" : "#9ca3af", width: 20, textAlign: "center" }}>#{i + 1}</Text>
                        {p.image_url
                          ? <Image source={{ uri: p.image_url }} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="cover" />
                          : <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}><Package size={18} color="#d1d5db" /></View>
                        }
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }} numberOfLines={1}>{p.title}</Text>
                          <Text style={{ fontSize: 11, color: "#9ca3af" }}>{p.price.toLocaleString()} с. · склад: {p.stock}</Text>
                        </View>
                        <View style={{ backgroundColor: "#f5f3ff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: P }}>{p.sales_count} прод.</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            );
          })()}

          {/* ── ПОЛЬЗОВАТЕЛИ ── */}
          {section === "Пользователи" && (
            <>
              <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: "500" }}>{users.length} пользователей</Text>
              {users.map((u) => (
                <View key={u.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: (ROLE_COLORS[u.role] || P) + "18", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: ROLE_COLORS[u.role] || P }}>{(u.full_name || u.username || u.phone || "?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: u.is_active ? "#111827" : "#9ca3af" }} numberOfLines={1}>{u.full_name || u.username || u.phone}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: (ROLE_COLORS[u.role] || P) + "18", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: ROLE_COLORS[u.role] || P }}>{ROLE_LABELS[u.role] || u.role}</Text>
                      </View>
                      {!u.is_active && (
                        <View style={{ backgroundColor: "#fef2f2", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#ef4444" }}>Заблокирован</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity onPress={() => changeRole(u)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" }}>
                      <UserCheck size={16} color={P} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleUser(u)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: u.is_active ? "#fef2f2" : "#f0fdf4", alignItems: "center", justifyContent: "center" }}>
                      {u.is_active ? <UserX size={16} color="#ef4444" /> : <UserCheck size={16} color="#16a34a" />}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── ЗАЯВКИ ── */}
          {section === "Заявки" && (
            <>
              <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: "500" }}>{pendingApps.length} ожидают рассмотрения</Text>
              {apps.length === 0 ? (
                <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 40, alignItems: "center" }}>
                  <CheckCircle size={44} color="#e5e7eb" />
                  <Text style={{ color: "#9ca3af", marginTop: 12, fontWeight: "500" }}>Заявок нет</Text>
                </View>
              ) : apps.map((app) => (
                <View key={app.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>{app.shop_name}</Text>
                      <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{app.username}{app.phone ? ` · ${app.phone}` : ""}</Text>
                      {app.description && <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }} numberOfLines={3}>{app.description}</Text>}
                      <Text style={{ fontSize: 11, color: "#d1d5db", marginTop: 6 }}>{new Date(app.created_at).toLocaleDateString("ru-RU")}</Text>
                    </View>
                    <View style={{ backgroundColor: STATUS_COLORS[app.status] + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: STATUS_COLORS[app.status] }}>{STATUS_LABELS[app.status] || app.status}</Text>
                    </View>
                  </View>
                  {app.status === "pending" && (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity onPress={() => reviewApp(app.id, "approve")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f0fdf4", paddingVertical: 11, borderRadius: 12 }}>
                        <CheckCircle size={15} color="#16a34a" />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Одобрить</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => reviewApp(app.id, "reject")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fef2f2", paddingVertical: 11, borderRadius: 12 }}>
                        <XCircle size={15} color="#ef4444" />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#ef4444" }}>Отклонить</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* ── ВЫПЛАТЫ ── */}
          {section === "Выплаты" && (
            <>
              <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: "500" }}>{payouts.length} выплат</Text>
              {payouts.length === 0 ? (
                <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 40, alignItems: "center" }}>
                  <Wallet size={44} color="#e5e7eb" />
                  <Text style={{ color: "#9ca3af", marginTop: 12, fontWeight: "500" }}>Выплат нет</Text>
                </View>
              ) : payouts.map((p) => (
                <View key={p.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{p.amount.toLocaleString()} сом.</Text>
                      <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>ID продавца: {p.seller_id} · {new Date(p.created_at).toLocaleDateString("ru-RU")}</Text>
                      {p.comment && <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{p.comment}</Text>}
                    </View>
                    <View style={{ backgroundColor: (STATUS_COLORS[p.status] || "#9ca3af") + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: STATUS_COLORS[p.status] || "#9ca3af" }}>{STATUS_LABELS[p.status] || p.status}</Text>
                    </View>
                  </View>
                  {p.status === "pending" && (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity onPress={() => reviewPayout(p, "paid")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f0fdf4", paddingVertical: 11, borderRadius: 12 }}>
                        <CheckCircle size={15} color="#16a34a" />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Выплатить</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => reviewPayout(p, "cancelled")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fef2f2", paddingVertical: 11, borderRadius: 12 }}>
                        <XCircle size={15} color="#ef4444" />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#ef4444" }}>Отклонить</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* ── БАННЕРЫ ── */}
          {section === "Баннеры" && (
            <>
              <TouchableOpacity onPress={() => setShowBannerForm(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: P, borderRadius: 14, paddingVertical: 13 }}>
                <Plus size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Добавить баннер</Text>
              </TouchableOpacity>

              {banners.length === 0 ? (
                <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 40, alignItems: "center" }}>
                  <Text style={{ color: "#9ca3af", fontWeight: "500" }}>Баннеров нет</Text>
                </View>
              ) : banners.map((b) => (
                <View key={b.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: b.bg_color, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 24 }}>{b.emoji || "🖼️"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }} numberOfLines={1}>{b.title}</Text>
                    {b.subtitle && <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }} numberOfLines={1}>{b.subtitle}</Text>}
                    <Text style={{ fontSize: 11, marginTop: 3, color: b.is_active ? "#16a34a" : "#9ca3af", fontWeight: "500" }}>
                      {b.is_active ? "● Активен" : "○ Отключён"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity onPress={() => toggleBanner(b)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" }}>
                      {b.is_active ? <ToggleRight size={20} color={P} /> : <ToggleLeft size={20} color="#9ca3af" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteBanner(b.id)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Banner Form Modal */}
      <Modal visible={showBannerForm} transparent animationType="slide" onRequestClose={() => setShowBannerForm(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setShowBannerForm(false)} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <BannerForm onClose={() => setShowBannerForm(false)} onSave={() => { setShowBannerForm(false); loadAll(); }} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
