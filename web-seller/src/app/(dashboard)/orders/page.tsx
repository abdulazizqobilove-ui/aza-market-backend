"use client";
import { useEffect, useState } from "react";
import {
  ShoppingBag, ChevronDown, ChevronUp, Search, RefreshCw, Phone, MapPin,
  ArrowRight, Truck, Package,
} from "lucide-react";
import api, { Order, OrderStatus, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_NEXT, imgUrl } from "@/lib/api";
import { clsx } from "clsx";

const FILTERS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all",         label: "Все" },
  { key: "pending",     label: "Новые" },
  { key: "confirmed",   label: "Подтверждён" },
  { key: "processing",  label: "В обработке" },
  { key: "shipped",     label: "Отправлен" },
  { key: "delivered",   label: "Доставлен" },
  { key: "cancelled",   label: "Отменён" },
];

function OrderRow({ order, onUpdate }: { order: Order; onUpdate: (id: number, status: OrderStatus) => void }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const nextStatus = ORDER_STATUS_NEXT[order.status];

  const advance = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/status`, { status: nextStatus });
      onUpdate(order.id, nextStatus);
    } finally { setUpdating(false); }
  };

  return (
    <div className="card mb-3 overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-bold text-gray-900">Заказ #{order.id}</p>
            <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
            {order.is_paid && <span className="badge bg-green-100 text-green-700">Оплачен</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.created_at).toLocaleString("ru-RU")} · {order.items.length} {order.items.length === 1 ? "товар" : "товара"}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-gray-900">{order.total_price.toLocaleString()} сом.</p>
          {order.delivery_cost ? <p className="text-xs text-gray-400">+ {order.delivery_cost.toLocaleString()} доставка</p> : null}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item) => {
              const img = item.product.images.find((i) => i.is_main) ?? item.product.images[0];
              return (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {img ? <img src={imgUrl(img.url) ?? ""} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product.title}</p>
                    <p className="text-xs text-gray-400">{item.quantity} шт. × {item.price.toLocaleString()} сом.</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{(item.quantity * item.price).toLocaleString()} сом.</p>
                </div>
              );
            })}
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Телефон</p>
                <p className="text-sm font-medium text-gray-900">{order.contact_phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Адрес</p>
                <p className="text-sm font-medium text-gray-900">{order.delivery_city}, {order.delivery_address}</p>
              </div>
            </div>
            {order.delivery_service && (
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Служба доставки</p>
                  <p className="text-sm font-medium text-gray-900">{order.delivery_service}</p>
                </div>
              </div>
            )}
            {order.tracking_number && (
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Трек-номер</p>
                  <p className="text-sm font-mono font-medium text-gray-900">{order.tracking_number}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Способ оплаты</p>
              <p className="text-sm font-medium text-gray-900">{order.payment_method}</p>
            </div>
          </div>

          {/* Action */}
          {nextStatus && order.status !== "cancelled" && (
            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button onClick={advance} disabled={updating} className="btn-primary flex items-center gap-2 text-sm">
                {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Перевести в «{ORDER_STATUS_LABELS[nextStatus]}»
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get<Order[]>("/seller/orders").then((r) => { setOrders(r.data); setLoading(false); });
  }, []);

  const handleUpdate = (id: number, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  };

  const counts = FILTERS.reduce((acc, f) => {
    acc[f.key] = f.key === "all" ? orders.length : orders.filter((o) => o.status === f.key).length;
    return acc;
  }, {} as Record<string, number>);

  const visible = orders
    .filter((o) => filter === "all" || o.status === filter)
    .filter((o) => !q || String(o.id).includes(q) || o.contact_phone.includes(q) || o.delivery_city.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Заказы</h1>
        <p className="text-sm text-gray-500 mt-0.5">Всего {orders.length} заказов</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition",
              filter === f.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span className={clsx("ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full",
                filter === f.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              )}>{counts[f.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по номеру заказа, телефону или городу..." />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">Заказов нет</p>
        </div>
      ) : (
        <div>
          {visible.map((o) => (
            <OrderRow key={o.id} order={o} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
