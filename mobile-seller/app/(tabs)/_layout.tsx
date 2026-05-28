import { Tabs } from "expo-router";
import { Package, ClipboardList, BarChart2, Store, TrendingUp, User, Shield } from "lucide-react-native";
import { View, Platform, Pressable } from "react-native";
import { useAuthStore } from "@/store/auth";
import { useThemeColors, useIsDark } from "@/lib/theme";

const PRIMARY = "#8B5CF6";

function TabIcon({ icon, focused }: { icon: (color: string) => React.ReactNode; focused: boolean }) {
  const isDark = useIsDark();
  const color = focused ? PRIMARY : (isDark ? "#475569" : "#9ca3af");
  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginTop: 6 }}>
      <View style={{ width: 48, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
        {icon(color)}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const isDark = useIsDark();
  const user = useAuthStore((s) => s.user);
  const isSeller = user?.role === "seller";
  const isAdmin  = user?.role === "admin";

  const show = (condition: boolean) => condition ? undefined : null;

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
      bottom: 0, left: 0, right: 0,
    },
  };

  return (
    <Tabs screenOptions={tabOptions}>
      {/* Seller tabs */}
      <Tabs.Screen name="seller-products"
        options={{ href: show(isSeller), tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <Package size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
      />
      <Tabs.Screen name="seller-orders"
        options={{ href: show(isSeller), tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <ClipboardList size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
      />
      <Tabs.Screen name="seller-stats"
        options={{ href: show(isSeller), tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <BarChart2 size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
      />
      <Tabs.Screen name="seller-shop"
        options={{ href: show(isSeller), tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <Store size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
      />
      <Tabs.Screen name="seller-analytics"
        options={{ href: show(isSeller), tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <TrendingUp size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
      />

      {/* Admin tab */}
      <Tabs.Screen name="admin-tab"
        options={{ href: show(isAdmin), tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <Shield size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
      />

      {/* Profile — always visible */}
      <Tabs.Screen name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <User size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
      />

      {/* Hide buyer screens */}
      <Tabs.Screen name="index"   options={{ href: null }} />
      <Tabs.Screen name="catalog" options={{ href: null }} />
      <Tabs.Screen name="cart"    options={{ href: null }} />
    </Tabs>
  );
}
