"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package, ShoppingBag, TrendingUp, Star, AlertCircle,
  ArrowUpRight, Clock, CheckCircle, Truck, XCircle,
} from "lucide-react";
import api, { SellerStats, imgUrl, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, Order } from "@/lib/api";

function StatCard({ label, value, sub, icon: Icon, color, href }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; href?: string;
}) {
  const content = (
    <div className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {href && <ArrowUpRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// Tiny bar chart — pure SVG, no deps
function MiniChart({ data }: { data: { date: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const W = 100, H = 48, gap = 4;
  const barW = (W - gap * (data.length - 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = Math.max((d.revenue / max) * (H - 4), 2);
        const x = i * (barW + gap);
        const y = H - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={2} fill="#2563eb" opacity={d.revenue > 0 ? 1 : 0.15} />
          </g>
        );
      })}
    </svg>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<SellerStats>("/seller/stats"),
      api.get<Order[]>("/seller/orders"),
    ]).then(([sRes, oRes]) => {
      if (sRes.status === "fulfilled") setStats(sRes.value.data);
      if (oRes.status === "fulfilled") setOrders(oRes.value.data.slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const s = stats;
  const pendingCount = s?.orders.pending ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Обзор</h1>
          <p className="text-sm text-gray-500 mt-0.5">Добро пожаловать в AZA Partners</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm font-medium">
            <Clock className="w-4 h-4" />
            {pendingCount} новых заказов
          </div>
        )}
      </div>

      {/* Revenue highlight */}
      <div className="card p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium">Общая выручка</p>
            <p className="text-4xl font-bold mt-1">{(s?.revenue.total ?? 0).toLocaleString("ru-RU")} <span className="text-2xl font-normal text-blue-200">сом.</span></p>
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-blue-200 text-xs">За 7 дней</p>
                <p className="text-lg font-bold">{(s?.revenue.last_7d ?? 0).toLocaleString("ru-RU")} сом.</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs">За 30 дней</p>
                <p className="text-lg font-bold">{(s?.revenue.last_30d ?? 0).toLocaleString("ru-RU")} сом.</p>
              </div>
            </div>
          </div>
          <div className="w-32 h-16 opacity-80">
            {s?.chart_7d && <MiniChart data={s.chart_7d} />}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Товаров" value={s?.products.total ?? 0} sub={`${s?.products.active ?? 0} активных`}
          icon={Package} color="bg-blue-50 text-blue-600" href="/products" />
        <StatCard label="Заказов (30д)" value={s?.orders_30d ?? 0} sub={`Всего ${s?.orders.total ?? 0}`}
          icon={ShoppingBag} color="bg-green-50 text-green-600" href="/orders" />
        <StatCard label="Рейтинг" value={s?.avg_rating?.toFixed(1) ?? "—"}
          sub={`${s?.total_reviews ?? 0} отзывов`}
          icon={Star} color="bg-yellow-50 text-yellow-500" />
        <StatCard label="Нет в наличии" value={s?.products.out_of_stock ?? 0}
          sub="Пополните склад"
          icon={AlertCircle} color="bg-red-50 text-red-500" href="/products" />
      </div>

      {/* Order status breakdown */}
      {s && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Статус заказов</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(["pending","confirmed","processing","shipped","delivered","cancelled"] as const).map((st) => (
              <div key={st} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{s.orders[st]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ORDER_STATUS_LABELS[st]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Последние заказы</h2>
            <Link href="/orders" className="text-sm text-blue-600 font-medium hover:underline">Все →</Link>
          </div>
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Заказов пока нет</p>}
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Заказ #{o.id}</p>
                  <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{o.total_price.toLocaleString()} сом.</p>
                  <span className={`badge ${ORDER_STATUS_COLORS[o.status]}`}>{ORDER_STATUS_LABELS[o.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Топ товаров</h2>
            <Link href="/products" className="text-sm text-blue-600 font-medium hover:underline">Все →</Link>
          </div>
          <div className="space-y-3">
            {(!s?.top_products || s.top_products.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-6">Нет данных</p>
            )}
            {s?.top_products.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-1.5">
                <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  {p.image_url ? (
                    <img src={imgUrl(p.image_url) ?? ""} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400">{p.price.toLocaleString()} сом. · {p.stock} шт.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-green-600">{p.sales_count} продаж</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
