import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Users, Package, ShoppingBag, TrendingUp, CheckCircle, XCircle, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react-native";
import Toast from "react-native-toast-message";
import api from "@/lib/api";

interface Stats { users_count: number; products_count: number; orders_count: number; revenue: number; }
interface SellerApp { id: number; user_id: number; username?: string; phone?: string; shop_name: string; description?: string; status: string; created_at: string; }
interface Banner { id: number; title: string; subtitle?: string; bg_color: string; accent_color: string; emoji?: string; link_url?: string; is_active: boolean; sort_order: number; }

function BannerForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: "", subtitle: "", bg_color: "#7C3AED", accent_color: "#C4B5FD", emoji: "", sort_order: "0" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { Toast.show({ type: "error", text1: "Введите заголовок" }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.subtitle.trim()) fd.append("subtitle", form.subtitle.trim());
      fd.append("bg_color", form.bg_color);
      fd.append("accent_color", form.accent_color);
      if (form.emoji.trim()) fd.append("emoji", form.emoji.trim());
      fd.append("sort_order", form.sort_order || "0");
      await api.post("/banners", fd, { headers: { "Content-Type": "multipart/form-data" } });
      Toast.show({ type: "success", text1: "Баннер создан" });
      onSave();
    } catch { Toast.show({ type: "error", text1: "Ошибка сохранения" }); }
    finally { setSaving(false); }
  };

  return (
    <View className="bg-white rounded-3xl p-5 mx-4 gap-3">
      <Text className="text-base font-bold text-gray-900 mb-1">Новый баннер</Text>
      {[
        { label: "Заголовок *", key: "title", placeholder: "Скидки до 50%" },
        { label: "Подзаголовок", key: "subtitle", placeholder: "На все категории" },
        { label: "Фон (hex)", key: "bg_color", placeholder: "#7C3AED" },
        { label: "Акцент (hex)", key: "accent_color", placeholder: "#C4B5FD" },
        { label: "Эмодзи", key: "emoji", placeholder: "📱" },
        { label: "Порядок", key: "sort_order", placeholder: "0" },
      ].map(({ label, key, placeholder }) => (
        <View key={key}>
          <Text className="text-xs text-gray-500 mb-1">{label}</Text>
          <TextInput
            value={(form as any)[key]}
            onChangeText={(v) => set(key, v)}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900"
            keyboardType={key === "sort_order" ? "numeric" : "default"}
          />
        </View>
      ))}
      <View className="flex-row gap-3 mt-2">
        <TouchableOpacity onPress={onClose} className="flex-1 bg-gray-100 py-3 rounded-2xl items-center">
          <Text className="font-semibold text-gray-600">Отмена</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving} className="flex-1 bg-violet-500 py-3 rounded-2xl items-center">
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text className="font-semibold text-white">Сохранить</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminTabScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [apps, setApps] = useState<SellerApp[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBannerForm, setShowBannerForm] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.get<Stats>("/admin/stats").then((r) => setStats(r.data)).catch(() => {}),
      api.get<SellerApp[]>("/seller-applications").then((r) => setApps(r.data)).catch(() => {}),
      api.get<Banner[]>("/banners/all").then((r) => setBanners(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const reviewApp = async (id: number, action: "approve" | "reject") => {
    try {
      await api.patch(`/seller-applications/${id}`, { status: action === "approve" ? "approved" : "rejected" });
      setApps((prev) => prev.filter((a) => a.id !== id));
      Toast.show({ type: "success", text1: action === "approve" ? "Заявка одобрена" : "Заявка отклонена" });
    } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
  };

  const toggleBanner = async (b: Banner) => {
    try {
      const fd = new FormData();
      fd.append("is_active", String(!b.is_active));
      await api.patch(`/banners/${b.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, is_active: !x.is_active } : x));
    } catch { Toast.show({ type: "error", text1: "Ошибка" }); }
  };

  const deleteBanner = async (id: number) => {
    try {
      await api.delete(`/banners/${id}`);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      Toast.show({ type: "success", text1: "Баннер удалён" });
    } catch { Toast.show({ type: "error", text1: "Ошибка удаления" }); }
  };

  const statCards = stats ? [
    { label: "Пользователей", value: stats.users_count, icon: Users, color: "#8B5CF6", bg: "#eff6ff" },
    { label: "Товаров", value: stats.products_count, icon: Package, color: "#22c55e", bg: "#f0fdf4" },
    { label: "Заказов", value: stats.orders_count, icon: ShoppingBag, color: "#a855f7", bg: "#faf5ff" },
    { label: "Выручка", value: `${stats.revenue.toLocaleString()} сом.`, icon: TrendingUp, color: "#f97316", bg: "#fff7ed" },
  ] : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Панель администратора</Text>
      </View>

      <Modal visible={showBannerForm} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40 pb-8">
          <BannerForm onClose={() => setShowBannerForm(false)} onSave={() => { setShowBannerForm(false); loadAll(); }} />
        </View>
      </Modal>

      {loading ? <ActivityIndicator color="#8B5CF6" className="mt-10" /> : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Stats */}
          <View className="gap-3">
            <Text className="font-semibold text-gray-700">Статистика</Text>
            <View className="flex-row flex-wrap gap-3">
              {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                <View key={label} className="bg-white rounded-2xl p-4 flex-row items-center gap-3" style={{ width: "47%" }}>
                  <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: bg }}>
                    <Icon size={20} color={color} />
                  </View>
                  <View>
                    <Text className="text-lg font-bold text-gray-900">{value}</Text>
                    <Text className="text-xs text-gray-400">{label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Banners */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-gray-700">Баннеры ({banners.length})</Text>
              <TouchableOpacity onPress={() => setShowBannerForm(true)} className="flex-row items-center gap-1.5 bg-violet-500 px-3 py-1.5 rounded-xl">
                <Plus size={14} color="white" />
                <Text className="text-xs font-semibold text-white">Добавить</Text>
              </TouchableOpacity>
            </View>
            {banners.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center">
                <Text className="text-gray-400 text-sm">Баннеров нет</Text>
              </View>
            ) : banners.map((b) => (
              <View key={b.id} className="bg-white rounded-2xl p-4 flex-row items-center gap-3">
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: b.bg_color, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 22 }}>{b.emoji || "🖼️"}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800 text-sm" numberOfLines={1}>{b.title}</Text>
                  {b.subtitle && <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{b.subtitle}</Text>}
                  <Text className="text-xs mt-0.5" style={{ color: b.is_active ? "#16a34a" : "#9ca3af" }}>
                    {b.is_active ? "Активен" : "Отключён"} · #{b.sort_order}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity onPress={() => toggleBanner(b)} className="w-8 h-8 items-center justify-center">
                    {b.is_active
                      ? <ToggleRight size={24} color="#8B5CF6" />
                      : <ToggleLeft size={24} color="#9ca3af" />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteBanner(b.id)} className="w-8 h-8 items-center justify-center">
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Seller Applications */}
          <View className="gap-3">
            <Text className="font-semibold text-gray-700">Заявки на продавца {apps.length > 0 && `(${apps.length})`}</Text>
            {apps.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center">
                <CheckCircle size={40} color="#e5e7eb" />
                <Text className="text-gray-400 mt-2 text-sm">Новых заявок нет</Text>
              </View>
            ) : apps.map((app) => (
              <View key={app.id} className="bg-white rounded-2xl p-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-gray-800">{app.shop_name}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">{app.username}{app.phone ? ` · ${app.phone}` : ""}</Text>
                    {app.description && <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={2}>{app.description}</Text>}
                    <Text className="text-xs text-gray-300 mt-1">{new Date(app.created_at).toLocaleDateString("ru-RU")}</Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-full bg-yellow-100">
                    <Text className="text-xs font-semibold text-yellow-700">Ожидает</Text>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => reviewApp(app.id, "approve")} className="flex-1 flex-row items-center justify-center gap-2 bg-green-50 py-2.5 rounded-xl">
                    <CheckCircle size={16} color="#16a34a" />
                    <Text className="text-sm font-semibold text-green-700">Одобрить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => reviewApp(app.id, "reject")} className="flex-1 flex-row items-center justify-center gap-2 bg-red-50 py-2.5 rounded-xl">
                    <XCircle size={16} color="#ef4444" />
                    <Text className="text-sm font-semibold text-red-500">Отклонить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
