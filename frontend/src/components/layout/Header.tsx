"use client";
import { useRouter } from "next/navigation";
import { Search, MapPin, ChevronDown, Mic } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Store, User, LogOut, Heart, ShoppingCart, X, Menu } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuthStore();
  const { count, fetch } = useCartStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { if (user) fetch(); }, [user, fetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { router.push(`/?q=${encodeURIComponent(q.trim())}`); setMenuOpen(false); }
  };

  return (
    <>
      {/* ===== MOBILE HEADER ===== */}
      <header className="md:hidden bg-white sticky top-0 z-50 shadow-sm">
        {/* Row 1: Address + icons */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button className="flex items-center gap-1 text-gray-800">
            <MapPin size={15} className="text-primary shrink-0" />
            <span className="text-sm font-semibold">Выберите адрес</span>
            <ChevronDown size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Row 2: Search */}
        <form onSubmit={handleSearch} className="px-4 pb-3">
          <div className="flex items-center bg-gray-100 rounded-2xl px-4 py-2.5 gap-3">
            <Search size={17} className="text-gray-400 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск товаров..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
            />
            <Mic size={17} className="text-gray-400 shrink-0" />
          </div>
        </form>

        {/* Mobile slide menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
            <div className="relative bg-white w-72 h-full ml-auto shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <p className="font-bold text-lg">Меню</p>
                <button onClick={() => setMenuOpen(false)}><X size={22} className="text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl mb-3">
                      <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{user.full_name || user.username}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    {user.role === "admin" && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-sm">
                        <Shield size={18} className="text-primary" /> Панель администратора
                      </Link>
                    )}
                    {(user.role === "seller" || user.role === "admin") && (
                      <Link href="/seller/products" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-sm">
                        <Store size={18} className="text-primary" /> Кабинет продавца
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-sm">
                      <User size={18} className="text-primary" /> Мой профиль
                    </Link>
                    <Link href="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-sm">
                      <Heart size={18} className="text-red-500" /> Избранное
                    </Link>
                    <Link href="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-sm">
                      <ShoppingCart size={18} className="text-primary" /> Мои заказы
                    </Link>
                    <button onClick={() => { logout(); router.push("/"); setMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 text-sm w-full">
                      <LogOut size={18} /> Выйти
                    </button>
                  </>
                ) : (
                  <div className="space-y-2 p-2">
                    <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="btn-outline w-full text-center block py-3">Войти</Link>
                    <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="btn-primary w-full text-center block py-3">Зарегистрироваться</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ===== DESKTOP HEADER ===== */}
      <header className="hidden md:block bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-sm">М</div>
              <span className="font-bold text-gray-900 text-lg">Маркет</span>
            </Link>
            <form onSubmit={handleSearch} className="flex-1 flex max-w-xl">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск товаров..." className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all border-2 border-transparent focus:border-primary/30" />
              </div>
              <button type="submit" className="ml-2 btn-primary py-2 px-4 text-sm">Найти</button>
            </form>
            <div className="flex items-center gap-1 ml-auto">
              {user ? (
                <>
                  {user.role === "admin" && <Link href="/admin" className="flex items-center gap-1.5 btn-ghost text-sm text-gray-600"><Shield size={16} className="text-primary" /> Админ</Link>}
                  {(user.role === "seller" || user.role === "admin") && <Link href="/seller/products" className="flex items-center gap-1.5 btn-ghost text-sm text-gray-600"><Store size={16} /> Кабинет</Link>}
                  <Link href="/favorites" className="p-2 btn-ghost text-gray-600 hover:text-red-500"><Heart size={20} /></Link>
                  <Link href="/profile" className="flex items-center gap-2 btn-ghost text-sm text-gray-700 font-medium">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{user.username[0].toUpperCase()}</div>
                    <span className="hidden lg:block">{user.username}</span>
                  </Link>
                  <button onClick={() => { logout(); router.push("/"); }} className="p-2 btn-ghost text-gray-500 hover:text-red-500"><LogOut size={18} /></button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login" className="btn-ghost text-sm text-gray-600">Войти</Link>
                  <Link href="/auth/register" className="btn-primary text-sm py-2">Регистрация</Link>
                </div>
              )}
              <Link href="/cart" className="relative p-2 btn-ghost text-gray-600 hover:text-primary">
                <ShoppingCart size={22} />
                {count() > 0 && <span className="absolute top-0.5 right-0.5 bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">{count()}</span>}
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
