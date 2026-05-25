"use client";
import { useEffect, useState } from "react";
import { MapPin, Phone, Clock, Package } from "lucide-react";
import api, { Order } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useNotificationStore } from "@/store/notifications";
import toast from "react-hot-toast";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждён",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-purple-100 text-purple-700 border-purple-200",
  shipped: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export default function SellerOrdersPage() {
  const { user } = useAuthStore();
  const { clear: clearNotifications } = useNotificationStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    clearNotifications();
    api.get<Order[]>("/seller/orders").then((r) => setOrders(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const updateStatus = async (orderId: number, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: status as any } : o));
    toast.success("Статус обновлён");
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">Нет доступа</div>;
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const counts: Record<string, number> = { all: orders.length };
  STATUSES.forEach((s) => { counts[s] = orders.filter((o) => o.status === s).length; });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Заказы покупателей</h1>
        <p className="text-sm text-gray-500 mt-0.5">{orders.length} заказов всего</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        <button
          onClick={() => setFilter("all")}
          className={`flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Все ({counts.all})
        </button>
        {STATUSES.filter((s) => counts[s] > 0).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === s ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={36} className="text-gray-300" />
          </div>
          <p className="text-gray-500">Заказов в этой категории нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div key={order.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold text-base">Заказ #{order.id}</p>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Clock size={13} />{new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={13} />{order.delivery_city}</span>
                    <span className="flex items-center gap-1.5"><Phone size={13} />{order.contact_phone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Статус:</label>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="input py-1.5 text-sm w-auto min-w-[140px]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="line-clamp-1 text-gray-700 flex-1 mr-3">{item.product.title} <span className="text-gray-400">× {item.quantity}</span></span>
                    <span className="font-medium shrink-0">{(item.price * item.quantity).toLocaleString()} сом.</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">{order.delivery_address}</p>
                <p className="font-bold text-primary text-lg">{order.total_price.toLocaleString()} сом.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
