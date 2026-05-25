"use client";
import "./globals.css";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavoritesStore } from "@/store/favorites";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

const queryClient = new QueryClient();

function AppShell({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const fetchCart = useCartStore((s) => s.fetch);
  const clearCart = useCartStore((s) => s.clearLocal);
  const fetchFavorites = useFavoritesStore((s) => s.fetch);
  const clearFavorites = useFavoritesStore((s) => s.clear);
  const pathname = usePathname();
  const prevUserId = useRef<number | null>(null);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (user) {
      if (prevUserId.current !== user.id) {
        fetchCart();
        fetchFavorites();
      }
      prevUserId.current = user.id;
    } else {
      if (prevUserId.current !== null) {
        clearCart();
        clearFavorites();
      }
      prevUserId.current = null;
    }
  }, [user?.id]);

  const noHeaderPaths = ["/catalog", "/cart", "/profile", "/purchases", "/waitlist", "/returns", "/payment", "/careers", "/pickup-point", "/orders", "/favorites", "/become-seller", "/checkout"];
  const hideHeader = /^\/products\/\d+/.test(pathname) || noHeaderPaths.includes(pathname) || pathname.startsWith("/seller") || pathname.startsWith("/admin") || pathname.startsWith("/catalog/") || pathname.startsWith("/shop/");

  return (
    <>
      {!hideHeader && <Header />}
      <main className="min-h-screen pb-16 md:pb-0">{children}</main>
      <BottomNav />
      <Toaster position="top-right" />
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AZA Market" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AppShell>{children}</AppShell>
        </QueryClientProvider>
      </body>
    </html>
  );
}
