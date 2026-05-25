"use client";
import { useEffect, useState } from "react";
import { TrendingUp, Package, ShoppingBag, Star, ArrowUp, Wallet, Send, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import api, { Product, Order, SellerBalance } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "На рассмотрении",
  approved: "Выплачено",
  rejected: "Отклонено",
};
const PAYOUT_STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};
const PAYOUT_STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-600 bg-yellow-50",
  approved: "text-green-600 bg-green-50",
  rejected: "text-red-600 bg-red-50",
};

export default function SellerAnalyticsPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Product[]>("/seller/products"),
      api.get<Order[]>("/seller/orders"),
      api.get<SellerBalance>("/seller/balance"),
    ]).then(([p, o, b]) => {
      setProducts(p.data);
      setOrders(o.data);
      setBalance(b.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balance) return;
    const amount = parseFloat(payoutAmount);
    if (!amount || amount < 100) { toast.error("Минимальная сумма — 100 сом."); return; }
    if (amount > balance.balance) { toast.error("Недостаточно средств"); return; }
    if (!bankDetails.trim()) { toast.error("Укажите реквизиты"); return; }
    setPayoutLoading(true);
    try {
      const res = await api.post("/seller/payouts", { amount, bank_details: bankDetails });
      setBalance((prev) => prev ? {
        ...prev,
        balance: prev.balance - amount,
        total_withdrawn: prev.total_withdrawn + amount,
        payouts: [res.data, ...prev.payouts],
      } : prev);
      setPayoutAmount("");
      setBankDetails("");
      setShowPayoutForm(false);
      toast.success("Заявка на вывод отправлена!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка");
    } finally {
      setPayoutLoading(false);
    }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  const totalRevenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total_price, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const activeProducts = products.filter((p) => p.is_active).length;

  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  const STATUS_LABELS: Record<string, string> = {
    pending: "Ожидает", confirmed: "Подтверждён", processing: "В обработке",
    shipped: "Отправлен", delivered: "Доставлен", cancelled: "Отменён",
  };
  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-400", confirmed: "bg-blue-400", processing: "bg-purple-400",
    shipped: "bg-indigo-400", delivered: "bg-green-400", cancelled: "bg-red-400",
  };

  const productSales: Record<number, { title: string; count: number; revenue: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSales[item.product.id]) {
        productSales[item.product.id] = { title: item.product.title, count: 0, revenue: 0 };
      }
      productSales[item.product.id].count += item.quantity;
      productSales[item.product.id].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxRevenue = topProducts[0]?.revenue || 1;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Аналитика</h1>
        <p className="text-sm text-gray-400 mt-0.5">Статистика вашего магазина</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Баланс продавца */}
        {balance !== null && (
          <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={18} className="opacity-80" />
              <span className="text-sm opacity-80">Баланс</span>
            </div>
            <p className="text-4xl font-bold mb-1">{balance.balance.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} сом.</p>
            <p className="text-xs opacity-70 mb-4">После комиссии платформы 10%</p>

            <div className="flex gap-4 text-sm mb-5">
              <div>
                <p className="opacity-70">Всего заработано</p>
                <p className="font-bold">{balance.total_earned.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} сом.</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="opacity-70">Выведено</p>
                <p className="font-bold">{balance.total_withdrawn.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} сом.</p>
              </div>
            </div>

            <button
              onClick={() => setShowPayoutForm(!showPayoutForm)}
              className="w-full bg-white/20 hover:bg-white/30 transition-colors rounded-xl py-3 flex items-center justify-center gap-2 font-medium text-sm"
            >
              <Send size={15} />
              {showPayoutForm ? "Закрыть" : "Вывести средства"}
            </button>
          </div>
        )}

        {/* Форма вывода */}
        {showPayoutForm && balance !== null && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Заявка на вывод</h2>
            <form onSubmit={handlePayout} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Сумма (сом.)</label>
                <input
                  type="number"
                  min="100"
                  max={balance.balance}
                  step="0.01"
                  placeholder={`До ${balance.balance.toLocaleString()} сом.`}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="input"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Минимум 100 сом.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Реквизиты</label>
                <textarea
                  placeholder="Номер карты или расчётный счёт (р/с, банк, БИК)"
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  className="input h-24 resize-none text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={payoutLoading}
                className="btn-primary w-full py-3"
              >
                {payoutLoading ? "Отправляем..." : "Отправить заявку"}
              </button>
            </form>
          </div>
        )}

        {/* История выплат */}
        {balance && balance.payouts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="font-semibold text-gray-800">История выплат</span>
              {showHistory ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {showHistory && (
              <div className="border-t border-gray-100">
                {balance.payouts.map((p) => {
                  const StatusIcon = PAYOUT_STATUS_ICONS[p.status];
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${PAYOUT_STATUS_COLORS[p.status]}`}>
                        <StatusIcon size={17} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{p.amount.toLocaleString()} сом.</p>
                        <p className="text-xs text-gray-400 truncate">{p.bank_details}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PAYOUT_STATUS_COLORS[p.status]}`}>
                          {PAYOUT_STATUS_LABELS[p.status]}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(p.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Главные метрики */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Выручка", value: `${totalRevenue.toLocaleString()} сом.`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", sub: "доставленные заказы" },
            { label: "Все заказы", value: orders.length, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50", sub: `${pendingOrders} новых` },
            { label: "Товаров", value: products.length, icon: Package, color: "text-purple-600", bg: "bg-purple-50", sub: `${activeProducts} активных` },
            { label: "Доставлено", value: deliveredOrders, icon: ArrowUp, color: "text-orange-600", bg: "bg-orange-50", sub: "выполненных заказов" },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Заказы по статусам */}
        {orders.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Заказы по статусам</h2>
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{STATUS_LABELS[status] || status}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${STATUS_COLORS[status] || "bg-gray-400"} rounded-full transition-all`}
                      style={{ width: `${(count / orders.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Топ товары */}
        {topProducts.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Топ товары по выручке</h2>
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700 line-clamp-1 flex-1 mr-3">
                      <span className="text-gray-400 font-bold mr-1">#{i + 1}</span>
                      {p.title}
                    </span>
                    <span className="font-bold text-primary shrink-0">{p.revenue.toLocaleString()} сом.</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Продано: {p.count} шт.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Товары с низким остатком */}
        {products.filter((p) => p.stock <= 5 && p.is_active).length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Star size={16} className="text-yellow-500" /> Заканчивается на складе
            </h2>
            <div className="space-y-2">
              {products.filter((p) => p.stock <= 5 && p.is_active).map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 line-clamp-1 flex-1 mr-3">{p.title}</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${p.stock === 0 ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                    {p.stock} шт.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {orders.length === 0 && products.length === 0 && (
          <div className="text-center py-16">
            <TrendingUp size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Данных пока нет</p>
            <p className="text-gray-400 text-sm mt-1">Добавьте товары чтобы начать</p>
          </div>
        )}
      </div>
    </div>
  );
}
