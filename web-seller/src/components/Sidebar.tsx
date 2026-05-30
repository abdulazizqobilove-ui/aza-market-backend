"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, BarChart2,
  Settings, LogOut, ShoppingBag as Logo, ChevronRight,
  Bell, BadgeCheck, Wallet,
} from "lucide-react";
import { logout, getUser } from "@/lib/api";
import { clsx } from "clsx";

const NAV = [
  { href: "/overview",  icon: LayoutDashboard, label: "Обзор" },
  { href: "/products",  icon: Package,          label: "Товары" },
  { href: "/orders",    icon: ShoppingBag,       label: "Заказы" },
  { href: "/analytics", icon: BarChart2,         label: "Аналитика" },
  { href: "/finances",  icon: Wallet,            label: "Финансы" },
  { href: "/settings",  icon: Settings,          label: "Настройки" },
];

export default function Sidebar() {
  const path = usePathname();
  const user = getUser();

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Logo className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">AZA Partners</p>
            <p className="text-xs text-gray-400">Кабинет продавца</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={clsx("w-5 h-5 flex-shrink-0", active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
              {label}
              {active && <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition group cursor-default">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-blue-700">
              {(user?.full_name || user?.username || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.shop_name || user?.full_name || user?.username}</p>
              {user?.is_verified && <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            </div>
            <p className="text-xs text-teal-600 font-semibold truncate">
              {(user?.balance ?? 0).toLocaleString("ru-RU")} сом.
            </p>
          </div>
          <button onClick={logout} title="Выйти" className="opacity-0 group-hover:opacity-100 transition">
            <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500 transition" />
          </button>
        </div>
      </div>
    </aside>
  );
}
