import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TrendingUp, Package, ShoppingBag, Star, BarChart2,
  CheckCircle, Clock, Truck, XCircle, ChevronRight,
} from "lucide-react-native";
import api, { API_URL, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "expo-router";

const P = "#8B5CF6";

interface Stats {
  products: { total: number; active: number; out_of_stock: number };
  orders: { total: number; pending: number; processing: number; confirmed: number; shipped: number; delivered: number; cancelled: number };
  revenue: { total: number; last_7d: number; last_30d: number };
  orders_7d: number;
  orders_30d: number;
  avg_rating: number;
  total_reviews: number;
  top_products: { id: number; title: string; price: number; sales_count: number; stock: number; image_url?: string }[];
  chart_7d: { date: string; revenue: number }[];
}

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub?: string; color: string; icon: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 8, minWidth: "47%" }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + "18", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "500" }}>{label}</Text>
      {sub && <Text style={{ fontSize: 10, color: color, fontWeight: "600" }}>{sub}</Text>}
    </View>
  );
}

function BarChart({ data }: { data: { date: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 90, paddingTop: 8 }}>
      {data.map((d, i) => {
        const height = Math.max((d.revenue / max) * 80, d.revenue > 0 ? 6 : 3);
        const isLast = i === data.length - 1;
        return (
          <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 9, color: d.revenue > 0 ? P : "#e5e7eb", fontWeight: "700" }}>
              {d.revenue > 0 ? (d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}к` : String(d.revenue)) : ""}
            </Text>
            <View style={{ width: "100%", height, borderRadius: 6, backgroundColor: isLast ? P : d.revenue > 0 ? "#c4b5fd" : "#f3f4f6" }} />
            <Text style={{ fontSize: 9, color: "#9ca3af" }}>{d.date}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function SellerStatsScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    api.get<Stats>("/seller/stats")
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [user]);

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => n.toLocaleString("ru-RU");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Статистика</Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Полный обзор вашего магазина</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={P} style={{ marginTop: 60 }} />
      ) : !stats ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#9ca3af" }}>Нет данных</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={P} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Revenue chart card */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 18, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <View>
                <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: "500" }}>Выручка за 7 дней</Text>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#111827", marginTop: 2 }}>{fmt(stats.revenue.last_7d)} <Text style={{ fontSize: 14, color: "#9ca3af", fontWeight: "500" }}>сом.</Text></Text>
              </View>
              <View style={{ backgroundColor: "#f5f3ff", borderRadius: 12, padding: 10 }}>
                <BarChart2 size={22} color={P} />
              </View>
            </View>

            <BarChart data={stats.chart_7d} />

            {/* Period comparison */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: "#f9fafb", borderRadius: 14, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: P }}>{fmt(stats.revenue.last_7d)}</Text>
                <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>За 7 дней</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#f9fafb", borderRadius: 14, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#16a34a" }}>{fmt(stats.revenue.last_30d)}</Text>
                <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>За 30 дней</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#f9fafb", borderRadius: 14, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>{fmt(stats.revenue.total)}</Text>
                <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>За всё время</Text>
              </View>
            </View>
          </View>

          {/* Stat cards grid */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Заказов за 7 дн." value={String(stats.orders_7d)} sub={`${stats.orders_30d} за месяц`} color={P} icon={ShoppingBag} />
            <StatCard label="Рейтинг магазина" value={stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : "—"} sub={`${stats.total_reviews} отзывов`} color="#f59e0b" icon={Star} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Всего товаров" value={String(stats.products.total)} sub={`${stats.products.active} активных`} color="#16a34a" icon={Package} />
            <StatCard label="Нет в наличии" value={String(stats.products.out_of_stock)} sub="товаров" color="#ef4444" icon={Package} />
          </View>

          {/* Orders breakdown */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Статусы заказов</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>Всего: {stats.orders.total}</Text>
            </View>
            {[
              { key: "pending", label: "Ожидают", icon: Clock, color: "#f59e0b", bg: "#fef3c7" },
              { key: "confirmed", label: "Подтверждены", icon: CheckCircle, color: "#7c3aed", bg: "#ede9fe" },
              { key: "processing", label: "В обработке", icon: TrendingUp, color: "#2563eb", bg: "#dbeafe" },
              { key: "shipped", label: "В пути", icon: Truck, color: "#0891b2", bg: "#cffafe" },
              { key: "delivered", label: "Доставлены", icon: CheckCircle, color: "#16a34a", bg: "#dcfce7" },
              { key: "cancelled", label: "Отменены", icon: XCircle, color: "#ef4444", bg: "#fee2e2" },
            ].map(({ key, label, icon: Icon, color, bg }) => {
              const count = (stats.orders as any)[key] || 0;
              const pct = stats.orders.total > 0 ? Math.round((count / stats.orders.total) * 100) : 0;
              return (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#f9fafb", gap: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color={color} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: "#374151", fontWeight: "500" }}>{label}</Text>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: count > 0 ? color : "#d1d5db" }}>{count}</Text>
                    <Text style={{ fontSize: 10, color: "#9ca3af" }}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Top products */}
          {stats.top_products.length > 0 && (
            <View style={{ backgroundColor: "#fff", borderRadius: 20, overflow: "hidden" }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Топ товаров по продажам</Text>
              </View>
              {stats.top_products.map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => router.push(`/products/${p.id}` as any)}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < stats.top_products.length - 1 ? 0.5 : 0, borderBottomColor: "#f9fafb", gap: 12 }}
                >
                  {/* Rank */}
                  <Text style={{ fontSize: 13, fontWeight: "800", color: i < 3 ? P : "#d1d5db", width: 20 }}>#{i + 1}</Text>

                  {/* Image */}
                  <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: "#f3f4f6", overflow: "hidden" }}>
                    {p.image_url
                      ? <Image source={{ uri: imgUrl(p.image_url) ?? "" }} style={{ width: 46, height: 46 }} contentFit="cover" />
                      : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 20 }}>📦</Text></View>
                    }
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }} numberOfLines={1}>{p.title}</Text>
                    <Text style={{ fontSize: 12, color: P, fontWeight: "700", marginTop: 2 }}>{fmt(p.price)} сом.</Text>
                  </View>

                  {/* Sales */}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>{p.sales_count}</Text>
                    <Text style={{ fontSize: 10, color: "#9ca3af" }}>продаж</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Products quick stats */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 2 }}>Ассортимент</Text>
            {[
              { label: "Всего товаров", value: stats.products.total, color: "#6b7280" },
              { label: "Активные", value: stats.products.active, color: "#16a34a" },
              { label: "Скрытые", value: stats.products.total - stats.products.active - stats.products.out_of_stock, color: "#f59e0b" },
              { label: "Нет в наличии", value: stats.products.out_of_stock, color: "#ef4444" },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                  <Text style={{ fontSize: 13, color: "#374151" }}>{label}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color }}>{value}</Text>
              </View>
            ))}
            {/* Bar */}
            {stats.products.total > 0 && (
              <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 4 }}>
                {[
                  { pct: stats.products.active / stats.products.total, color: "#16a34a" },
                  { pct: (stats.products.total - stats.products.active - stats.products.out_of_stock) / stats.products.total, color: "#f59e0b" },
                  { pct: stats.products.out_of_stock / stats.products.total, color: "#ef4444" },
                ].filter((s) => s.pct > 0).map((s, i) => (
                  <View key={i} style={{ flex: s.pct, backgroundColor: s.color }} />
                ))}
              </View>
            )}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
