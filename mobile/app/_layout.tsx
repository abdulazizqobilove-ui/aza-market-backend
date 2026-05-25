import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const fetchCart = useCartStore((s) => s.fetch);
  const clearCart = useCartStore((s) => s.clearLocal);
  const fetchFavs = useFavoritesStore((s) => s.fetch);
  const clearFavs = useFavoritesStore((s) => s.clear);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (user) { fetchCart(); fetchFavs(); }
    else { clearCart(); clearFavs(); }
  }, [user?.id]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="products/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="checkout" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="orders" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="favorites" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="shop/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="seller" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="become-seller" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
      </Stack>
      <Toast />
    </>
  );
}
