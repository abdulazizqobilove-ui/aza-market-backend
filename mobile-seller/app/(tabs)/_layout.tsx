import { Tabs, usePathname, useRouter } from "expo-router";
import { Package, ClipboardList, BarChart2, Store, TrendingUp, User, Shield } from "lucide-react-native";
import { View, Platform, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { useIsDark } from "@/lib/theme";

const PRIMARY = "#2563EB";

const SELLER_ROUTES = [
  "/seller-products", "/seller-orders", "/seller-stats",
  "/seller-shop", "/seller-analytics", "/profile",
] as const;

const ADMIN_ROUTES = ["/admin-tab", "/profile"] as const;

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

function SwipeTabsWrapper({ children, routes }: { children: React.ReactNode; routes: readonly string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const idxRef = useRef(0);

  const currentIndex = routes.findIndex((r) => pathname === r || pathname.startsWith(r + "/"));
  idxRef.current = currentIndex < 0 ? 0 : currentIndex;

  const navigate = (route: string) => router.navigate(route as any);

  const gesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      const idx = idxRef.current;
      const goNext = (e.translationX < -60 || e.velocityX < -500) && idx < routes.length - 1;
      const goPrev = (e.translationX > 60  || e.velocityX >  500) && idx > 0;
      if (goNext) runOnJS(navigate)(routes[idx + 1]);
      else if (goPrev) runOnJS(navigate)(routes[idx - 1]);
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </GestureDetector>
  );
}

export default function TabsLayout() {
  const isDark = useIsDark();
  const user = useAuthStore((s) => s.user);
  const isSeller = user?.role === "seller";
  const isAdmin  = user?.role === "admin";
  const show = (c: boolean) => c ? undefined : null;

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

  const activeRoutes = isAdmin ? ADMIN_ROUTES : SELLER_ROUTES;

  return (
    <SwipeTabsWrapper routes={activeRoutes}>
      <Tabs screenOptions={tabOptions}>
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
        <Tabs.Screen name="admin-tab"
          options={{ href: show(isAdmin), tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <Shield size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
        />
        <Tabs.Screen name="profile"
          options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(c) => <User size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} /> }}
        />
        <Tabs.Screen name="index"   options={{ href: null }} />
        <Tabs.Screen name="catalog" options={{ href: null }} />
        <Tabs.Screen name="cart"    options={{ href: null }} />
      </Tabs>
    </SwipeTabsWrapper>
  );
}
