"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package, ShoppingBag, Star, AlertCircle,
  ArrowUpRight, ArrowUp, ArrowDown, Clock,
  TrendingUp, Wallet, BarChart2,
} from "lucide-react";
import api, { SellerStats, imgUrl, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, Order } from "@/lib/api";

// ── Skeleton pulse ─────────────────────────────────────────────────────
function Sk({ w = "w-full", h = "h-4", rounded = "rounded-lg", className = "" }: {
  w?: string; h?: string; rounded?: string; className?: string;
}) {
  return <div className={`bg-white/20 animate-pulse ${w} ${h} ${rounded} ${className}`} />;
}

function SkLight({ w = "w-full", h = "h-4", rounded = "rounded-lg", className = "" }: {
  w?: string; h?: string; rounded?: string; className?: string;
}) {
  return <div className={`bg-gray-100 animate-pulse ${w} ${h} ${rounded} ${className}`} />;
}

// ── Smooth area line chart ─────────────────────────────────────────────
function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  const W = 400, H = 100;
  const max = Math.max(...data.map(d => d.revenue), 1);
  const pts = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * W,
    y: H - (d.revenue / max) * (H - 12) - 4,
    ...d,
  }));

  const pathD = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return acc + ` C ${cpx} ${prev.y}, ${cpx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaD = pathD + ` L ${W} ${H} L 0 ${H} Z`;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="relative w-full" style={{ height: 100 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
        {pts.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={hover === i ? 5 : 3}
            fill="white" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"
            style={{ cursor: "pointer", transition: "r 0.15s" }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div className="absolute bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg pointer-events-none border border-white/30"
          style={{ left: `${(pts[hover].x / W) * 100}%`, top: 0, transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          <p className="font-bold">{pts[hover].revenue.toLocaleString("ru-RU")} сом.</p>
          <p className="opacity-70">{new Date(pts[hover].date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</p>
        </div>
      )}
    </div>
  );
}

// ── Donut ──────────────────────────────────────────────────────────────
function OrderDonut({ s }: { s: SellerStats }) {
  const slices = [
    { key: "pending",    color: "#f59e0b", label: "Новые" },
    { key: "confirmed",  color: "#3b82f6", label: "Подтверждён" },
    { key: "processing", color: "#8b5cf6", label: "Обработка" },
    { key: "shipped",    color: "#6366f1", label: "Отправлен" },
    { key: "delivered",  color: "#22c55e", label: "Доставлен" },
    { key: "cancelled",  color: "#ef4444", label: "Отменён" },
  ] as const;
  const total = s.orders.total || 1;
  const R = 36, cx = 48, cy = 48, stroke = 14;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const arcs = slices.map(sl => {
    const val = (s.orders as any)[sl.key] as number;
    const dash = (val / total) * circ;
    const arc = { ...sl, val, dash, offset };
    offset += dash;
    return arc;
  });
  return (
    <div className="flex items-center gap-5">
      <svg width="96" height="96" viewBox="0 0 96 96" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {arcs.map((arc, i) => arc.val > 0 && (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={arc.color} strokeWidth={stroke}
            strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
            strokeDashoffset={-arc.offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#111827" fontSize="14" fontWeight="700">{s.orders.total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#9ca3af" fontSize="8">заказов</text>
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0">
        {arcs.map(arc => (
          <div key={arc.key} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: arc.color }} />
            <span className="text-gray-500 flex-1 truncate">{arc.label}</span>
            <span className="font-bold text-gray-800 ml-auto">{arc.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Trend({ a, b }: { a: number; b: number }) {
  if (!b) return null;
  const pct = Math.round(((a - b) / b) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
      {up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {Math.abs(pct)}%
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    Promise.allSettled([
      api.get<SellerStats>("/seller/stats"),
      api.get<Order[]>("/seller/orders"),
    ]).then(([sRes, oRes]) => {
      if (sRes.status === "fulfilled") setStats(sRes.value.data);
      if (oRes.status === "fulfilled") setOrders(oRes.value.data.slice(0, 6));
      setLoading(false);
    });
  }, []);

  const s = stats;
  const pendingCount = s?.orders.pending ?? 0;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Обзор</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {!loading && pendingCount > 0 && (
          <Link href="/orders"
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-100 transition">
            <Clock className="w-4 h-4" />
            {pendingCount} новых заказов
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* ── Revenue hero ── */}
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #4f46e5 100%)" }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-4 right-24 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 left-16 w-36 h-36 rounded-full bg-white/5" />

        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-blue-300" />
                <span className="text-blue-200 text-sm font-medium">Общая выручка</span>
              </div>

              {loading ? (
                <div className="mt-2 space-y-2">
                  <Sk w="w-56" h="h-10" rounded="rounded-xl" />
                  <div className="flex gap-3 mt-4">
                    <Sk w="w-20" h="h-3" rounded="rounded" />
                    <Sk w="w-20" h="h-3" rounded="rounded" />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-5xl font-black text-white tracking-tight leading-none mt-2">
                    {(s?.revenue.total ?? 0).toLocaleString("ru-RU")}
                    <span className="text-2xl font-normal text-blue-300 ml-2">сом.</span>
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    {(["7d", "30d"] as const).map(key => (
                      <button key={key} onClick={() => setChartPeriod(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${chartPeriod === key ? "bg-white text-blue-700" : "bg-white/15 text-blue-100 hover:bg-white/25"}`}>
                        {key === "7d" ? "7 дней" : "30 дней"}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-6 mt-3">
                    <div>
                      <p className="text-blue-300 text-xs mb-0.5">За 7 дней</p>
                      <p className="text-xl font-bold text-white">{(s?.revenue.last_7d ?? 0).toLocaleString("ru-RU")} <span className="text-sm font-normal text-blue-300">сом.</span></p>
                    </div>
                    <div className="w-px bg-white/20" />
                    <div>
                      <p className="text-blue-300 text-xs mb-0.5">За 30 дней</p>
                      <p className="text-xl font-bold text-white">{(s?.revenue.last_30d ?? 0).toLocaleString("ru-RU")} <span className="text-sm font-normal text-blue-300">сом.</span></p>
                    </div>
                    <div className="w-px bg-white/20" />
                    <div>
                      <p className="text-blue-300 text-xs mb-0.5">Заказов (30д)</p>
                      <p className="text-xl font-bold text-white">{s?.orders_30d ?? 0}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Chart */}
            <div className="flex-1 max-w-xs hidden sm:block">
              {loading ? (
                <div className="space-y-2">
                  <Sk w="w-full" h="h-16" rounded="rounded-xl" />
                  <div className="flex justify-between">
                    <Sk w="w-10" h="h-2" rounded="rounded" />
                    <Sk w="w-10" h="h-2" rounded="rounded" />
                    <Sk w="w-10" h="h-2" rounded="rounded" />
                  </div>
                </div>
              ) : s?.chart_7d && s.chart_7d.length > 1 ? (
                <>
                  <RevenueChart data={s.chart_7d} />
                  <div className="flex justify-between mt-1 px-0.5">
                    {s.chart_7d.map((d, i) => (
                      (i === 0 || i === Math.floor(s.chart_7d.length / 2) || i === s.chart_7d.length - 1) ? (
                        <span key={i} className="text-[10px] text-blue-300">
                          {new Date(d.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </span>
                      ) : <span key={i} />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats 4-grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Товары */}
        <Link href="/products" className="group card p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-200 group-hover:text-blue-400 transition" />
          </div>
          {loading
            ? <div className="space-y-2"><SkLight w="w-16" h="h-8" rounded="rounded-lg" /><SkLight w="w-24" h="h-3" /></div>
            : <>
                <div>
                  <p className="text-3xl font-black text-gray-900">{s?.products.total ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">товаров</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-500">{s?.products.active ?? 0} активных</span>
                  {(s?.products.out_of_stock ?? 0) > 0 && (
                    <span className="text-xs text-red-500 font-medium">{s?.products.out_of_stock} нет</span>
                  )}
                </div>
              </>
          }
        </Link>

        {/* Заказы */}
        <Link href="/orders" className="group card p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-200 group-hover:text-green-400 transition" />
          </div>
          {loading
            ? <div className="space-y-2"><SkLight w="w-16" h="h-8" rounded="rounded-lg" /><SkLight w="w-24" h="h-3" /></div>
            : <>
                <div>
                  <p className="text-3xl font-black text-gray-900">{s?.orders_30d ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">заказов за 30 дней</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-500">Всего {s?.orders.total ?? 0}</span>
                  {pendingCount > 0 && (
                    <span className="text-xs text-amber-600 font-semibold">{pendingCount} новых</span>
                  )}
                </div>
              </>
          }
        </Link>

        {/* Рейтинг */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
          {loading
            ? <div className="space-y-2"><SkLight w="w-16" h="h-8" rounded="rounded-lg" /><SkLight w="w-24" h="h-3" /></div>
            : <>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-gray-900">{s?.avg_rating?.toFixed(1) ?? "—"}</p>
                    <div className="flex gap-0.5 mb-0.5">
                      {[1,2,3,4,5].map(n => (
                        <svg key={n} className="w-3 h-3" viewBox="0 0 12 12" fill={(s?.avg_rating ?? 0) >= n ? "#f59e0b" : "#e5e7eb"}>
                          <path d="M6 1l1.4 2.9 3.1.4-2.2 2.2.5 3.1L6 8.1 3.2 9.6l.5-3.1L1.5 4.3l3.1-.4z"/>
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">рейтинг магазина</p>
                </div>
                <div className="pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-500">{s?.total_reviews ?? 0} отзывов</span>
                </div>
              </>
          }
        </div>

        {/* Нет в наличии */}
        <Link href="/products" className="group card p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-200 group-hover:text-red-400 transition" />
          </div>
          {loading
            ? <div className="space-y-2"><SkLight w="w-16" h="h-8" rounded="rounded-lg" /><SkLight w="w-24" h="h-3" /></div>
            : <>
                <div>
                  <p className={`text-3xl font-black ${(s?.products.out_of_stock ?? 0) > 0 ? "text-red-500" : "text-gray-900"}`}>
                    {s?.products.out_of_stock ?? 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">нет в наличии</p>
                </div>
                <div className="pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-500">
                    {(s?.products.out_of_stock ?? 0) > 0 ? "Требуют пополнения" : "Всё в наличии ✓"}
                  </span>
                </div>
              </>
          }
        </Link>
      </div>

      {/* ── Middle: donut + revenue breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Donut */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            <h2 className="font-bold text-gray-900">Статус заказов</h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-5">
              <SkLight w="w-24" h="h-24" rounded="rounded-full" className="flex-shrink-0" />
              <div className="flex-1 space-y-2">
                {[...Array(6)].map((_, i) => <SkLight key={i} h="h-3" />)}
              </div>
            </div>
          ) : s ? <OrderDonut s={s} /> : null}
        </div>

        {/* Revenue breakdown */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h2 className="font-bold text-gray-900">Выручка по периодам</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <SkLight w="w-16" h="h-3" />
                  <SkLight w="w-24" h="h-7" rounded="rounded-lg" />
                  <SkLight w="w-12" h="h-3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Сегодня",    value: s?.chart_7d?.at(-1)?.revenue ?? 0, prev: s?.chart_7d?.at(-2)?.revenue ?? 0, color: "text-blue-600",   bg: "bg-blue-50" },
                { label: "За 7 дней",  value: s?.revenue.last_7d ?? 0,           prev: null, color: "text-purple-600", bg: "bg-purple-50" },
                { label: "За 30 дней", value: s?.revenue.last_30d ?? 0,          prev: null, color: "text-green-600",  bg: "bg-green-50" },
              ].map(({ label, value, prev, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-4`}>
                  <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
                  <p className={`text-2xl font-black ${color} leading-none`}>{value.toLocaleString("ru-RU")}</p>
                  <p className="text-xs text-gray-400 mt-1">сом.</p>
                  {prev !== null && <div className="mt-2"><Trend a={value} b={prev} /></div>}
                </div>
              ))}
            </div>
          )}

          {/* Day bars */}
          <div className="mt-5">
            <p className="text-xs text-gray-400 mb-3">Ежедневная выручка (7 дней)</p>
            {loading ? (
              <div className="flex items-end gap-1.5 h-14">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <SkLight w="w-full" h={`h-${[6,10,8,12,10,14,8][i] ?? 8}`} rounded="rounded-t-lg" />
                    <SkLight w="w-4" h="h-2" rounded="rounded" />
                  </div>
                ))}
              </div>
            ) : s?.chart_7d && s.chart_7d.length > 0 ? (
              <div className="flex items-end gap-1.5 h-14">
                {s.chart_7d.map((d, i) => {
                  const max = Math.max(...s.chart_7d.map(x => x.revenue), 1);
                  const pct = d.revenue / max;
                  const isToday = i === s.chart_7d.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full rounded-t-lg transition-all duration-500"
                        style={{
                          height: `${Math.max(pct * 100, 4)}%`,
                          background: isToday
                            ? "linear-gradient(to top, #2563eb, #60a5fa)"
                            : pct > 0.7 ? "#bfdbfe" : "#dbeafe",
                        }}
                      />
                      <span className="text-[9px] text-gray-400">
                        {new Date(d.date).toLocaleDateString("ru-RU", { day: "numeric" })}
                      </span>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                        {d.revenue.toLocaleString("ru-RU")} сом.
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Bottom: orders + top products ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900">Последние заказы</h2>
            </div>
            <Link href="/orders" className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Все <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-1">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <SkLight w="w-9" h="h-9" rounded="rounded-xl" className="flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <SkLight w="w-24" h="h-3" />
                    <SkLight w="w-16" h="h-2.5" />
                  </div>
                  <div className="space-y-1.5 items-end flex flex-col">
                    <SkLight w="w-20" h="h-3" />
                    <SkLight w="w-14" h="h-4" rounded="rounded-full" />
                  </div>
                </div>
              ))
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center gap-2">
                <ShoppingBag className="w-10 h-10 text-gray-100" />
                <p className="text-sm text-gray-400">Заказов пока нет</p>
              </div>
            ) : orders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">#{o.id}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Заказ #{o.id}
                    {o.status === "pending" && (
                      <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(o.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{o.total_price.toLocaleString()} <span className="text-xs font-normal text-gray-400">сом.</span></p>
                  <span className={`badge text-[10px] ${ORDER_STATUS_COLORS[o.status]}`}>{ORDER_STATUS_LABELS[o.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900">Топ товаров</h2>
            </div>
            <Link href="/products" className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Все <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkLight w="w-6" h="h-6" rounded="rounded-lg" className="flex-shrink-0" />
                  <SkLight w="w-10" h="h-10" rounded="rounded-xl" className="flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <SkLight w="w-32" h="h-3" />
                    <SkLight w="w-full" h="h-1.5" rounded="rounded-full" />
                  </div>
                </div>
              ))
            ) : !s?.top_products || s.top_products.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center gap-2">
                <Package className="w-10 h-10 text-gray-100" />
                <p className="text-sm text-gray-400">Нет данных о продажах</p>
              </div>
            ) : s.top_products.map((p, i) => {
              const maxSales = Math.max(...s.top_products.map(x => x.sales_count), 1);
              const pct = (p.sales_count / maxSales) * 100;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    i === 0 ? "bg-yellow-400 text-white" :
                    i === 1 ? "bg-gray-300 text-white" :
                    i === 2 ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-400"
                  }`}>{i + 1}</div>
                  <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {p.image_url
                      ? <img src={imgUrl(p.image_url) ?? ""} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center text-base">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate pr-2">{p.title}</p>
                      <span className="text-xs font-bold text-green-600 flex-shrink-0">{p.sales_count} прод.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-300 transition-all duration-500"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{p.price.toLocaleString()} сом.</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
