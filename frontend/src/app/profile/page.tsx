"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User as UserIcon, Package, Heart, LogOut, Check,
  Shield, Store, ClipboardList, ChevronRight, TrendingUp,
  X, LogIn, ShoppingBag, Clock, RotateCcw, CreditCard,
  Briefcase, MapPin, Bell, Truck, RefreshCw
} from "lucide-react";
import Image from "next/image";
import api, { Order, Product } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает", confirmed: "Подтверждён", processing: "В обработке",
  shipped: "Отправлен", delivered: "Доставлен", cancelled: "Отменён",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-600 bg-yellow-50",
  confirmed: "text-blue-600 bg-blue-50",
  processing: "text-blue-600 bg-blue-50",
  shipped: "text-indigo-600 bg-indigo-50",
  delivered: "text-green-600 bg-green-50",
  cancelled: "text-red-500 bg-red-50",
};

export default function ProfilePage() {
  const { user, setAuth, logout } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({ full_name: "" });
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [application, setApplication] = useState<{ status: string; shop_name: string } | null>(null);
  const isSeller = user?.role === "seller" || user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    setForm({ full_name: user.full_name || "" });
    if (isSeller) {
      api.get<Product[]>("/seller/products").then((r) => setSellerProducts(r.data)).catch(() => {});
      api.get<Order[]>("/seller/orders").then((r) => setSellerOrders(r.data)).catch(() => {});
    } else {
      api.get<Order[]>("/orders").then((r) => setOrders(r.data)).catch(() => {});
      api.get("/seller-applications/my").then((r) => setApplication(r.data)).catch(() => {});
    }
  }, [user]);

  if (!user) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-20 gap-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
        <UserIcon size={32} className="text-gray-300" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-800">Войдите в аккаунт</p>
        <p className="text-sm text-gray-400 mt-1">Чтобы видеть заказы и настройки</p>
      </div>
      <Link href="/auth/login" className="bg-primary text-white font-semibold px-10 py-3.5 rounded-2xl flex items-center gap-2">
        <LogIn size={16} /> Войти
      </Link>
    </div>
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch("/users/me", form);
      setAuth(res.data, localStorage.getItem("token")!);
      setEditOpen(false);
      toast.success("Профиль обновлён");
    } catch {
      toast.error("Ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  };

  // ===== SELLER PROFILE =====
  if (isSeller) {
    const activeProducts = sellerProducts.filter((p) => p.is_active).length;
    const pendingOrders = sellerOrders.filter((o) => o.status === "pending").length;
    const totalRevenue = sellerOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total_price, 0);

    return (
      <div className="bg-gray-50 min-h-screen pb-24">
        <div className="bg-white px-4 pt-6 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-xl font-bold shadow-sm">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">{user.full_name || user.username}</h1>
              <p className="text-sm text-gray-400 truncate mt-0.5">{user.email}</p>
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">Продавец</span>
          </div>

          <div className="grid grid-cols-3 gap-0 mt-5 pt-4 border-t border-gray-50">
            {[
              { label: "Товаров", value: sellerProducts.length },
              { label: "Активных", value: activeProducts },
              { label: "Заказов", value: pendingOrders },
            ].map(({ label, value }, i) => (
              <div key={label} className={`text-center ${i > 0 ? "border-l border-gray-100" : ""}`}>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div className="bg-white rounded-2xl overflow-hidden">
            {[
              { href: "/seller/products", icon: Package, label: "Мои товары", sub: `${sellerProducts.length} товаров` },
              { href: "/seller/products/new", icon: Store, label: "Добавить товар", sub: "Новый товар в каталог" },
              { href: "/seller/orders", icon: ClipboardList, label: "Заказы покупателей", sub: pendingOrders > 0 ? `${pendingOrders} новых` : "Все заказы", badge: pendingOrders },
              { href: "/seller/analytics", icon: TrendingUp, label: "Аналитика и баланс", sub: `${totalRevenue.toLocaleString()} сом. выручки` },
              ...(user.role === "admin" ? [{ href: "/admin", icon: Shield, label: "Администратор", sub: "Управление платформой" }] : []),
              { href: "/seller/shop", icon: Store, label: "Оформление магазина", sub: "Баннер, логотип, описание" },
            ].map(({ href, icon: Icon, label, sub, badge }: any) => (
              <Link key={href} href={href} className="flex items-center gap-3.5 px-4 py-4 border-b border-gray-50 last:border-0 active:bg-gray-50">
                <Icon size={19} className="text-gray-500 shrink-0" strokeWidth={1.7} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
                {badge > 0 && <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>}
                <ChevronRight size={15} className="text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>

          <button
            onClick={() => { logout(); router.push("/auth/login"); }}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-500 bg-white border border-red-100 rounded-2xl py-4 font-semibold"
          >
            <LogOut size={16} /> Выйти из аккаунта
          </button>
        </div>
      </div>
    );
  }

  // ===== BUYER PROFILE =====
  const lastOrder = orders[0];
  const activeOrdersCount = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const orderStages = [
    { icon: Package, label: "В обработке", status: ["pending", "confirmed", "processing"], filter: "active" },
    { icon: Truck, label: "В пути", status: ["shipped"], filter: "shipped" },
    { icon: Check, label: "Получены", status: ["delivered"], filter: "delivered" },
    { icon: RefreshCw, label: "Возвраты", status: ["cancelled"], filter: "cancelled" },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-24">

      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">Профиль</h1>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {user.full_name ? (
              <span className="text-primary text-2xl font-bold">{user.full_name[0].toUpperCase()}</span>
            ) : (
              <UserIcon size={28} className="text-primary/50" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 leading-snug">
              {user.full_name || "Имя не указано"}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{user.phone || user.email || ""}</p>
          </div>
        </div>
      </div>

      {/* Order stages quick access */}
      <div className="bg-white mt-2 px-4 py-4 border-y border-gray-100">
        <div className="flex justify-between">
          {orderStages.map(({ icon: Icon, label, status, filter }) => {
            const count = orders.filter((o) => status.includes(o.status)).length;
            return (
              <Link key={label} href={`/orders?filter=${filter}`} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="relative">
                  <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon size={18} className="text-gray-500" strokeWidth={1.7} />
                  </div>
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Last order */}
      {lastOrder && (
        <Link href="/orders" className="block bg-white mt-2 px-4 py-4 border-y border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">Последний заказ</p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[lastOrder.status]}`}>
              {STATUS_LABELS[lastOrder.status]}
            </span>
          </div>
          <div className="flex gap-2">
            {lastOrder.items.slice(0, 3).map((item) => {
              const img = item.product.images?.find((i) => i.is_main) || item.product.images?.[0];
              return (
                <div key={item.id} className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {img ? (
                    <Image src={`http://192.168.1.45:8000${img.url}`} alt="" width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                  )}
                </div>
              );
            })}
            {lastOrder.items.length > 3 && (
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-gray-400">+{lastOrder.items.length - 3}</span>
              </div>
            )}
            <div className="flex-1 flex flex-col justify-center pl-1">
              <p className="text-xs text-gray-400">Заказ #{lastOrder.id}</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{lastOrder.total_price.toLocaleString()} сом.</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 self-center" />
          </div>
        </Link>
      )}

      <div className="p-3 space-y-2 mt-1">

        {/* Покупки и возврат */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <Row href="/orders" icon={Package} label="Мои заказы" badge={activeOrdersCount} />
          <Row href="/purchases" icon={ShoppingBag} label="Покупки" />
          <Row href="/waitlist" icon={Clock} label="Лист ожидания" />
          <Row href="/returns" icon={RotateCcw} label="Возврат товара" />
        </div>

        {/* Аккаунт */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <Row href="/favorites" icon={Heart} label="Избранное" />
          <Row href="/payment" icon={CreditCard} label="Способ оплаты" />
          <RowBtn icon={UserIcon} label="Личные данные" onClick={() => setEditOpen(true)} />
          <Row href="#" icon={Bell} label="Уведомления" />
        </div>

        {/* О компании */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <Row href="/careers" icon={Briefcase} label="Вакансии в AZA Market" />
          <Row href="/pickup-point" icon={MapPin} label="Открыть пункт выдачи" />
          {!application && (
            <Row href="/become-seller" icon={Store} label="Стать продавцом" />
          )}
          {application?.status === "pending" && (
            <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-gray-50 last:border-0">
              <Store size={18} className="text-yellow-500 shrink-0" strokeWidth={1.7} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Заявка на рассмотрении</p>
                <p className="text-xs text-gray-400 mt-0.5">Мы уведомим вас о решении</p>
              </div>
              <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">Ожидает</span>
            </div>
          )}
          {application?.status === "rejected" && (
            <Row href="/become-seller" icon={Store} label="Заявка отклонена — подать снова" />
          )}
        </div>

        <p className="text-center text-xs text-gray-300 py-1">AZA Market · Версия 1.0.0</p>

        <button
          onClick={() => { logout(); router.push("/auth/login"); }}
          className="w-full flex items-center justify-center gap-2 text-sm text-red-400 bg-white rounded-2xl py-4 font-semibold border border-gray-100"
        >
          <LogOut size={15} /> Выйти из аккаунта
        </button>
      </div>

      {/* Edit sheet */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setEditOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Личные данные</h2>
              <button onClick={() => setEditOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Имя</label>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
                  placeholder="Ваше имя" autoFocus />
              </div>
              {user.phone && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Номер телефона</label>
                  <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 flex items-center justify-between">
                    <span>{user.phone}</span>
                    <span className="text-xs text-gray-400">Нельзя изменить</span>
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-primary text-white font-semibold py-4 rounded-2xl text-sm mt-1">
                {loading ? "Сохраняем..." : "Сохранить"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-3.5 border-b border-gray-50 last:border-0 active:bg-gray-50">
      <Icon size={18} className="text-gray-400 shrink-0" strokeWidth={1.7} />
      <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
      {badge ? <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span> : null}
      <ChevronRight size={15} className="text-gray-300" />
    </Link>
  );
}

function RowBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-gray-50 last:border-0 active:bg-gray-50">
      <Icon size={18} className="text-gray-400 shrink-0" strokeWidth={1.7} />
      <span className="flex-1 text-sm font-medium text-gray-800 text-left">{label}</span>
      <ChevronRight size={15} className="text-gray-300" />
    </button>
  );
}
