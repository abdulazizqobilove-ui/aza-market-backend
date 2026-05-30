"use client";
import { useEffect, useState } from "react";
import { TrendingUp, Package, Star, ShoppingBag } from "lucide-react";
import api, { SellerStats, imgUrl } from "@/lib/api";

// ── Bar chart ──────────────────────────────────────────────────────────
function BarChart({ data }: { data: { date: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-40 pt-2">
      {data.map((d, i) => {
        const pct = Math.max((d.revenue / max) * 100, d.revenue > 0 ? 4 : 1);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative flex-1 w-full flex items-end">
              <div
                className="w-full rounded-t-lg bg-blue-500 group-hover:bg-blue-600 transition-all"
                style={{ height: `${pct}%` }}
              />
              {d.revenue > 0 && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                  {d.revenue.toLocaleString()} сом.
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400">{d.date}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut chart for order statuses ────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>;

  let cumulative = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const pct = (d.value / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return { ...d, pct, start };
    });

  const r = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={`${(seg.pct / 100) * circumference} ${circumference}`}
              strokeDashoffset={-((seg.start / 100) * circumference)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-lg font-bold text-gray-900">{total}</p>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-gray-600">{seg.label}</span>
            </div>
            <span className="text-xs font-bold text-gray-900">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ORDER_COLORS: Record<string, string> = {
  pending: "#f59e0b", confirmed: "#3b82f6", processing: "#8b5cf6",
  shipped: "#6366f1", delivered: "#22c55e", cancelled: "#ef4444",
};
const ORDER_LABELS: Record<string, string> = {
  pending: "Новый", confirmed: "Подтверждён", processing: "В обработке",
  shipped: "Отправлен", delivered: "Доставлен", cancelled: "Отменён",
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SellerStats>("/seller/stats").then((r) => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const s = stats;
  const donutData = Object.entries(s?.orders ?? {})
    .filter(([k]) => k !== "total")
    .map(([k, v]) => ({ label: ORDER_LABELS[k] ?? k, value: v as number, color: ORDER_COLORS[k] ?? "#ccc" }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
        <p className="text-sm text-gray-500 mt-0.5">Детальная статистика вашего магазина</p>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Всего выручки", value: s?.revenue.total ?? 0, icon: TrendingUp, color: "bg-blue-50 text-blue-600" },
          { label: "За 7 дней",     value: s?.revenue.last_7d ?? 0, icon: TrendingUp, color: "bg-green-50 text-green-600" },
          { label: "За 30 дней",    value: s?.revenue.last_30d ?? 0, icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value.toLocaleString()} <span className="text-sm font-normal text-gray-400">сом.</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1">Выручка за 7 дней</h2>
        <p className="text-xs text-gray-400 mb-4">Только доставленные заказы</p>
        {s?.chart_7d ? <BarChart data={s.chart_7d} /> : <p className="text-gray-400 text-sm">Нет данных</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders donut */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Заказы по статусам</h2>
          <DonutChart data={donutData} />
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900">{s?.orders_7d ?? 0}</p>
              <p className="text-xs text-gray-400">За 7 дней</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s?.orders_30d ?? 0}</p>
              <p className="text-xs text-gray-400">За 30 дней</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s?.orders.total ?? 0}</p>
              <p className="text-xs text-gray-400">Всего</p>
            </div>
          </div>
        </div>

        {/* Products stats */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Товары</h2>
          <div className="space-y-4">
            {[
              { label: "Всего товаров", value: s?.products.total ?? 0, color: "bg-blue-500" },
              { label: "Активных", value: s?.products.active ?? 0, color: "bg-green-500" },
              { label: "Нет в наличии", value: s?.products.out_of_stock ?? 0, color: "bg-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-bold text-gray-900">{value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${color} transition-all`}
                    style={{ width: `${s?.products.total ? (value / s.products.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6">
            <div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <p className="text-xl font-bold text-gray-900">{s?.avg_rating?.toFixed(1) ?? "—"}</p>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Средний рейтинг</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s?.total_reviews ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Всего отзывов</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top products */}
      {s?.top_products && s.top_products.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Топ товаров по продажам</h2>
          <div className="space-y-3">
            {s.top_products.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4">
                <span className="w-6 text-sm font-bold text-gray-300">#{i + 1}</span>
                <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  {p.image_url
                    ? <img src={imgUrl(p.image_url) ?? ""} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-base">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${s.top_products[0].sales_count ? (p.sales_count / s.top_products[0].sales_count) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-600">{p.sales_count} продаж</p>
                  <p className="text-xs text-gray-400">{p.stock} в наличии</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
