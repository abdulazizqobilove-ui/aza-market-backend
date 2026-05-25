"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Users, Package, ShoppingBag, TrendingUp, Shield,
  ChevronDown, ChevronUp, Clock, CheckCircle, XCircle,
  Wallet, Store, BarChart2, ClipboardList
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { User, Order, Payout } from "@/lib/api";
import toast from "react-hot-toast";

interface Stats { users: number; products: number; orders: number; sellers: number; }
interface SellerApp { id: number; user_id: number; shop_name: string; description?: string; status: string; admin_comment?: string; created_at: string; username?: string; phone?: string; }

const ROLES = ["buyer", "seller", "admin"];
const ROLE_LABELS: Record<string, string> = { buyer: "Покупатель", seller: "Продавец", admin: "Админ" };
const ROLE_COLORS: Record<string, string> = { buyer: "bg-gray-100 text-gray-600", seller: "bg-blue-100 text-blue-700", admin: "bg-purple-100 text-purple-700" };

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает", confirmed: "Подтверждён", processing: "В обработке",
  shipped: "Отправлен", delivered: "Доставлен", cancelled: "Отменён",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const PAYOUT_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};
const PAYOUT_LABELS: Record<string, string> = { pending: "Ожидает", approved: "Выплачено", rejected: "Отклонено" };

type TabKey = "stats" | "users" | "orders" | "payouts" | "applications";

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as TabKey | null;

  const [tab, setTab] = useState<TabKey>(urlTab || "stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [applications, setApplications] = useState<SellerApp[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState<Record<number, string>>({});
  const [appComment, setAppComment] = useState<Record<number, string>>({});

  useEffect(() => {
    if (urlTab && ["stats","users","orders","payouts","applications"].includes(urlTab)) setTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") { router.push("/"); return; }
    api.get<Stats>("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get<User[]>("/admin/users").then((r) => setUsers(r.data)).catch(() => {});
    api.get<Order[]>("/admin/orders").then((r) => setOrders(r.data)).catch(() => {});
    api.get<Payout[]>("/admin/payouts").then((r) => setPayouts(r.data)).catch(() => {});
    api.get<SellerApp[]>("/seller-applications").then((r) => setApplications(r.data)).catch(() => {});
  }, [user, router]);

  if (!user || user.role !== "admin") return null;

  const updateRole = async (userId: number, role: string) => {
    await api.patch(`/admin/users/${userId}/role`, { role });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as any } : u));
    toast.success("Роль обновлена");
  };

  const toggleActive = async (u: User) => {
    await api.patch(`/admin/users/${u.id}/active`, { is_active: !u.is_active });
    setUsers((prev) => prev.map((usr) => usr.id === u.id ? { ...usr, is_active: !u.is_active } : usr));
    toast.success(u.is_active ? "Заблокирован" : "Активирован");
  };

  const reviewPayout = async (payoutId: number, status: "approved" | "rejected") => {
    try {
      const comment = status === "rejected" ? (rejectComment[payoutId] || "") : undefined;
      await api.patch(`/admin/payouts/${payoutId}`, { status, comment });
      setPayouts((prev) => prev.map((p) => p.id === payoutId ? { ...p, status } : p));
      toast.success(status === "approved" ? "Выплата подтверждена" : "Отклонена");
    } catch (err: any) { toast.error(err.response?.data?.detail || "Ошибка"); }
  };

  const reviewApplication = async (appId: number, status: "approved" | "rejected") => {
    try {
      const comment = status === "rejected" ? (appComment[appId] || "") : undefined;
      const res = await api.patch(`/seller-applications/${appId}`, { status, admin_comment: comment });
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: res.data.status } : a));
      toast.success(status === "approved" ? "Заявка одобрена" : "Отклонена");
    } catch (err: any) { toast.error(err.response?.data?.detail || "Ошибка"); }
  };

  const pendingPayouts = payouts.filter((p) => p.status === "pending").length;
  const pendingApps = applications.filter((a) => a.status === "pending").length;

  const TABS: { key: TabKey; icon: any; label: string; badge?: number }[] = [
    { key: "stats", icon: BarChart2, label: "Обзор" },
    { key: "users", icon: Users, label: "Польз." },
    { key: "orders", icon: ClipboardList, label: "Заказы" },
    { key: "payouts", icon: Wallet, label: "Выплаты", badge: pendingPayouts },
    { key: "applications", icon: Store, label: "Заявки", badge: pendingApps },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-24">

      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-sm shadow-primary/30">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Панель администратора</h1>
            <p className="text-xs text-gray-400">AZA Market · управление</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-2 flex overflow-x-auto scrollbar-hide">
        {TABS.map(({ key, icon: Icon, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 min-w-[64px] flex flex-col items-center gap-1 py-3 px-2 relative transition-colors ${tab === key ? "text-primary" : "text-gray-400"}`}
          >
            <div className="relative">
              <Icon size={20} strokeWidth={tab === key ? 2.5 : 1.8} />
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
            {tab === key && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      <div className="px-3 pt-3 space-y-3">

        {/* ── STATS ── */}
        {tab === "stats" && stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Пользователи", value: stats.users, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Продавцы", value: stats.sellers, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
                { label: "Товары", value: stats.products, icon: Package, color: "text-purple-500", bg: "bg-purple-50" },
                { label: "Заказы", value: stats.orders, icon: ShoppingBag, color: "text-orange-500", bg: "bg-orange-50" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-4">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon size={18} className={color} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl overflow-hidden">
              <p className="text-sm font-bold text-gray-800 px-4 pt-4 pb-3">Последние заказы</p>
              {orders.slice(0, 5).map((order, i) => (
                <div key={order.id} className={`flex items-center justify-between px-4 py-3 ${i < 4 ? "border-b border-gray-50" : ""}`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Заказ #{order.id}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString("ru-RU")} · {order.delivery_city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{order.total_price.toLocaleString()} сом.</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.full_name || u.username}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{u.phone || u.email || "—"}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {u.is_active ? "Активен" : "Блок"}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <button
                    onClick={() => toggleActive(u)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${u.is_active ? "border-red-200 text-red-600 bg-red-50" : "border-green-200 text-green-600 bg-green-50"}`}
                  >
                    {u.is_active ? "Заблокировать" : "Разблокировать"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-800">Заказ #{order.id}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {new Date(order.created_at).toLocaleDateString("ru-RU")} · {order.delivery_city} · {order.items.length} поз.
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary shrink-0">{order.total_price.toLocaleString()} сом.</p>
                  {expandedOrder === order.id
                    ? <ChevronUp size={15} className="text-gray-300 shrink-0" />
                    : <ChevronDown size={15} className="text-gray-300 shrink-0" />}
                </button>
                {expandedOrder === order.id && (
                  <div className="border-t border-gray-50 px-4 pb-4 pt-3 bg-gray-50">
                    <p className="text-xs text-gray-400 mb-2">{order.delivery_address}, {order.delivery_city} · {order.contact_phone}</p>
                    <div className="space-y-1.5">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-700 line-clamp-1 flex-1 mr-2">{item.product.title} × {item.quantity}</span>
                          <span className="text-gray-500 shrink-0 font-medium">{(item.price * item.quantity).toLocaleString()} сом.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PAYOUTS ── */}
        {tab === "payouts" && (
          payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Wallet size={48} className="text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Заявок на вывод нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payouts.map((payout) => (
                <div key={payout.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${PAYOUT_COLORS[payout.status]}`}>
                        {payout.status === "pending" && <Clock size={18} />}
                        {payout.status === "approved" && <CheckCircle size={18} />}
                        {payout.status === "rejected" && <XCircle size={18} />}
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900">{payout.amount.toLocaleString()} сом.</p>
                        <p className="text-xs text-gray-400">{new Date(payout.created_at).toLocaleDateString("ru-RU")}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYOUT_COLORS[payout.status]}`}>
                      {PAYOUT_LABELS[payout.status]}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-400 mb-1">Реквизиты</p>
                    <p className="text-sm text-gray-700">{payout.bank_details}</p>
                  </div>
                  {payout.comment && <p className="text-xs text-gray-400 mb-3">Комментарий: {payout.comment}</p>}
                  {payout.status === "pending" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Причина отклонения (необязательно)"
                        value={rejectComment[payout.id] || ""}
                        onChange={(e) => setRejectComment((prev) => ({ ...prev, [payout.id]: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => reviewPayout(payout.id, "rejected")}
                          className="flex-1 py-2.5 text-sm font-semibold rounded-xl border-2 border-red-200 text-red-600 flex items-center justify-center gap-1.5">
                          <XCircle size={15} /> Отклонить
                        </button>
                        <button onClick={() => reviewPayout(payout.id, "approved")}
                          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-green-500 text-white flex items-center justify-center gap-1.5">
                          <CheckCircle size={15} /> Подтвердить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ── APPLICATIONS ── */}
        {tab === "applications" && (
          applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Store size={48} className="text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Заявок нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {applications.map((app) => (
                <div key={app.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Store size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{app.shop_name}</p>
                        <p className="text-xs text-gray-400">{app.username} · {app.phone}</p>
                        <p className="text-xs text-gray-400">{new Date(app.created_at).toLocaleDateString("ru-RU")}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${app.status === "pending" ? "bg-yellow-100 text-yellow-700" : app.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {app.status === "pending" ? "Ожидает" : app.status === "approved" ? "Одобрена" : "Отклонена"}
                    </span>
                  </div>
                  {app.description && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-3">
                      <p className="text-xs text-gray-400 mb-0.5">Описание</p>
                      <p className="text-sm text-gray-700">{app.description}</p>
                    </div>
                  )}
                  {app.status === "pending" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Причина отклонения (необязательно)"
                        value={appComment[app.id] || ""}
                        onChange={(e) => setAppComment((prev) => ({ ...prev, [app.id]: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => reviewApplication(app.id, "rejected")}
                          className="flex-1 py-2.5 text-sm font-semibold rounded-xl border-2 border-red-200 text-red-600 flex items-center justify-center gap-1.5">
                          <XCircle size={15} /> Отклонить
                        </button>
                        <button onClick={() => reviewApplication(app.id, "approved")}
                          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-green-500 text-white flex items-center justify-center gap-1.5">
                          <CheckCircle size={15} /> Одобрить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
}
