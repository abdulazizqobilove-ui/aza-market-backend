import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";
import {
  User as UserIcon, Package, Heart, LogOut, LogIn,
  Clock, ChevronRight, Store, Shield, ClipboardList, TrendingUp,
  Bell, Wallet, MessageSquare, CreditCard, Pencil, Moon,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import api, { API_URL, imgUrl, User } from "@/lib/api";
import { useThemeColors, useIsDark } from "@/lib/theme";
import { useThemeStore } from "@/store/theme";

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  buyer:  { bg: "#eff6ff", text: "#8B5CF6", label: "Покупатель" },
  seller: { bg: "#f0fdf4", text: "#16a34a", label: "Продавец" },
  admin:  { bg: "#faf5ff", text: "#7c3aed", label: "Администратор" },
};

function Section({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden" }}>
      {children}
    </View>
  );
}

function Row({ label, sub, icon: Icon, onPress, color = "#6b7280", danger = false }: any) {
  const c = useThemeColors();
  const blocked = useRef(false);

  const handlePress = () => {
    if (blocked.current) return;
    blocked.current = true;
    onPress?.();
    setTimeout(() => { blocked.current = false; }, 300);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: c.border }}
      activeOpacity={0.7}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? "#fff1f2" : c.iconBg, alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={danger ? "#f87171" : color} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: danger ? "#f87171" : c.text }}>{label}</Text>
        {sub && <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{sub}</Text>}
      </View>
      <ChevronRight size={15} color={c.textMuted} />
    </TouchableOpacity>
  );
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  const c = useThemeColors();
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "900", color: c.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const isDark = useIsDark();
  const toggle = useThemeStore((s) => s.toggle);
  const { user, logout, updateUser } = useAuthStore();
  const favIds = useFavoritesStore((s) => s.ids);
  const favCount = Object.values(favIds).filter(Boolean).length;
  const [stats, setStats] = useState({ orders: 0, reviews: 0 });
  const [sellerStats, setSellerStats] = useState({ products: 0, balance: 0 });

  useFocusEffect(useCallback(() => {
    if (!user) return;
    let cancelled = false;
    api.get<User>("/users/me").then((r) => { if (!cancelled) updateUser(r.data); }).catch(() => {});
    return () => { cancelled = true; };
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

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.card }}>
        <ScrollView contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <UserIcon size={40} color="#C4B5FD" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "900", color: c.text, marginBottom: 8 }}>Войдите в аккаунт</Text>
          <Text style={{ fontSize: 14, color: c.textMuted, marginBottom: 32, textAlign: "center", lineHeight: 22 }}>Отслеживайте заказы, сохраняйте избранное и управляйте покупками</Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            style={{ backgroundColor: "#8B5CF6", paddingHorizontal: 48, paddingVertical: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <LogIn size={18} color="white" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Войти</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 24 }}>Войдите по номеру телефона</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.buyer;
  const initials = (user.full_name || user.username || "?")[0].toUpperCase();
  const avatarColor = user.role === "admin" ? "#7c3aed" : user.role === "seller" ? "#16a34a" : "#8B5CF6";
  const divColor = c.border;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={{ backgroundColor: c.card, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: c.text }}>Профиль</Text>
            <TouchableOpacity
              onPress={() => router.push("/edit-profile" as any)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.iconBg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 }}
            >
              <Pencil size={13} color={c.textSub} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSub }}>Изменить</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <TouchableOpacity onPress={() => router.push("/edit-profile" as any)}>
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: avatarColor + "18", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: avatarColor + "40", overflow: "hidden" }}>
                {user.avatar_url ? (
                  <Image source={{ uri: imgUrl(user.avatar_url) ?? "" }} style={{ width: 68, height: 68 }} contentFit="cover" />
                ) : (
                  <Text style={{ color: avatarColor, fontSize: 26, fontWeight: "900" }}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: c.text, lineHeight: 22 }}>{user.full_name || user.username}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{user.phone || ""}</Text>
              <View style={{ marginTop: 6, alignSelf: "flex-start", backgroundColor: roleStyle.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: roleStyle.text, fontSize: 11, fontWeight: "700" }}>{roleStyle.label}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          {/* Stats row — buyer */}
          {user.role === "buyer" && (
            <View style={{ backgroundColor: c.card, borderRadius: 16, flexDirection: "row" }}>
              <StatBox value={stats.orders} label="Заказов" />
              <View style={{ width: 1, backgroundColor: divColor, marginVertical: 12 }} />
              <StatBox value={favCount} label="Избранных" />
              <View style={{ width: 1, backgroundColor: divColor, marginVertical: 12 }} />
              <StatBox value={stats.reviews} label="Отзывов" />
            </View>
          )}

          {/* Stats row — seller */}
          {user.role === "seller" && (
            <View style={{ backgroundColor: c.card, borderRadius: 16, flexDirection: "row" }}>
              <StatBox value={sellerStats.products} label="Товаров" />
              <View style={{ width: 1, backgroundColor: divColor, marginVertical: 12 }} />
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
            <Row label="Политика конфиденциальности" icon={Shield} color="#6b7280" onPress={() => router.push("/privacy" as any)} />
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                <Moon size={18} color="#8B5CF6" strokeWidth={1.8} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.text }}>Тёмная тема</Text>
              <Switch
                value={isDark}
                onValueChange={toggle}
                trackColor={{ false: "#e5e7eb", true: "#8B5CF6" }}
                thumbColor="#fff"
              />
            </View>
          </Section>

          <Section>
            <Row label="Выйти из аккаунта" icon={LogOut} color="#f87171" onPress={handleLogout} danger />
          </Section>

          <Text style={{ textAlign: "center", fontSize: 11, color: c.textMuted, marginBottom: 8 }}>AZA Market · Версия 1.0.0 · Таджикистан</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
