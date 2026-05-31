import { Tabs } from "expo-router";
import { Package, ClipboardList, BarChart2, Store, TrendingUp, User, Shield } from "lucide-react-native";
import { View, Platform, Pressable, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from "react-native-reanimated";
import { useRef, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useThemeColors, useIsDark } from "@/lib/theme";
import { useRouter, usePathname } from "expo-router";

const { width } = Dimensions.get("window");
const PRIMARY = "#2563EB";

const SELLER_ROUTES = [
  "/(tabs)/seller-products",
  "/(tabs)/seller-orders",
  "/(tabs)/seller-stats",
  "/(tabs)/seller-shop",
  "/(tabs)/seller-analytics",
  "/(tabs)/profile",
] as const;

const ADMIN_ROUTES = [
  "/(tabs)/admin-tab",
  "/(tabs)/profile",
] as const;

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

function SwipeTabsWrapper({
  children,
  routes,
}: {
  children: React.ReactNode;
  routes: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const translateX = useSharedValue(0);
  const navigated = useSharedValue(false);
  const idxRef = useRef(0);

  const currentIndex = routes.findIndex((r) => pathname.startsWith(r.replace("/(tabs)", "")));
  idxRef.current = currentIndex < 0 ? 0 : currentIndex;

  const doNavigate = useCallback((route: string, fromRight: boolean) => {
    router.navigate(route as any);
    translateX.value = fromRight ? width : -width;
    translateX.value = withSpring(0, { damping: 22, stiffness: 230, mass: 0.85 });
  }, []);

  const gesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      if (navigated.value) return;
      const idx = idxRef.current;
      const tx = e.translationX;
      const isFirst = idx === 0;
      const isLast  = idx === routes.length - 1;

      if ((isFirst && tx > 0) || (isLast && tx < 0)) {
        translateX.value = tx * 0.12;
        return;
      }
      translateX.value = tx;
    })
    .onEnd((e) => {
      const idx = idxRef.current;
      const tx  = e.translationX;
      const vx  = e.velocityX;

      const goNext = (tx < -60 || vx < -600) && idx < routes.length - 1;
      const goPrev = (tx >  60 || vx >  600) && idx > 0;

      if (goNext) {
        navigated.value = true;
        translateX.value = withSpring(-width, { damping: 28, stiffness: 380, mass: 0.8 }, () => {
          runOnJS(doNavigate)(routes[idx + 1], true);
          navigated.value = false;
        });
      } else if (goPrev) {
        navigated.value = true;
        translateX.value = withSpring(width, { damping: 28, stiffness: 380, mass: 0.8 }, () => {
          runOnJS(doNavigate)(routes[idx - 1], false);
          navigated.value = false;
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ flex: 1 }, animStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
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

  const activeRoutes = isAdmin ? ADMIN_ROUTES : SELLER_ROUTES;

  return (
    <SwipeTabsWrapper routes={activeRoutes}>
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
    </SwipeTabsWrapper>
  );
}
