import "../global.css";
import { useEffect, useState } from "react";
import { Easing } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from "@sentry/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { OfflineBanner } from "@/components/OfflineBanner";
import { pingServer } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import { useThemeStore } from "@/store/theme";
import { useIsDark } from "@/lib/theme";
import SplashAnim from "@/components/SplashAnim";

Sentry.init({
  dsn: "https://ca06cef015beee42cef9a886378d9f9e@o4511453703700480.ingest.us.sentry.io/4511453707436032",
  tracesSampleRate: 0.2,
  enabled: !__DEV__,
});

export default Sentry.wrap(function RootLayout() {
  const router = useRouter();
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const fetchCart = useCartStore((s) => s.fetch);
  const clearCart = useCartStore((s) => s.clearLocal);
  const hydrateFavs = useFavoritesStore((s) => s.hydrate);
  const fetchFavs = useFavoritesStore((s) => s.fetch);
  const clearFavs = useFavoritesStore((s) => s.clear);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const isDark = useIsDark();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    pingServer();
    hydrateTheme();
    hydrateFavs();
    init();
  }, []);

  useEffect(() => {
    if (user) { fetchCart(); fetchFavs(); }
    else { clearCart(); clearFavs(); }
  }, [user?.id]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f9fafb" }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: isDark ? "#0f172a" : "#f9fafb" },
        transitionSpec: {
          open:  { animation: "timing", config: { duration: 280, easing: Easing.out(Easing.poly(5)) } },
          close: { animation: "timing", config: { duration: 220, easing: Easing.in(Easing.poly(4)) } },
        },
      }}>
<Stack.Screen name="(tabs)" options={{ animation: "none" }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="checkout" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="orders" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="shop/[id]" />
        <Stack.Screen name="seller" />
        <Stack.Screen name="become-seller" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="chats" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="search" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="my-reviews" />
        <Stack.Screen name="payment-cards" />
        <Stack.Screen name="write-review/[id]" />
        <Stack.Screen name="reviews/[id]" />
        <Stack.Screen name="waitlist" />
        <Stack.Screen name="privacy" />
      </Stack>
      <OfflineBanner />
      <Toast />
      {!splashDone && <SplashAnim onFinish={() => setSplashDone(true)} />}
    </GestureHandlerRootView>
  );
});
