import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, RefreshControl, Alert, Dimensions,
} from "react-native";

const SW = Dimensions.get("window").width;
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Users, Package, ShoppingBag, TrendingUp, CheckCircle, XCircle,
  Plus, Trash2, ToggleLeft, ToggleRight, Shield, Wallet,
  ChevronRight, UserCheck, UserX, Store, RefreshCw, Star, BarChart2, X, ImagePlus,
} from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import api, { imgUrl } from "@/lib/api";
import Toast from "react-native-toast-message";

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

const COLOR_PRESETS = [
  { bg: "#7C3AED", accent: "#C4B5FD", label: "Фиолетовый" },
  { bg: "#DC2626", accent: "#FCA5A5", label: "Красный" },
  { bg: "#059669", accent: "#6EE7B7", label: "Зелёный" },
  { bg: "#2563EB", accent: "#93C5FD", label: "Синий" },
  { bg: "#D97706", accent: "#FCD34D", label: "Жёлтый" },
  { bg: "#DB2777", accent: "#F9A8D4", label: "Розовый" },
  { bg: "#0F172A", accent: "#94A3B8", label: "Тёмный" },
  { bg: "#0E7490", accent: "#67E8F9", label: "Бирюза" },
];
const EMOJI_PICKS = ["🔥", "💥", "🎉", "⚡", "🛒", "📦", "👗", "💎", "🏷️", "🎁", "📱", "👟"];

interface ApiCategory { id: number; name: string; slug: string; }

function BannerForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [emoji, setEmoji] = useState("🔥");
  const [preset, setPreset] = useState(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<"none" | "category">("none");
  const [linkSlug, setLinkSlug] = useState<string | null>(null);
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [saving, setSaving] = useState(false);

  const { bg, accent } = COLOR_PRESETS[preset];

  useEffect(() => {
    api.get<ApiCategory[]>("/products/categories").then((r) => setApiCategories(r.data)).catch(() => {});
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({ type: "error", text1: "Нет доступа к галерее" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [16, 6],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (!title.trim()) { Toast.show({ type: "error", text1: "Введите заголовок" }); return; }
    if (linkType === "category" && !linkSlug) { Toast.show({ type: "error", text1: "Выберите категорию" }); return; }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      if (subtitle.trim()) form.append("subtitle", subtitle.trim());
      form.append("bg_color", bg);
      form.append("accent_color", accent);
      form.append("emoji", emoji);
      form.append("sort_order", "0");
      if (linkType === "category" && linkSlug) form.append("link_url", `category:${linkSlug}`);
      if (imageUri) {
        const ext = imageUri.split(".").pop() || "jpg";
        form.append("image", { uri: imageUri, name: `banner.${ext}`, type: `image/${ext}` } as any);
      }
      await api.post("/banners", form, { headers: { "Content-Type": "multipart/form-data" } });
      Toast.show({ type: "success", text1: "Баннер создан" });
      onSave();
    } catch { Toast.show({ type: "error", text1: "Ошибка сохранения" }); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Новый баннер</Text>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
          <X size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Live preview */}
      <View style={{ height: 120, borderRadius: 18, backgroundColor: bg, overflow: "hidden", marginBottom: 20 }}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          : <>
              <View style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: accent, opacity: 0.25 }} />
              <View style={{ position: "absolute", right: 30, bottom: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: accent, opacity: 0.15 }} />
            </>
        }
        {/* Overlay text always shown */}
        <View style={{ position: "absolute", inset: 0, padding: 18, justifyContent: "flex-end" }}>
          {!imageUri && <Text style={{ fontSize: 28, marginBottom: 4 }}>{emoji}</Text>}
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#fff" }} numberOfLines={1}>{title || "Заголовок баннера"}</Text>
          {subtitle ? <Text style={{ fontSize: 12, color: imageUri ? "#fff" : accent, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>

      {/* Image picker */}
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 8 }}>ФОТО БАННЕРА (необязательно)</Text>
      <TouchableOpacity onPress={pickImage} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: imageUri ? "#f0fdf4" : "#f9fafb", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: imageUri ? "#86efac" : "#f3f4f6", marginBottom: 16 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: imageUri ? "#dcfce7" : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
          <ImagePlus size={20} color={imageUri ? "#16a34a" : "#9ca3af"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: imageUri ? "#16a34a" : "#374151" }}>
            {imageUri ? "Фото выбрано" : "Выбрать фото"}
          </Text>
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
            {imageUri ? "Нажмите чтобы заменить" : "Перекроет цвет и эмодзи"}
          </Text>
        </View>
        {imageUri && (
          <TouchableOpacity onPress={() => setImageUri(null)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}>
            <X size={13} color="#ef4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Text inputs */}
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 6 }}>ЗАГОЛОВОК *</Text>
      <TextInput
        value={title} onChangeText={setTitle}
        placeholder="Скидки до 50%"
        placeholderTextColor="#d1d5db"
        style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: "#111827", borderWidth: 1.5, borderColor: title ? P : "#f3f4f6", marginBottom: 12 }}
      />

      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 6 }}>ПОДЗАГОЛОВОК</Text>
      <TextInput
        value={subtitle} onChangeText={setSubtitle}
        placeholder="На все категории"
        placeholderTextColor="#d1d5db"
        style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111827", borderWidth: 1.5, borderColor: "#f3f4f6", marginBottom: 16 }}
      />

      {/* Emoji picker — hidden when image is set */}
      {!imageUri && (
        <>
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 8 }}>ЭМОДЗИ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {EMOJI_PICKS.map((e) => (
                <TouchableOpacity key={e} onPress={() => setEmoji(e)}
                  style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: emoji === e ? bg : "#f3f4f6", alignItems: "center", justifyContent: "center", borderWidth: emoji === e ? 2 : 0, borderColor: bg }}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Color presets */}
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 8 }}>ЦВЕТ БАННЕРА</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {COLOR_PRESETS.map((c, i) => (
          <TouchableOpacity key={i} onPress={() => setPreset(i)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: preset === i ? c.bg : "#f3f4f6", borderWidth: preset === i ? 0 : 1, borderColor: "#e5e7eb" }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: preset === i ? c.accent : c.bg }} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: preset === i ? "#fff" : "#374151" }}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Link destination */}
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 8 }}>КУДА ВЕДЁТ БАННЕР</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => { setLinkType("none"); setLinkSlug(null); }}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: linkType === "none" ? "#f3f4f6" : "#fff", borderWidth: 1.5, borderColor: linkType === "none" ? "#6b7280" : "#e5e7eb", alignItems: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: linkType === "none" ? "#374151" : "#9ca3af" }}>Никуда</Text>
          <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>только показ</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLinkType("category")}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: linkType === "category" ? "#f5f3ff" : "#fff", borderWidth: 1.5, borderColor: linkType === "category" ? P : "#e5e7eb", alignItems: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: linkType === "category" ? P : "#9ca3af" }}>Категория</Text>
          <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>открыть раздел</Text>
        </TouchableOpacity>
      </View>

      {linkType === "category" && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>Выберите категорию:</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {apiCategories.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setLinkSlug(c.slug)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: linkSlug === c.slug ? P : "#f3f4f6", borderWidth: linkSlug === c.slug ? 0 : 1, borderColor: "#e5e7eb" }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: linkSlug === c.slug ? "#fff" : "#374151" }}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {linkSlug && (
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10 }}>
              <CheckCircle size={14} color="#16a34a" />
              <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "600" }}>
                Выбрано: {apiCategories.find(c => c.slug === linkSlug)?.name}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Buttons */}
      <TouchableOpacity onPress={save} disabled={saving}
        style={{ backgroundColor: P, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>Создать баннер</Text>}
      </TouchableOpacity>
    </ScrollView>
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
              {/* Preview carousel */}
              {banners.filter(b => b.is_active).length > 0 && (
                <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 14, gap: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>Предпросмотр — как видит покупатель</Text>
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: 14, overflow: "hidden" }}>
                    {banners.filter(b => b.is_active).map((b) => (
                      <View key={b.id} style={{ width: SW - 60, borderRadius: 14, overflow: "hidden", backgroundColor: b.bg_color, marginRight: 8 }}>
                        {b.image_url ? (
                          <View style={{ height: 120 }}>
                            <Image source={{ uri: imgUrl(b.image_url) ?? "" }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                            <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", padding: 14, justifyContent: "flex-end" }}>
                              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }} numberOfLines={1}>{b.title}</Text>
                              {b.subtitle ? <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }} numberOfLines={1}>{b.subtitle}</Text> : null}
                            </View>
                          </View>
                        ) : (
                          <View style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: b.accent_color, fontSize: 10, fontWeight: "600", marginBottom: 3 }}>AZA MARKET</Text>
                              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }} numberOfLines={1}>{b.title}</Text>
                              {b.subtitle ? <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 }} numberOfLines={1}>{b.subtitle}</Text> : null}
                              <View style={{ marginTop: 10, backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" }}>
                                <Text style={{ color: b.bg_color, fontWeight: "700", fontSize: 10 }}>Смотреть →</Text>
                              </View>
                            </View>
                            {b.emoji ? <Text style={{ fontSize: 44, marginLeft: 8 }}>{b.emoji}</Text> : null}
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                  {banners.filter(b => b.is_active).length > 1 && (
                    <Text style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>← листайте →</Text>
                  )}
                </View>
              )}

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
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: b.bg_color, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {b.image_url
                      ? <Image source={{ uri: imgUrl(b.image_url) ?? "" }} style={{ width: 48, height: 48 }} contentFit="cover" />
                      : <Text style={{ fontSize: 24 }}>{b.emoji || "🖼️"}</Text>
                    }
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
