import { Tabs } from "expo-router";
import { Home, Menu, ShoppingCart, User } from "lucide-react-native";
import { View, Text, Platform, Pressable } from "react-native";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useThemeColors, useIsDark } from "@/lib/theme";

const PRIMARY = "#8B5CF6";

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={{ position: "absolute", top: -3, right: -6, backgroundColor: "#ef4444", borderRadius: 8, minWidth: 15, height: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 }}>
      <Text style={{ color: "#fff", fontSize: 8, fontWeight: "700" }}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

function TabIcon({ icon, focused, count }: { icon: (color: string) => React.ReactNode; focused: boolean; count?: number }) {
  const isDark = useIsDark();
  const color = focused ? PRIMARY : (isDark ? "#475569" : "#9ca3af");
  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginTop: 6 }}>
      <View style={{
        width: 48, height: 32, borderRadius: 16,
        backgroundColor: "transparent",
        alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {icon(color)}
        {!!count && <Badge count={count} />}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.count)();
  const c = useThemeColors();
  const isDark = useIsDark();

  const role = user?.role ?? "guest";
  const isGuest = role === "guest";
  const isBuyer = role === "buyer";

  const tabOptions = {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarActiveTintColor: PRIMARY,
    tabBarInactiveTintColor: isDark ? "#475569" : "#9ca3af",
    tabBarActiveBackgroundColor: "transparent",
    tabBarInactiveBackgroundColor: "transparent",
    tabBarPressColor: "transparent",
    tabBarPressOpacity: 1,
    tabBarButton: (props: any) => (
      <Pressable {...props} android_ripple={null} style={[props.style, { backgroundColor: "transparent" }]} />
    ),
    tabBarStyle: {
      position: "absolute" as const,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      height: Platform.OS === "ios" ? 78 : 60,
      bottom: 0,
      left: 0,
      right: 0,
    },
  };

  return (
    <Tabs screenOptions={tabOptions}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={(c) => <Home size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={(c) => <Menu size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} count={cartCount} icon={(c) => <ShoppingCart size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} />
          ),
        }}
      />
      {/* Hide seller/admin screens — they live in separate apps */}
      <Tabs.Screen name="seller-products"  options={{ href: null }} />
      <Tabs.Screen name="seller-orders"    options={{ href: null }} />
      <Tabs.Screen name="seller-stats"     options={{ href: null }} />
      <Tabs.Screen name="seller-shop"      options={{ href: null }} />
      <Tabs.Screen name="seller-analytics" options={{ href: null }} />
      <Tabs.Screen name="admin-tab"        options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={(c) => <User size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} />
          ),
        }}
      />
    </Tabs>
  );
}
