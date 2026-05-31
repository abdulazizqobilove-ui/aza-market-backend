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
  ChevronRight, UserCheck, UserX, Store, RefreshCw, Star, BarChart2, X, ImagePlus, Pencil,
  AlertTriangle, Eye, EyeOff, Tag, Flag, MessageSquare,
} from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import api, { imgUrl, API_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useThemeColors } from "@/lib/theme";

const P = "#2563EB";
const SECTIONS = ["Обзор", "Статистика", "Пользователи", "Заявки", "Выплаты", "Баннеры", "Товары", "Жалобы", "Обращения", "Категории"] as const;
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
interface Banner { id: number; title: string; subtitle?: string; bg_color: string; accent_color: string; emoji?: string; is_active: boolean; sort_order: number; image_url?: string | null; link_url?: string | null; }
interface Payout { id: number; seller_id: number; amount: number; status: string; comment?: string; created_at: string; }
interface AdminProduct { id: number; title: string; price: number; stock: number; is_active: boolean; seller_id: number; }
interface Report { id: number; type: string; target_id: number; reason: string; comment?: string; status: string; reporter_id: number; created_at: string; }
interface AdminCategory { id: number; name: string; slug: string; parent_id: number | null; }
interface FeedbackItem { id: number; type: string; title: string; message: string; status: string; admin_reply?: string | null; created_at: string; seller_name?: string; seller_phone?: string; seller_shop?: string; }

const ROLE_LABELS: Record<string, string> = { buyer: "Покупатель", seller: "Продавец", admin: "Админ" };
const ROLE_COLORS: Record<string, string> = { buyer: "#3b82f6", seller: "#16a34a", admin: "#1D4ED8" };
const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", approved: "#16a34a", rejected: "#ef4444", paid: "#16a34a", cancelled: "#ef4444" };
const STATUS_LABELS: Record<string, string> = { pending: "Ожидает", approved: "Одобрено", rejected: "Отклонено", paid: "Выплачено", cancelled: "Отменено" };

function SectionTab({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  const c = useThemeColors();
  return (
    <TouchableOpacity onPress={onPress} style={{
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: active ? P : c.iconBg, marginRight: 8,
    }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : c.textSub }}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const c = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 16, padding: 14, gap: 8 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + "18", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "900", color: c.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "500" }}>{label}</Text>
    </View>
  );
}

const COLOR_PRESETS = [
  { bg: "#1D4ED8", accent: "#93C5FD", label: "Фиолетовый" },
  { bg: "#DC2626", accent: "#FCA5A5", label: "Красный" },
  { bg: "#059669", accent: "#6EE7B7", label: "Зелёный" },
  { bg: "#2563EB", accent: "#93C5FD", label: "Синий" },
  { bg: "#D97706", accent: "#FCD34D", label: "Жёлтый" },
  { bg: "#DB2777", accent: "#F9A8D4", label: "Розовый" },
  { bg: "#0F172A", accent: "#94A3B8", label: "Тёмный" },
  { bg: "#0E7490", accent: "#67E8F9", label: "Бирюза" },
];
const EMOJI_PICKS = ["🔥", "💥", "🎉", "⚡", "🛒", "📦", "👗", "💎", "🏷️", "🎁", "📱", "👟"];

interface ApiCategory { id: number; name: string; slug: string; parent_id?: number | null; }

type LinkType = "none" | "category" | "url";

function parseLinkUrl(link?: string | null): { type: LinkType; slug: string | null; url: string } {
  if (!link) return { type: "none", slug: null, url: "" };
  if (link.startsWith("category:")) return { type: "category", slug: link.replace("category:", ""), url: "" };
  return { type: "url", slug: null, url: link };
}

function buildLinkUrl(type: LinkType, slug: string | null, url: string): string | null {
  if (type === "category" && slug) return `category:${slug}`;
  if (type === "url" && url.trim()) return url.trim();
  return null;
}

function BannerForm({
  onSave, onClose, existing, initialLinkUrl,
}: {
  onSave: () => void;
  onClose: () => void;
  existing?: Banner | null;
  initialLinkUrl?: string | null;
}) {
  const parsed = parseLinkUrl(existing?.link_url ?? initialLinkUrl);
  const initPreset = existing
    ? Math.max(0, COLOR_PRESETS.findIndex(c => c.bg === existing.bg_color))
    : 0;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "🔥");
  const [preset, setPreset] = useState(initPreset < 0 ? 0 : initPreset);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<LinkType>(parsed.type);
  const [linkSlug, setLinkSlug] = useState<string | null>(parsed.slug);
  const [linkUrl, setLinkUrl] = useState(parsed.url);
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const isEdit = !!existing;

  const { bg, accent } = COLOR_PRESETS[preset];

  useEffect(() => {
    api.get<ApiCategory[]>("/products/categories").then((r) => setApiCategories(r.data)).catch(() => {});
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Toast.show({ type: "error", text1: "Нет доступа к галерее" }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85,
      allowsEditing: true, aspect: [16, 6],
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const save = async () => {
    if (linkType === "category" && !linkSlug) { Toast.show({ type: "error", text1: "Выберите категорию" }); return; }
    if (linkType === "url" && !linkUrl.trim()) { Toast.show({ type: "error", text1: "Введите ссылку" }); return; }
    setSaving(true);
    try {
      const finalLink = buildLinkUrl(linkType, linkSlug, linkUrl);

      const token = await AsyncStorage.getItem("buyer:token");

      const xhrRequest = (method: string, url: string, body: FormData) =>
        new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(method, url);
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
            } else {
              try { reject(new Error(JSON.parse(xhr.responseText)?.detail || `HTTP ${xhr.status}`)); }
              catch { reject(new Error(`HTTP ${xhr.status}`)); }
            }
          };
          xhr.onerror = () => reject(new Error("Сетевая ошибка"));
          xhr.send(body);
        });

      if (isEdit && existing) {
        const form = new FormData();
        form.append("title", title.trim() || " ");
        if (subtitle.trim()) form.append("subtitle", subtitle.trim());
        form.append("bg_color", COLOR_PRESETS[preset].bg);
        form.append("accent_color", COLOR_PRESETS[preset].accent);
        if (emoji) form.append("emoji", emoji);
        if (finalLink) form.append("link_url", finalLink);
        if (imageUri) form.append("image", { uri: imageUri, name: "banner.jpg", type: "image/jpeg" } as any);
        await xhrRequest("PATCH", `${API_URL}/api/banners/${existing.id}`, form);
        Toast.show({ type: "success", text1: "Баннер обновлён" });
      } else {
        const form = new FormData();
        form.append("title", title.trim() || " ");
        if (subtitle.trim()) form.append("subtitle", subtitle.trim());
        form.append("bg_color", COLOR_PRESETS[preset].bg);
        form.append("accent_color", COLOR_PRESETS[preset].accent);
        if (emoji) form.append("emoji", emoji);
        if (finalLink) form.append("link_url", finalLink);
        form.append("sort_order", "0");
        if (imageUri) form.append("image", { uri: imageUri, name: "banner.jpg", type: "image/jpeg" } as any);
        await xhrRequest("POST", `${API_URL}/api/banners`, form);
        Toast.show({ type: "success", text1: "Баннер создан" });
      }
      onSave();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Неизвестная ошибка";
      Toast.show({ type: "error", text1: "Ошибка сохранения", text2: String(msg), visibilityTime: 6000 });
    }
    finally { setSaving(false); }
  };

  const previewBg = COLOR_PRESETS[preset].bg;
  const previewAccent = COLOR_PRESETS[preset].accent;
  const previewImg = imageUri ?? (existing?.image_url ? imgUrl(existing.image_url) : null);

  return (
    <ScrollView style={{ backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>{isEdit ? "Редактировать баннер" : "Новый баннер"}</Text>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
          <X size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Live preview — точные размеры как у реального баннера */}
      <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Превью (как будет выглядеть)</Text>
      <View style={{ height: 250, borderRadius: 18, backgroundColor: previewBg, overflow: "hidden", marginBottom: 20 }}>
        {previewImg
          ? <Image source={{ uri: previewImg }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          : <>
              <View style={{ position: "absolute", right: -20, top: -20, width: 200, height: 200, borderRadius: 100, backgroundColor: previewAccent, opacity: 0.25 }} />
              <View style={{ position: "absolute", right: 30, bottom: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: previewAccent, opacity: 0.15 }} />
            </>
        }
        <View style={{ position: "absolute", inset: 0, backgroundColor: previewImg ? "rgba(0,0,0,0.38)" : "transparent", padding: 20, justifyContent: "flex-end" }}>
          {!previewImg && <Text style={{ fontSize: 32, marginBottom: 6 }}>{emoji}</Text>}
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#fff" }} numberOfLines={2}>{title || "Заголовок баннера"}</Text>
          {subtitle ? <Text style={{ fontSize: 13, color: "#ffffffcc", marginTop: 4 }} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>

      {/* Image picker */}
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 8 }}>ФОТО БАННЕРА</Text>
      <TouchableOpacity onPress={pickImage} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: imageUri ? "#f0fdf4" : "#f9fafb", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: imageUri ? "#86efac" : "#f3f4f6", marginBottom: 16 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: imageUri ? "#dcfce7" : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
          <ImagePlus size={20} color={imageUri ? "#16a34a" : "#9ca3af"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: imageUri ? "#16a34a" : "#374151" }}>{imageUri ? "Новое фото выбрано" : (existing?.image_url ? "Заменить фото" : "Выбрать фото")}</Text>
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{imageUri ? "Нажмите чтобы заменить" : "Перекроет цвет и эмодзи"}</Text>
        </View>
        {imageUri && <TouchableOpacity onPress={() => setImageUri(null)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}><X size={13} color="#ef4444" /></TouchableOpacity>}
      </TouchableOpacity>

      {/* Text */}
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 6 }}>ЗАГОЛОВОК</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Скидки до 50%" placeholderTextColor="#d1d5db"
        style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: "#111827", borderWidth: 1.5, borderColor: title ? P : "#f3f4f6", marginBottom: 12 }} />

      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 6 }}>ПОДЗАГОЛОВОК</Text>
      <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="На все категории" placeholderTextColor="#d1d5db"
        style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111827", borderWidth: 1.5, borderColor: "#f3f4f6", marginBottom: 16 }} />

      {/* Emoji */}
      {!previewImg && (
        <>
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 8 }}>ЭМОДЗИ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {EMOJI_PICKS.map((e) => (
                <TouchableOpacity key={e} onPress={() => setEmoji(e)}
                  style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: emoji === e ? previewBg : "#f3f4f6", alignItems: "center", justifyContent: "center", borderWidth: emoji === e ? 2 : 0, borderColor: previewBg }}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Color */}
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

      {/* Link */}
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 8 }}>КУДА ВЕДЁТ БАННЕР</Text>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
        {([["none","Никуда","только показ"],["category","Категория","раздел каталога"],["url","Ссылка","внешний сайт"]] as [LinkType,string,string][]).map(([type, label, sub]) => (
          <TouchableOpacity key={type} onPress={() => { setLinkType(type); if (type !== "category") setLinkSlug(null); if (type !== "url") setLinkUrl(""); }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: linkType === type ? (type === "none" ? "#f3f4f6" : "#EFF6FF") : "#fff", borderWidth: 1.5, borderColor: linkType === type ? (type === "none" ? "#6b7280" : P) : "#e5e7eb", alignItems: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: linkType === type ? (type === "none" ? "#374151" : P) : "#9ca3af" }}>{label}</Text>
            <Text style={{ fontSize: 9, color: "#9ca3af", marginTop: 1 }}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {linkType === "category" && (
        <View style={{ marginBottom: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
            {apiCategories.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setLinkSlug(c.slug)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: linkSlug === c.slug ? P : "#f3f4f6", borderWidth: linkSlug === c.slug ? 0 : 1, borderColor: "#e5e7eb" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: linkSlug === c.slug ? "#fff" : "#374151" }}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {linkSlug && (
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10 }}>
              <CheckCircle size={14} color="#16a34a" />
              <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "600" }}>Выбрано: {apiCategories.find(c => c.slug === linkSlug)?.name}</Text>
            </View>
          )}
        </View>
      )}

      {linkType === "url" && (
        <View style={{ marginBottom: 20 }}>
          <TextInput value={linkUrl} onChangeText={setLinkUrl} placeholder="https://example.com" placeholderTextColor="#d1d5db" autoCapitalize="none" keyboardType="url"
            style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111827", borderWidth: 1.5, borderColor: linkUrl ? P : "#f3f4f6" }} />
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>Вставьте полный URL (например https://t.me/yourshop)</Text>
        </View>
      )}

      <TouchableOpacity onPress={save} disabled={saving} style={{ backgroundColor: P, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>{isEdit ? "Сохранить изменения" : "Создать баннер"}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function AdminTabScreen() {
  const c = useThemeColors();
  const [section, setSection] = useState<Section>("Обзор");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [apps, setApps] = useState<SellerApp[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [catSlots, setCatSlots] = useState<ApiCategory[]>([]);
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<"all"|"new"|"replied">("all");
  const [replyModal, setReplyModal] = useState<{ visible: boolean; item: FeedbackItem | null }>({ visible: false, item: null });
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [adminCats, setAdminCats] = useState<AdminCategory[]>([]);
  const [catForm, setCatForm] = useState<{ visible: boolean; id?: number; name: string; slug: string; parent_id: string }>({ visible: false, name: "", slug: "", parent_id: "" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerFormState, setBannerFormState] = useState<{ visible: boolean; existing: Banner | null; initialLinkUrl?: string | null }>({ visible: false, existing: null });

  const loadAll = useCallback(async () => {
    try {
      const [sRes, uRes, aRes, bRes, pRes, cRes, apRes, rpRes, acRes] = await Promise.allSettled([
        api.get<Stats>("/admin/stats"),
        api.get<AppUser[]>("/admin/users"),
        api.get<SellerApp[]>("/seller-applications"),
        api.get<Banner[]>("/banners/all"),
        api.get<Payout[]>("/admin/payouts"),
        api.get<ApiCategory[]>("/products/categories"),
        api.get<AdminProduct[]>("/admin/products"),
        api.get<Report[]>("/admin/reports"),
        api.get<AdminCategory[]>("/admin/categories"),
      ]);
      if (sRes.status === "fulfilled") setStats(sRes.value.data);
      if (uRes.status === "fulfilled") setUsers(uRes.value.data);
      if (aRes.status === "fulfilled") setApps(aRes.value.data);
      if (bRes.status === "fulfilled") setBanners(bRes.value.data);
      if (pRes.status === "fulfilled") setPayouts(pRes.value.data);
      if (apRes.status === "fulfilled") setAdminProducts(apRes.value.data);
      if (rpRes.status === "fulfilled") setReports(rpRes.value.data);
      if (acRes.status === "fulfilled") setAdminCats(acRes.value.data);
      try { const fbR = await api.get<FeedbackItem[]>("/feedback/admin/all"); setFeedbackItems(fbR.data); } catch {}
      if (cRes.status === "fulfilled") {
        const roots = cRes.value.data;
        const subResults = await Promise.allSettled(
          roots.map(r => api.get<ApiCategory[]>(`/products/categories/${r.id}/subcategories`))
        );
        const allCats: ApiCategory[] = [];
        roots.forEach((root, i) => {
          allCats.push(root);
          const sub = subResults[i];
          if (sub.status === "fulfilled") allCats.push(...sub.value.data);
        });
        setCatSlots(allCats);
      }
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

  const [prodSearch, setProdSearch] = useState("");
  const [reportFilter, setReportFilter] = useState<"all" | "pending">("pending");
  const [catSaving, setCatSaving] = useState(false);

  const toggleProduct = async (p: AdminProduct) => {
    try {
      await api.patch(`/admin/products/${p.id}/active`, { is_active: !p.is_active });
      setAdminProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
      Toast.show({ type: "success", text1: p.is_active ? "Товар скрыт" : "Товар показан" });
    } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
  };

  const reviewReport = (id: number, status: "resolved" | "dismissed") => {
    Alert.alert(
      status === "resolved" ? "Решить жалобу?" : "Отклонить жалобу?", "",
      [
        { text: "Отмена", style: "cancel" },
        { text: status === "resolved" ? "Решить" : "Отклонить", style: status === "dismissed" ? "destructive" : "default",
          onPress: async () => {
            try {
              await api.patch(`/admin/reports/${id}`, { status });
              setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
              Toast.show({ type: "success", text1: status === "resolved" ? "Решено" : "Отклонено" });
            } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
          },
        },
      ]
    );
  };

  const saveCat = async () => {
    if (!catForm.name.trim() || !catForm.slug.trim()) {
      Toast.show({ type: "error", text1: "Заполните название и slug" }); return;
    }
    setCatSaving(true);
    try {
      if (catForm.id) {
        await api.patch(`/admin/categories/${catForm.id}`, { name: catForm.name.trim(), slug: catForm.slug.trim() });
        setAdminCats((prev) => prev.map((c) => c.id === catForm.id ? { ...c, name: catForm.name.trim(), slug: catForm.slug.trim() } : c));
        Toast.show({ type: "success", text1: "Категория обновлена" });
      } else {
        const res = await api.post<AdminCategory>("/admin/categories", {
          name: catForm.name.trim(), slug: catForm.slug.trim(),
          parent_id: catForm.parent_id ? Number(catForm.parent_id) : null,
        });
        setAdminCats((prev) => [...prev, res.data]);
        Toast.show({ type: "success", text1: "Категория создана" });
      }
      setCatForm({ visible: false, name: "", slug: "", parent_id: "" });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Ошибка" });
    } finally { setCatSaving(false); }
  };

  const deleteCat = (id: number, name: string) => {
    Alert.alert("Удалить категорию?", name, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
        try {
          await api.delete(`/admin/categories/${id}`);
          setAdminCats((prev) => prev.filter((c) => c.id !== id));
          Toast.show({ type: "success", text1: "Удалено" });
        } catch (e: any) {
          Toast.show({ type: "error", text1: e?.response?.data?.detail || "Ошибка" });
        }
      }},
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} color={P} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Панель администратора</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={16} color={c.textSub} />
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
                <StatCard label="Пользователей" value={stats?.users ?? 0} icon={Users} color="#2563EB" />
                <StatCard label="Продавцов" value={stats?.sellers ?? 0} icon={Store} color="#16a34a" />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Товаров" value={stats?.products ?? 0} icon={Package} color="#f59e0b" />
                <StatCard label="Заказов" value={stats?.orders ?? 0} icon={ShoppingBag} color="#ef4444" />
              </View>

              {/* Быстрые действия */}
              <View style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}>
                {[
                  { label: "Статистика", sub: `Выручка: ${(stats?.revenue?.total ?? 0).toLocaleString()} с.`, icon: BarChart2, color: P, sec: "Статистика" as Section },
                  { label: "Пользователи", sub: `${stats?.users ?? 0} аккаунтов`, icon: Users, color: "#2563EB", sec: "Пользователи" as Section },
                  { label: "Заявки продавцов", sub: pendingApps.length > 0 ? `${pendingApps.length} ожидают` : "Новых нет", icon: UserCheck, color: "#f59e0b", sec: "Заявки" as Section },
                  { label: "Выплаты", sub: pendingPayouts.length > 0 ? `${pendingPayouts.length} ожидают` : "Новых нет", icon: Wallet, color: "#16a34a", sec: "Выплаты" as Section },
                  { label: "Баннеры", sub: `${banners.length} баннеров`, icon: TrendingUp, color: "#3B82F6", sec: "Баннеры" as Section },
                ].map(({ label, sub, icon: Icon, color, sec }, i, arr) => (
                  <TouchableOpacity key={label} onPress={() => setSection(sec)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: c.border }}>
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: color + "15", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }}>{label}</Text>
                      <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>{sub}</Text>
                    </View>
                    <ChevronRight size={16} color={c.textMuted} />
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
              shipped: { label: "Отправлен", color: "#2563EB" },
              delivered: { label: "Доставлен", color: "#16a34a" },
              cancelled: { label: "Отменён", color: "#ef4444" },
            };
            return (
              <>
                {/* Revenue cards */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: P, borderRadius: 16, padding: 16, gap: 4 }}>
                    <Text style={{ fontSize: 11, color: "#BFDBFE", fontWeight: "600" }}>Общая выручка</Text>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: "#fff" }}>{(stats?.revenue?.total ?? 0).toLocaleString()} с.</Text>
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ backgroundColor: c.card, borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: "600" }}>За 7 дней</Text>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>{(stats?.revenue?.last_7d ?? 0).toLocaleString()} с.</Text>
                    </View>
                    <View style={{ backgroundColor: c.card, borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 10, color: c.textMuted, fontWeight: "600" }}>За 30 дней</Text>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>{(stats?.revenue?.last_30d ?? 0).toLocaleString()} с.</Text>
                    </View>
                  </View>
                </View>

                {/* Bar chart */}
                {chart.length > 0 && (
                  <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: c.text, marginBottom: 14 }}>Выручка за 7 дней</Text>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80 }}>
                      {chart.map((d, i) => (
                        <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                          <View style={{ flex: 1, width: "100%", justifyContent: "flex-end" }}>
                            <View style={{
                              width: "100%",
                              height: Math.max(4, (d.revenue / maxRev) * 68),
                              backgroundColor: i === chart.length - 1 ? P : "#BFDBFE",
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
                  <StatCard label="Отзывов" value={stats?.total_reviews ?? 0} icon={BarChart2} color="#2563EB" />
                </View>

                {/* Orders by status */}
                <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: c.text, marginBottom: 4 }}>Заказы по статусам</Text>
                  {Object.entries(ORDER_STATUS).map(([key, { label, color }]) => {
                    const count = stats?.orders_by_status?.[key] ?? 0;
                    const total = stats?.orders ?? 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <View key={key} style={{ gap: 4 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "500" }}>{label}</Text>
                          <Text style={{ fontSize: 12, color, fontWeight: "700" }}>{count} ({pct}%)</Text>
                        </View>
                        <View style={{ height: 5, backgroundColor: c.border, borderRadius: 4 }}>
                          <View style={{ height: 5, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Top sellers */}
                {(stats?.top_sellers?.length ?? 0) > 0 && (
                  <View style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }}>Топ продавцов</Text>
                    </View>
                    {stats!.top_sellers.map((s, i) => (
                      <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: c.border }}>
                        <Text style={{ fontSize: 16, fontWeight: "900", color: i === 0 ? "#f59e0b" : c.textMuted, width: 20, textAlign: "center" }}>#{i + 1}</Text>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                          <Store size={16} color={P} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }} numberOfLines={1}>{s.shop_name}</Text>
                          <Text style={{ fontSize: 11, color: c.textMuted }}>{s.products} товаров</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: P }}>{s.revenue.toLocaleString()} с.</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Top products */}
                {(stats?.top_products?.length ?? 0) > 0 && (
                  <View style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }}>Топ товаров</Text>
                    </View>
                    {stats!.top_products.map((p, i) => (
                      <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: c.border }}>
                        <Text style={{ fontSize: 16, fontWeight: "900", color: i === 0 ? "#f59e0b" : c.textMuted, width: 20, textAlign: "center" }}>#{i + 1}</Text>
                        {p.image_url
                          ? <Image source={{ uri: p.image_url }} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="cover" />
                          : <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}><Package size={18} color={c.textMuted} /></View>
                        }
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }} numberOfLines={1}>{p.title}</Text>
                          <Text style={{ fontSize: 11, color: c.textMuted }}>{p.price.toLocaleString()} с. · склад: {p.stock}</Text>
                        </View>
                        <View style={{ backgroundColor: c.iconBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
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
              <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "500" }}>{users.length} пользователей</Text>
              {users.map((u) => (
                <View key={u.id} style={{ backgroundColor: c.card, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: (ROLE_COLORS[u.role] || P) + "18", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: ROLE_COLORS[u.role] || P }}>{(u.full_name || u.username || u.phone || "?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: u.is_active ? c.text : c.textMuted }} numberOfLines={1}>{u.full_name || u.username || u.phone}</Text>
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
                    <TouchableOpacity onPress={() => changeRole(u)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }}>
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
              <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "500" }}>{pendingApps.length} ожидают рассмотрения</Text>
              {apps.length === 0 ? (
                <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 40, alignItems: "center" }}>
                  <CheckCircle size={44} color={c.border} />
                  <Text style={{ color: c.textMuted, marginTop: 12, fontWeight: "500" }}>Заявок нет</Text>
                </View>
              ) : apps.map((app) => (
                <View key={app.id} style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>{app.shop_name}</Text>
                      <Text style={{ fontSize: 12, color: c.textSub, marginTop: 2 }}>{app.username}{app.phone ? ` · ${app.phone}` : ""}</Text>
                      {app.description && <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }} numberOfLines={3}>{app.description}</Text>}
                      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 6 }}>{new Date(app.created_at).toLocaleDateString("ru-RU")}</Text>
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
              <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "500" }}>{payouts.length} выплат</Text>
              {payouts.length === 0 ? (
                <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 40, alignItems: "center" }}>
                  <Wallet size={44} color={c.border} />
                  <Text style={{ color: c.textMuted, marginTop: 12, fontWeight: "500" }}>Выплат нет</Text>
                </View>
              ) : payouts.map((p) => (
                <View key={p.id} style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: c.text }}>{p.amount.toLocaleString()} сом.</Text>
                      <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>ID продавца: {p.seller_id} · {new Date(p.created_at).toLocaleDateString("ru-RU")}</Text>
                      {p.comment && <Text style={{ fontSize: 12, color: c.textSub, marginTop: 4 }}>{p.comment}</Text>}
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

          {/* ── ТОВАРЫ ── */}
          {section === "Товары" && (
            <>
              <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "500" }}>{adminProducts.length} товаров</Text>
              <TextInput
                value={prodSearch} onChangeText={setProdSearch}
                placeholder="Поиск товара..." placeholderTextColor={c.textMuted}
                style={{ backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: c.border }}
              />
              {adminProducts
                .filter((p) => !prodSearch || p.title.toLowerCase().includes(prodSearch.toLowerCase()))
                .map((p) => (
                  <View key={p.id} style={{ backgroundColor: c.card, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: p.is_active ? c.iconBg : c.iconBg, alignItems: "center", justifyContent: "center" }}>
                      <Package size={18} color={p.is_active ? P : c.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: p.is_active ? c.text : c.textMuted }} numberOfLines={1}>{p.title}</Text>
                      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{p.price.toLocaleString()} с. · склад: {p.stock} · ID: {p.id}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleProduct(p)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: p.is_active ? "#fef2f2" : "#f0fdf4", alignItems: "center", justifyContent: "center" }}>
                      {p.is_active ? <EyeOff size={16} color="#ef4444" /> : <Eye size={16} color="#16a34a" />}
                    </TouchableOpacity>
                  </View>
                ))}
            </>
          )}

          {/* ── ЖАЛОБЫ ── */}
          {section === "Жалобы" && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["pending", "all"] as const).map((f) => (
                  <TouchableOpacity key={f} onPress={() => setReportFilter(f)}
                    style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: reportFilter === f ? P : c.iconBg }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: reportFilter === f ? "#fff" : c.textSub }}>{f === "pending" ? "Ожидают" : "Все"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "500" }}>
                {reports.filter(r => reportFilter === "all" || r.status === "pending").length} жалоб
              </Text>
              {reports.filter(r => reportFilter === "all" || r.status === "pending").length === 0 ? (
                <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 40, alignItems: "center" }}>
                  <Flag size={44} color={c.border} />
                  <Text style={{ color: c.textMuted, marginTop: 12, fontWeight: "500" }}>Жалоб нет</Text>
                </View>
              ) : reports.filter(r => reportFilter === "all" || r.status === "pending").map((r) => (
                <View key={r.id} style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <View style={{ backgroundColor: r.type === "product" ? "#eff6ff" : "#fef2f2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: r.type === "product" ? "#2563eb" : "#ef4444" }}>
                            {r.type === "product" ? "Товар" : "Пользователь"} #{r.target_id}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }}>{r.reason}</Text>
                      {r.comment && <Text style={{ fontSize: 12, color: c.textSub, marginTop: 3 }}>{r.comment}</Text>}
                      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>
                        От пользователя #{r.reporter_id} · {new Date(r.created_at).toLocaleDateString("ru-RU")}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: (r.status === "pending" ? "#f59e0b" : r.status === "resolved" ? "#16a34a" : "#9ca3af") + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: r.status === "pending" ? "#f59e0b" : r.status === "resolved" ? "#16a34a" : "#9ca3af" }}>
                        {r.status === "pending" ? "Ожидает" : r.status === "resolved" ? "Решено" : "Отклонено"}
                      </Text>
                    </View>
                  </View>
                  {r.status === "pending" && (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity onPress={() => reviewReport(r.id, "resolved")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f0fdf4", paddingVertical: 10, borderRadius: 12 }}>
                        <CheckCircle size={14} color="#16a34a" />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Решить</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => reviewReport(r.id, "dismissed")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f9fafb", paddingVertical: 10, borderRadius: 12 }}>
                        <XCircle size={14} color="#9ca3af" />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#9ca3af" }}>Отклонить</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* ── ОБРАЩЕНИЯ СЕЛЛЕРОВ ── */}
          {section === "Обращения" && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["all", "new", "replied"] as const).map(f => (
                  <TouchableOpacity key={f} onPress={() => setFeedbackFilter(f)}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: feedbackFilter === f ? P : c.iconBg }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: feedbackFilter === f ? "#fff" : c.textSub }}>
                      {f === "all" ? "Все" : f === "new" ? "Новые" : "Отвечено"}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={{ flex: 1 }} />
                <View style={{ backgroundColor: feedbackItems.filter(f => f.status === "new").length > 0 ? "#ef4444" : c.iconBg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: feedbackItems.filter(f => f.status === "new").length > 0 ? "#fff" : c.textMuted }}>
                    {feedbackItems.filter(f => f.status === "new").length} новых
                  </Text>
                </View>
              </View>

              {feedbackItems.filter(f => feedbackFilter === "all" || f.status === feedbackFilter || (feedbackFilter === "replied" && (f.status === "replied" || f.status === "done"))).length === 0 ? (
                <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 40, alignItems: "center" }}>
                  <MessageSquare size={44} color={c.border} />
                  <Text style={{ color: c.textMuted, marginTop: 12, fontWeight: "500" }}>Обращений нет</Text>
                </View>
              ) : feedbackItems
                  .filter(f => feedbackFilter === "all" || f.status === feedbackFilter || (feedbackFilter === "replied" && (f.status === "replied" || f.status === "done")))
                  .map(fb => {
                const typeEmoji = fb.type === "suggestion" ? "💡" : fb.type === "bug" ? "🐛" : fb.type === "question" ? "❓" : "⚠️";
                const typeLabel = fb.type === "suggestion" ? "Предложение" : fb.type === "bug" ? "Ошибка" : fb.type === "question" ? "Вопрос" : "Жалоба";
                const stColor = fb.status === "new" ? "#ef4444" : fb.status === "read" ? "#2563EB" : "#16a34a";
                const stLabel = fb.status === "new" ? "Новое" : fb.status === "read" ? "Прочитано" : fb.status === "replied" ? "Ответили" : "Решено";
                return (
                  <View key={fb.id} style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden", borderLeftWidth: 3, borderLeftColor: stColor }}>
                    <View style={{ padding: 14, gap: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 20 }}>{typeEmoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>{fb.title}</Text>
                          <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                            {typeLabel} · {fb.seller_shop || fb.seller_name || "Продавец"} · {new Date(fb.created_at).toLocaleDateString("ru-RU")}
                          </Text>
                          {fb.seller_phone && <Text style={{ fontSize: 11, color: "#2563EB", marginTop: 1 }}>{fb.seller_phone}</Text>}
                        </View>
                        <View style={{ backgroundColor: stColor + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: stColor }}>{stLabel}</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: c.iconBg, borderRadius: 12, padding: 12 }}>
                        <Text style={{ fontSize: 13, color: c.text, lineHeight: 20 }}>{fb.message}</Text>
                      </View>
                      {fb.admin_reply && (
                        <View style={{ backgroundColor: "#eff6ff", borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: P }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: P, marginBottom: 4 }}>Ваш ответ:</Text>
                          <Text style={{ fontSize: 13, color: "#1e3a8a", lineHeight: 18 }}>{fb.admin_reply}</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity onPress={() => { setReplyModal({ visible: true, item: fb }); setReplyText(fb.admin_reply || ""); }}
                          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: P + "15", paddingVertical: 10, borderRadius: 12 }}>
                          <MessageSquare size={14} color={P} />
                          <Text style={{ fontSize: 13, fontWeight: "600", color: P }}>{fb.admin_reply ? "Изменить ответ" : "Ответить"}</Text>
                        </TouchableOpacity>
                        {fb.status !== "done" && (
                          <TouchableOpacity onPress={async () => {
                            try {
                              await api.patch(`/feedback/admin/${fb.id}`, { status: "done", reply: fb.admin_reply || null });
                              const r = await api.get<FeedbackItem[]>("/feedback/admin/all");
                              setFeedbackItems(r.data);
                              Toast.show({ type: "success", text1: "Отмечено как решено" });
                            } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
                          }}
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }}>
                            <CheckCircle size={14} color="#16a34a" />
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Решено</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}

              <Modal visible={replyModal.visible} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" }}>
                  <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Ответить</Text>
                      <TouchableOpacity onPress={() => setReplyModal({ visible: false, item: null })} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                        <X size={16} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>
                    {replyModal.item && (
                      <View style={{ backgroundColor: c.iconBg, borderRadius: 12, padding: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 4 }}>ОБРАЩЕНИЕ</Text>
                        <Text style={{ fontSize: 13, color: c.text }} numberOfLines={2}>{replyModal.item.title}</Text>
                      </View>
                    )}
                    <TextInput value={replyText} onChangeText={setReplyText}
                      multiline numberOfLines={4} textAlignVertical="top"
                      placeholder="Напишите ответ продавцу..."
                      placeholderTextColor={c.textMuted}
                      style={{ backgroundColor: c.iconBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 100 }} />
                    <TouchableOpacity disabled={replying || !replyText.trim()}
                      onPress={async () => {
                        if (!replyModal.item) return;
                        setReplying(true);
                        try {
                          await api.patch(`/feedback/admin/${replyModal.item.id}`, { status: "replied", reply: replyText.trim() });
                          const r = await api.get<FeedbackItem[]>("/feedback/admin/all");
                          setFeedbackItems(r.data);
                          setReplyModal({ visible: false, item: null });
                          Toast.show({ type: "success", text1: "Ответ отправлен!" });
                        } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
                        finally { setReplying(false); }
                      }}
                      style={{ backgroundColor: P, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: (replying || !replyText.trim()) ? 0.5 : 1 }}>
                      {replying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Отправить ответ</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          )}

          {/* ── КАТЕГОРИИ ── */}
          {section === "Категории" && (
            <>
              <TouchableOpacity onPress={() => setCatForm({ visible: true, name: "", slug: "", parent_id: "" })}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: P, borderRadius: 14, paddingVertical: 13 }}>
                <Plus size={16} color="#fff" />
                <Text style={{ fontWeight: "700", color: "#fff", fontSize: 14 }}>Новая корневая категория</Text>
              </TouchableOpacity>

              {(() => {
                const roots = adminCats.filter(cat => !cat.parent_id);
                const subsOf = (id: number) => adminCats.filter(cat => cat.parent_id === id);
                return roots.map((root) => (
                  <View key={root.id} style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}>
                    {/* Root row */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: c.border }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                        <Tag size={14} color={P} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>{root.name}</Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>{root.slug}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setCatForm({ visible: true, id: root.id, name: root.name, slug: root.slug, parent_id: "" })}
                        style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#f0f9ff", alignItems: "center", justifyContent: "center" }}>
                        <Pencil size={13} color="#0ea5e9" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteCat(root.id, root.name)}
                        style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    {/* Subcategories */}
                    {subsOf(root.id).map((sub) => (
                      <View key={sub.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, paddingLeft: 24, borderBottomWidth: 0.5, borderBottomColor: c.border }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.textMuted }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "500", color: c.textSub }}>{sub.name}</Text>
                          <Text style={{ fontSize: 10, color: c.textMuted }}>{sub.slug}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setCatForm({ visible: true, id: sub.id, name: sub.name, slug: sub.slug, parent_id: String(sub.parent_id) })}
                          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#f0f9ff", alignItems: "center", justifyContent: "center" }}>
                          <Pencil size={12} color="#0ea5e9" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteCat(sub.id, sub.name)}
                          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}>
                          <Trash2 size={12} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {/* Add subcategory button */}
                    <TouchableOpacity onPress={() => setCatForm({ visible: true, name: "", slug: "", parent_id: String(root.id) })}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 24, paddingVertical: 10 }}>
                      <Plus size={12} color={c.textMuted} />
                      <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: "500" }}>Добавить подкатегорию</Text>
                    </TouchableOpacity>
                  </View>
                ));
              })()}
            </>
          )}

          {/* ── БАННЕРЫ ── */}
          {section === "Баннеры" && (
            <>
              {/* Где менять баннер */}
              <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: c.text }}>Где менять баннер?</Text>

                {/* Главный экран */}
                <TouchableOpacity
                  onPress={() => setBannerFormState({ visible: true, existing: banners.find(b => !b.link_url) ?? null, initialLinkUrl: null })}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#EFF6FF", borderRadius: 16, padding: 14 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: P, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 22 }}>🏠</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Главный экран</Text>
                    <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                      {banners.filter(b => !b.link_url).length > 0 ? `${banners.filter(b => !b.link_url).length} баннер(а)` : "Нет баннеров"}
                    </Text>
                  </View>
                  <Pencil size={16} color={P} />
                </TouchableOpacity>

                {/* Категории — сгруппированы */}
                {(() => {
                  const roots = catSlots.filter(c => !c.parent_id);
                  const subOf = (id: number) => catSlots.filter(c => c.parent_id === id);
                  return roots.map((root) => {
                    const subs = subOf(root.id);
                    const allCats = [root, ...subs];
                    return (
                      <View key={root.id} style={{ gap: 6 }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "700", letterSpacing: 0.5 }}>{root.name.toUpperCase()}</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                          {allCats.map((cat) => {
                            const hasBanner = banners.some(b => b.link_url === `category:${cat.slug}`);
                            const existingBanner = banners.find(b => b.link_url === `category:${cat.slug}`) ?? null;
                            const isRoot = !cat.parent_id;
                            return (
                              <TouchableOpacity
                                key={cat.id}
                                onPress={() => setBannerFormState({ visible: true, existing: existingBanner, initialLinkUrl: `category:${cat.slug}` })}
                                style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: hasBanner ? P : isRoot ? "#f0f9ff" : "#f3f4f6", borderWidth: hasBanner ? 0 : 1, borderColor: isRoot ? "#bae6fd" : "#e5e7eb" }}
                              >
                                {hasBanner && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#93C5FD" }} />}
                                <Text style={{ fontSize: 12, fontWeight: isRoot ? "700" : "500", color: hasBanner ? "#fff" : isRoot ? "#0369a1" : "#374151" }}>{cat.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>

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

              {banners.length === 0 ? (
                <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 40, alignItems: "center" }}>
                  <Text style={{ color: c.textMuted, fontWeight: "500" }}>Баннеров нет</Text>
                </View>
              ) : banners.map((b) => (
                <View key={b.id} style={{ backgroundColor: c.card, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: b.bg_color, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {b.image_url
                      ? <Image source={{ uri: imgUrl(b.image_url) ?? "" }} style={{ width: 48, height: 48 }} contentFit="cover" />
                      : <Text style={{ fontSize: 24 }}>{b.emoji || "🖼️"}</Text>
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }} numberOfLines={1}>{b.title}</Text>
                    {b.subtitle && <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }} numberOfLines={1}>{b.subtitle}</Text>}
                    <Text style={{ fontSize: 11, marginTop: 3, color: b.is_active ? "#16a34a" : "#9ca3af", fontWeight: "500" }}>
                      {b.is_active ? "● Активен" : "○ Отключён"}
                      {b.link_url
                        ? b.link_url.startsWith("category:")
                          ? ` · ${catSlots.find(c => c.slug === b.link_url!.replace("category:", ""))?.name ?? b.link_url.replace("category:", "")}`
                          : ` · ${b.link_url}`
                        : " · Главный экран"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity onPress={() => setBannerFormState({ visible: true, existing: b })} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#f0f9ff", alignItems: "center", justifyContent: "center" }}>
                      <Pencil size={15} color="#0ea5e9" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleBanner(b)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }}>
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

      {/* Category Form Modal */}
      <Modal visible={catForm.visible} transparent animationType="slide" onRequestClose={() => setCatForm({ visible: false, name: "", slug: "", parent_id: "" })}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setCatForm({ visible: false, name: "", slug: "", parent_id: "" })} />
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>
                {catForm.id ? "Редактировать категорию" : catForm.parent_id ? "Новая подкатегория" : "Новая категория"}
              </Text>
              <TouchableOpacity onPress={() => setCatForm({ visible: false, name: "", slug: "", parent_id: "" })}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={c.textSub} />
              </TouchableOpacity>
            </View>
            {catForm.parent_id ? (
              <View style={{ backgroundColor: c.iconBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: P, fontWeight: "600" }}>
                  Подкатегория для: {adminCats.find(cat => cat.id === Number(catForm.parent_id))?.name ?? `#${catForm.parent_id}`}
                </Text>
              </View>
            ) : null}
            <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600", marginBottom: 6 }}>НАЗВАНИЕ</Text>
            <TextInput value={catForm.name} onChangeText={(v) => setCatForm(f => ({ ...f, name: v }))}
              placeholder="Электроника" placeholderTextColor={c.textMuted}
              style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: c.text, borderWidth: 1.5, borderColor: catForm.name ? P : c.border, marginBottom: 12 }} />
            <Text style={{ fontSize: 12, color: c.textSub, fontWeight: "600", marginBottom: 6 }}>SLUG (латиница)</Text>
            <TextInput value={catForm.slug} onChangeText={(v) => setCatForm(f => ({ ...f, slug: v.toLowerCase().replace(/\s+/g, "-") }))}
              placeholder="electronics" placeholderTextColor={c.textMuted} autoCapitalize="none"
              style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: c.text, borderWidth: 1.5, borderColor: catForm.slug ? P : c.border, marginBottom: 20 }} />
            <TouchableOpacity onPress={saveCat} disabled={catSaving}
              style={{ backgroundColor: P, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
              {catSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontWeight: "700", color: "#fff", fontSize: 15 }}>{catForm.id ? "Сохранить" : "Создать"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Banner Form Modal */}
      <Modal visible={bannerFormState.visible} transparent animationType="slide" onRequestClose={() => setBannerFormState({ visible: false, existing: null })}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setBannerFormState({ visible: false, existing: null })} />
          <View style={{ height: "88%", backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <BannerForm
              existing={bannerFormState.existing}
              initialLinkUrl={bannerFormState.initialLinkUrl}
              onClose={() => setBannerFormState({ visible: false, existing: null })}
              onSave={() => { setBannerFormState({ visible: false, existing: null }); loadAll(); }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
