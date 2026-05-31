import { Tabs, usePathname, useRouter } from "expo-router";
import { Home, Menu, ShoppingCart, User, Heart } from "lucide-react-native";
import { View, Text, Platform, Pressable, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from "react-native-reanimated";
import { useRef, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useThemeColors, useIsDark } from "@/lib/theme";

const { width } = Dimensions.get("window");
const PRIMARY = "#2563EB";

// Tab order for swipe
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
  const translateX = useSharedValue(0);
  const navigated = useSharedValue(false);
  const idxRef = useRef(0);

  const currentIndex = TAB_ROUTES.findIndex(
    (r) => r === pathname || (r !== "/" && pathname.startsWith(r))
  );
  idxRef.current = currentIndex < 0 ? 0 : currentIndex;

  // Called on JS thread: animate incoming screen in from the correct side
  const doNavigate = useCallback((route: string, fromRight: boolean) => {
    router.navigate(route as any);
    // New screen renders with current translateX; reposition to incoming side then spring in
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
      const isLast  = idx === TAB_ROUTES.length - 1;

      // Rubber-band resistance at first/last tab
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

      const goNext = (tx < -60 || vx < -600) && idx < TAB_ROUTES.length - 1;
      const goPrev = (tx >  60 || vx >  600) && idx > 0;

      if (goNext) {
        navigated.value = true;
        // Slide current screen out to the left, then navigate + slide new screen in from right
        translateX.value = withSpring(-width, { damping: 28, stiffness: 380, mass: 0.8 }, () => {
          runOnJS(doNavigate)(TAB_ROUTES[idx + 1], true);
          navigated.value = false;
        });
      } else if (goPrev) {
        navigated.value = true;
        // Slide current screen out to the right, then navigate + slide new screen in from left
        translateX.value = withSpring(width, { damping: 28, stiffness: 380, mass: 0.8 }, () => {
          runOnJS(doNavigate)(TAB_ROUTES[idx - 1], false);
          navigated.value = false;
        });
      } else {
        // Bounce back
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
