"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Package, MapPin, ChevronRight, ArrowLeft } from "lucide-react";
import api, { Order } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает", confirmed: "Подтверждён", processing: "В обработке",
  shipped: "В пути", delivered: "Доставлен", cancelled: "Отменён",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-600 bg-yellow-50",
  confirmed: "text-blue-600 bg-blue-50",
  processing: "text-blue-600 bg-blue-50",
  shipped: "text-indigo-600 bg-indigo-50",
  delivered: "text-green-600 bg-green-50",
  cancelled: "text-red-500 bg-red-50",
};

const FILTER_TABS = [
  { key: "all", label: "Все" },
  { key: "active", label: "В обработке" },
  { key: "shipped", label: "В пути" },
  { key: "delivered", label: "Получены" },
  { key: "cancelled", label: "Возвраты" },
];

const FILTER_MAP: Record<string, string[]> = {
  all: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
  active: ["pending", "confirmed", "processing"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

const STEPS = ["Оформлен", "Подтверждён", "В обработке", "В пути", "Доставлен"];
const STATUS_STEP: Record<string, number> = {
  pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4, cancelled: -1,
};

export default function OrdersPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter") || "all";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>("/orders")
      .then((r) => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = orders.filter((o) => (FILTER_MAP[filterParam] || FILTER_MAP.all).includes(o.status));

  if (!user) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-20">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Package size={32} className="text-gray-300" />
      </div>
      <p className="text-base font-bold text-gray-700 mb-1">Войдите в аккаунт</p>
      <p className="text-sm text-gray-400 mb-5">Чтобы видеть свои заказы</p>
      <Link href="/auth/login" className="bg-primary text-white font-semibold px-8 py-3.5 rounded-2xl">Войти</Link>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-0 border-b border-gray-100">
        <div className="flex items-center gap-3 pb-4">
          <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Мои заказы</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {FILTER_TABS.map((tab) => {
            const count = orders.filter((o) => (FILTER_MAP[tab.key] || []).includes(o.status)).length;
            const isActive = filterParam === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/orders?filter=${tab.key}`}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.label}
                {count > 0 && tab.key !== "all" && (
                  <span className={`text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center ${isActive ? "bg-white/30 text-white" : "bg-gray-300 text-gray-600"}`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-3 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package size={32} className="text-gray-300" />
          </div>
          <p className="text-base font-bold text-gray-700 mb-1">
            {filterParam === "all" ? "Заказов пока нет" : "Нет заказов в этой категории"}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {filterParam === "all" ? "Оформите первый заказ" : "Попробуйте другой фильтр"}
          </p>
          <Link href="/" className="bg-primary text-white font-semibold px-6 py-3 rounded-2xl text-sm">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {filtered.map((order) => {
            const step = STATUS_STEP[order.status];
            const isExpanded = expanded === order.id;

            return (
              <div key={order.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {/* Order header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : order.id)}
                  className="w-full px-4 py-4 text-left active:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Заказ #{order.id}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  {/* Product thumbnails */}
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1.5">
                      {order.items.slice(0, 3).map((item) => {
                        const img = item.product.images?.find((i) => i.is_main) || item.product.images?.[0];
                        return (
                          <div key={item.id} className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                            {img ? (
                              <Image src={`http://192.168.1.45:8000${img.url}`} alt="" width={48} height={48} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                            )}
                          </div>
                        );
                      })}
                      {order.items.length > 3 && (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-gray-400">+{order.items.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-base font-bold text-gray-900">{order.total_price.toLocaleString()} сом.</p>
                      <p className="text-xs text-gray-400">{order.items.length} товар{order.items.length === 1 ? "" : order.items.length < 5 ? "а" : "ов"}</p>
                    </div>
                    <ChevronRight size={16} className={`text-gray-300 transition-transform ml-1 ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-50 px-4 pb-4 pt-4 space-y-4">
                    {/* Progress */}
                    {step >= 0 && (
                      <div>
                        <div className="flex items-center mb-3">
                          {STEPS.map((label, i) => (
                            <div key={i} className="flex items-center flex-1 last:flex-none">
                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${i <= step ? "bg-primary border-primary text-white" : "border-gray-200 text-gray-300"}`}>
                                  {i < step ? "✓" : i + 1}
                                </div>
                                <span className={`text-[9px] mt-1 text-center leading-tight w-10 ${i <= step ? "text-primary font-medium" : "text-gray-400"}`}>{label}</span>
                              </div>
                              {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full ${i < step ? "bg-primary" : "bg-gray-200"}`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Items list */}
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700 line-clamp-1 flex-1 mr-3">{item.product.title}</span>
                          <span className="text-gray-400 shrink-0 mr-2">× {item.quantity}</span>
                          <span className="font-semibold text-gray-800 shrink-0">{(item.price * item.quantity).toLocaleString()} сом.</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-50 flex justify-between">
                        <span className="text-sm font-semibold text-gray-700">Итого</span>
                        <span className="text-sm font-bold text-primary">{order.total_price.toLocaleString()} сом.</span>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                      <MapPin size={13} className="shrink-0 mt-0.5" />
                      <span>{order.delivery_city}, {order.delivery_address}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
