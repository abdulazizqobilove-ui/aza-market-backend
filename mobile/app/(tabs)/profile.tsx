import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";
import {
  User as UserIcon, Package, Heart, LogOut, LogIn,
  Clock, ChevronRight, Store, Shield, ClipboardList, TrendingUp,
  Bell, Wallet, MessageSquare, CreditCard, Pencil, FileText,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import api, { API_URL, imgUrl, User } from "@/lib/api";

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  buyer:  { bg: "#eff6ff", text: "#8B5CF6", label: "Покупатель" },
  seller: { bg: "#f0fdf4", text: "#16a34a", label: "Продавец" },
  admin:  { bg: "#faf5ff", text: "#7c3aed", label: "Администратор" },
};

function Section({ children }: { children: React.ReactNode }) {
  return <View className="bg-white rounded-2xl overflow-hidden">{children}</View>;
}

function Row({ label, sub, icon: Icon, onPress, color = "#6b7280", danger = false }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-3.5 px-4 py-4 border-b border-gray-50 active:bg-gray-50"
      style={{ borderBottomWidth: 0.5 }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? "#fff1f2" : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={danger ? "#f87171" : color} strokeWidth={1.8} />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${danger ? "text-red-400" : "text-gray-800"}`}>{label}</Text>
        {sub && <Text className="text-xs text-gray-400 mt-0.5">{sub}</Text>}
      </View>
      <ChevronRight size={15} color="#d1d5db" />
    </TouchableOpacity>
  );
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center py-3">
      <Text className="text-lg font-black text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-400 mt-0.5">{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const favIds = useFavoritesStore((s) => s.ids);
  const favCount = Object.values(favIds).filter(Boolean).length;
  const [stats, setStats] = useState({ orders: 0, reviews: 0 });
  const [sellerStats, setSellerStats] = useState({ products: 0, balance: 0 });

  // Refresh user from API every time profile tab comes into focus
  useFocusEffect(useCallback(() => {
    if (!user) return;
    api.get<User>("/users/me").then((r) => updateUser(r.data)).catch(() => {});
  }, [user?.id]));

  useEffect(() => {
    if (!user) return;
    if (user.role === "buyer") {
      api.get("/orders").then((r: any) => setStats((s) => ({ ...s, orders: r.data.length }))).catch(() => {});
      api.get("/reviews/my").then((r: any) => setStats((s) => ({ ...s, reviews: r.data.reviewed?.length ?? 0 }))).catch(() => {});
    }
    if (user.role === "seller") {
      api.get("/seller/products").then((r: any) => setSellerStats((s) => ({ ...s, products: r.data.length }))).catch(() => {});
      api.get("/seller/balance").then((r: any) => setSellerStats((s) => ({ ...s, balance: r.data.balance ?? 0 }))).catch(() => {});
    }
  }, [user?.id]);

  const handleLogout = () => {
    Alert.alert("Выйти?", "Вы уверены что хотите выйти?", [
      { text: "Отмена", style: "cancel" },
      { text: "Выйти", style: "destructive", onPress: () => logout() },
    ]);
  };

  // Not logged in
  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <UserIcon size={40} color="#C4B5FD" />
          </View>
          <Text className="text-2xl font-black text-gray-900 mb-2">Войдите в аккаунт</Text>
          <Text className="text-sm text-gray-400 mb-8 text-center leading-relaxed">Отслеживайте заказы, сохраняйте избранное и управляйте покупками</Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            className="bg-violet-500 px-12 py-4 rounded-2xl flex-row items-center gap-2 shadow-sm"
          >
            <LogIn size={18} color="white" />
            <Text className="text-white font-bold text-base">Войти</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-400 mt-6">Войдите по номеру телефона</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.buyer;
  const initials = (user.full_name || user.username || "?")[0].toUpperCase();
  const avatarColor = user.role === "admin" ? "#7c3aed" : user.role === "seller" ? "#16a34a" : "#8B5CF6";

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={{ backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text className="text-gray-900 text-lg font-black">Профиль</Text>
            <TouchableOpacity
              onPress={() => router.push("/edit-profile" as any)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 }}
            >
              <Pencil size={13} color="#374151" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Изменить</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={() => router.push("/edit-profile" as any)}>
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: avatarColor + "18", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: avatarColor + "40", overflow: "hidden" }}>
                {user.avatar_url ? (
                  <Image source={{ uri: imgUrl(user.avatar_url) ?? "" }} style={{ width: 68, height: 68 }} contentFit="cover" />
                ) : (
                  <Text style={{ color: avatarColor, fontSize: 26, fontWeight: "900" }}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-gray-900 font-bold text-lg leading-tight">{user.full_name || user.username}</Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>{user.phone || ""}</Text>
              <View style={{ marginTop: 6, alignSelf: "flex-start", backgroundColor: roleStyle.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: roleStyle.text, fontSize: 11, fontWeight: "700" }}>{roleStyle.label}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-4 pt-4 gap-3">
          {/* Stats row — buyer */}
          {user.role === "buyer" && (
            <View className="bg-white rounded-2xl flex-row shadow-sm">
              <StatBox value={stats.orders} label="Заказов" />
              <View style={{ width: 1, backgroundColor: "#f3f4f6", marginVertical: 12 }} />
              <StatBox value={favCount} label="Избранных" />
              <View style={{ width: 1, backgroundColor: "#f3f4f6", marginVertical: 12 }} />
              <StatBox value={stats.reviews} label="Отзывов" />
            </View>
          )}

          {/* Stats row — seller */}
          {user.role === "seller" && (
            <View className="bg-white rounded-2xl flex-row shadow-sm">
              <StatBox value={sellerStats.products} label="Товаров" />
              <View style={{ width: 1, backgroundColor: "#f3f4f6", marginVertical: 12 }} />
              <StatBox value={`${sellerStats.balance.toLocaleString()} сом.`} label="Баланс" />
            </View>
          )}

          {/* Buyer menu */}
          {user.role === "buyer" && (
            <>
              <Section>
                <Row label="Мои заказы" sub="История покупок" icon={Package} color="#8B5CF6" onPress={() => router.push("/orders" as any)} />
                <Row label="Избранное" sub="Сохранённые товары" icon={Heart} color="#ef4444" onPress={() => router.push("/favorites" as any)} />
                <Row label="Мои отзывы" sub="Оценить купленные товары" icon={MessageSquare} color="#f59e0b" onPress={() => router.push("/my-reviews" as any)} />
                <Row label="Сообщения" sub="Чат с продавцами" icon={MessageSquare} color="#8b5cf6" onPress={() => router.push("/chats" as any)} />
                <Row label="Лист ожидания" sub="Уведомим о наличии" icon={Clock} color="#9ca3af" onPress={() => router.push("/waitlist" as any)} />
              </Section>
              <Section>
                <Row label="Способы оплаты" sub="Карты и платёжные методы" icon={CreditCard} color="#8B5CF6" onPress={() => router.push("/payment-cards" as any)} />
              </Section>
              <Section>
                <Row label="Стать продавцом" sub="Открыть свой магазин" icon={Store} color="#16a34a" onPress={() => router.push("/become-seller" as any)} />
              </Section>
            </>
          )}

          {/* Seller menu */}
          {user.role === "seller" && (
            <>
              <Section>
                <Row label="Мои товары" sub="Управление каталогом" icon={Package} color="#8B5CF6" onPress={() => router.push("/(tabs)/seller-products" as any)} />
                <Row label="Заказы покупателей" sub="Обработка заказов" icon={ClipboardList} color="#7c3aed" onPress={() => router.push("/(tabs)/seller-orders" as any)} />
                <Row label="Аналитика и доходы" sub="Статистика продаж" icon={TrendingUp} color="#16a34a" onPress={() => router.push("/(tabs)/seller-analytics" as any)} />
              </Section>
              <Section>
                <Row label="Сообщения" sub="Чат с покупателями" icon={MessageSquare} color="#8b5cf6" onPress={() => router.push("/chats" as any)} />
              </Section>
              <Section>
                <Row label="Оформление магазина" sub="Баннер, логотип, описание" icon={Store} color="#f59e0b" onPress={() => router.push("/(tabs)/seller-shop" as any)} />
                <Row label="Вывод средств" sub={`Баланс: ${sellerStats.balance.toLocaleString()} сом.`} icon={Wallet} color="#16a34a" onPress={() => router.push("/(tabs)/seller-analytics" as any)} />
              </Section>
            </>
          )}

          {/* Admin menu */}
          {user.role === "admin" && (
            <Section>
              <Row label="Панель администратора" sub="Управление платформой" icon={Shield} color="#7c3aed" onPress={() => router.push("/(tabs)/admin-tab" as any)} />
              <Row label="Все товары" icon={Package} color="#8B5CF6" onPress={() => router.push("/(tabs)/catalog" as any)} />
            </Section>
          )}

          {/* Common bottom */}
          <Section>
            <Row label="Уведомления" icon={Bell} color="#f59e0b" onPress={() => router.push("/notifications" as any)} />
            <Row label="Политика конфиденциальности" icon={FileText} color="#9ca3af" onPress={() => router.push("/privacy" as any)} />
          </Section>

          <Text className="text-center text-xs text-gray-300">AZA Market · Версия 1.0.0 · Таджикистан</Text>

          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white rounded-2xl py-4 items-center border border-gray-100 flex-row justify-center gap-2"
          >
            <LogOut size={16} color="#f87171" />
            <Text className="text-red-400 font-semibold">Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
