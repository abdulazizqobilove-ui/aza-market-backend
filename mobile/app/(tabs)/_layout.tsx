import { Tabs, Redirect } from "expo-router";
import { Home, LayoutGrid, ShoppingCart, User, Package, ClipboardList, TrendingUp, Shield, Users, Store, BarChart2 } from "lucide-react-native";
import { View, Text } from "react-native";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useThemeColors } from "@/lib/theme";

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-0.5">
      <Text className="text-white text-[9px] font-bold">{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.count)();
  const c = useThemeColors();

  const PRIMARY = "#8B5CF6";
  const GRAY = "#9ca3af";

  if (!user) {
    return (
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: PRIMARY, tabBarInactiveTintColor: GRAY, tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.tabBorder }, tabBarLabelStyle: { fontSize: 10, color: GRAY } }}>
        <Tabs.Screen name="index" options={{ title: "Главная", tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
        <Tabs.Screen name="catalog" options={{ title: "Каталог", tabBarIcon: ({ color }) => <LayoutGrid size={22} color={color} /> }} />
        <Tabs.Screen name="cart" options={{ title: "Корзина", tabBarIcon: ({ color }) => <View className="relative"><ShoppingCart size={22} color={color} /><Badge count={cartCount} /></View> }} />
        <Tabs.Screen name="profile" options={{ title: "Профиль", tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
        <Tabs.Screen name="admin-tab" options={{ href: null }} />
        <Tabs.Screen name="seller-products" options={{ href: null }} />
        <Tabs.Screen name="seller-orders" options={{ href: null }} />
        <Tabs.Screen name="seller-analytics" options={{ href: null }} />
        <Tabs.Screen name="seller-shop" options={{ href: null }} />
        <Tabs.Screen name="seller-stats" options={{ href: null }} />
      </Tabs>
    );
  }

  if (user.role === "admin") {
    return (
      <Tabs initialRouteName="admin-tab" screenOptions={{ headerShown: false, tabBarActiveTintColor: PRIMARY, tabBarInactiveTintColor: GRAY, tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.tabBorder }, tabBarLabelStyle: { fontSize: 10, color: GRAY } }}>
        <Tabs.Screen name="admin-tab" options={{ title: "Панель", tabBarIcon: ({ color }) => <Shield size={22} color={color} /> }} />
        <Tabs.Screen name="catalog" options={{ title: "Каталог", tabBarIcon: ({ color }) => <LayoutGrid size={22} color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: "Профиль", tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="cart" options={{ href: null }} />
        <Tabs.Screen name="seller-products" options={{ href: null }} />
        <Tabs.Screen name="seller-orders" options={{ href: null }} />
        <Tabs.Screen name="seller-analytics" options={{ href: null }} />
        <Tabs.Screen name="seller-shop" options={{ href: null }} />
        <Tabs.Screen name="seller-stats" options={{ href: null }} />
      </Tabs>
    );
  }

  if (user.role === "seller") {
    return (
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: PRIMARY, tabBarInactiveTintColor: GRAY, tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.tabBorder }, tabBarLabelStyle: { fontSize: 10, color: GRAY } }}>
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="catalog" options={{ href: null }} />
        <Tabs.Screen name="cart" options={{ href: null }} />
        <Tabs.Screen name="admin-tab" options={{ href: null }} />
        <Tabs.Screen name="seller-products" options={{ title: "Товары", tabBarIcon: ({ color }) => <Package size={22} color={color} /> }} />
        <Tabs.Screen name="seller-orders" options={{ title: "Заказы", tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} /> }} />
        <Tabs.Screen name="seller-stats" options={{ title: "Статистика", tabBarIcon: ({ color }) => <BarChart2 size={22} color={color} /> }} />
        <Tabs.Screen name="seller-shop" options={{ title: "Магазин", tabBarIcon: ({ color }) => <Store size={22} color={color} /> }} />
        <Tabs.Screen name="seller-analytics" options={{ title: "Финансы", tabBarIcon: ({ color }) => <TrendingUp size={22} color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: "Профиль", tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
      </Tabs>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: PRIMARY, tabBarInactiveTintColor: GRAY, tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.tabBorder }, tabBarLabelStyle: { fontSize: 10, color: GRAY } }}>
      <Tabs.Screen name="index" options={{ title: "Главная", tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="catalog" options={{ title: "Каталог", tabBarIcon: ({ color }) => <LayoutGrid size={22} color={color} /> }} />
      <Tabs.Screen name="cart" options={{ title: "Корзина", tabBarIcon: ({ color }) => <View className="relative"><ShoppingCart size={22} color={color} /><Badge count={cartCount} /></View> }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль", tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
      <Tabs.Screen name="admin-tab" options={{ href: null }} />
      <Tabs.Screen name="seller-products" options={{ href: null }} />
      <Tabs.Screen name="seller-orders" options={{ href: null }} />
      <Tabs.Screen name="seller-analytics" options={{ href: null }} />
      <Tabs.Screen name="seller-shop" options={{ href: null }} />
      <Tabs.Screen name="seller-stats" options={{ href: null }} />
    </Tabs>
  );
}
