import { Tabs, usePathname, useRouter } from "expo-router";
import { Home, Menu, ShoppingCart, User, Heart } from "lucide-react-native";
import { View, Text, Platform, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useThemeColors, useIsDark } from "@/lib/theme";

const PRIMARY = "#2563EB";

// Порядок табов для свайпа
const TAB_ROUTES = ["/", "/catalog", "/cart", "/favorites", "/profile"] as const;

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
      <View style={{ width: 48, height: 32, borderRadius: 16, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {icon(color)}
        {!!count && <Badge count={count} />}
      </View>
    </View>
  );
}

function SwipeTabsWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const currentIndex = TAB_ROUTES.findIndex(
    (r) => r === pathname || (r !== "/" && pathname.startsWith(r))
  );

  const navigate = (route: string) => {
    router.navigate(route as any);
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-30, 30])   // нужно 30px горизонтально чтобы активировать
    .failOffsetY([-20, 20])     // если двигается вертикально — не перехватывать
    .onEnd((e) => {
      const isSwipeLeft  = e.translationX < -60 || e.velocityX < -500;
      const isSwipeRight = e.translationX >  60 || e.velocityX >  500;

      if (isSwipeLeft && currentIndex < TAB_ROUTES.length - 1) {
        runOnJS(navigate)(TAB_ROUTES[currentIndex + 1]);
      } else if (isSwipeRight && currentIndex > 0) {
        runOnJS(navigate)(TAB_ROUTES[currentIndex - 1]);
      }
    });

  return (
    <GestureDetector gesture={swipe}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </GestureDetector>
  );
}

export default function TabsLayout() {
  const cartCount = useCartStore((s) => s.count)();
  const isDark = useIsDark();

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
    sceneStyle: { flex: 1 },
  };

  return (
    <SwipeTabsWrapper>
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
        <Tabs.Screen name="seller-products"  options={{ href: null }} />
        <Tabs.Screen name="seller-orders"    options={{ href: null }} />
        <Tabs.Screen name="seller-stats"     options={{ href: null }} />
        <Tabs.Screen name="seller-shop"      options={{ href: null }} />
        <Tabs.Screen name="seller-analytics" options={{ href: null }} />
        <Tabs.Screen
          name="favorites"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={(c) => <Heart size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} fill={focused ? c : "none"} />} />
            ),
          }}
        />
        <Tabs.Screen name="admin-tab" options={{ href: null }} />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={(c) => <User size={24} color={c} strokeWidth={focused ? 2.5 : 1.8} />} />
            ),
          }}
        />
      </Tabs>
    </SwipeTabsWrapper>
  );
}
