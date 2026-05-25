"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Home, LayoutGrid, ShoppingCart, User, Package, ClipboardList, TrendingUp, Shield, Users } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useNotificationStore } from "@/store/notifications";

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { count } = useCartStore();
  const { user } = useAuthStore();
  const { newOrders, fetch: fetchNotifications } = useNotificationStore();

  const isAdmin = user?.role === "admin";
  const isSeller = user?.role === "seller";

  useEffect(() => {
    if (!isSeller && !isAdmin) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isSeller, isAdmin]);

  const buyerTabs = [
    { href: "/", icon: Home, label: "Главная" },
    { href: "/catalog", icon: LayoutGrid, label: "Каталог" },
    { href: "/cart", icon: ShoppingCart, label: "Корзина", badge: count() },
    { href: "/profile", icon: User, label: "Профиль" },
  ];

  const sellerTabs = [
    { href: "/seller/products", icon: Package, label: "Товары" },
    { href: "/seller/orders", icon: ClipboardList, label: "Заказы", badge: newOrders },
    { href: "/seller/analytics", icon: TrendingUp, label: "Аналитика" },
    { href: "/profile", icon: User, label: "Профиль" },
  ];

  const adminTabs = [
    { href: "/admin", icon: Shield, label: "Панель", tab: null },
    { href: "/admin?tab=users", icon: Users, label: "Польз.", tab: "users" },
    { href: "/admin?tab=orders", icon: ClipboardList, label: "Заказы", tab: "orders" },
    { href: "/profile", icon: User, label: "Профиль", tab: undefined },
  ];

  const tabs = isAdmin ? adminTabs : isSeller ? sellerTabs : buyerTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex">
        {tabs.map(({ href, icon: Icon, label, badge, tab }: any) => {
          const path = href.split("?")[0];
          const active = tab !== undefined
            ? pathname === path && currentTab === tab
            : pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${active ? "text-primary" : "text-gray-400"}`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
