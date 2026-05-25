"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, ChevronDown, CheckCircle } from "lucide-react";
import api, { Order } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

const REASONS = [
  "Товар не соответствует описанию",
  "Получил не тот товар",
  "Повреждён при доставке",
  "Брак / дефект товара",
  "Передумал / не подошёл",
  "Другая причина",
];

export default function ReturnsPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({ order_id: "", item_id: "", reason: "", comment: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>("/orders")
      .then((r) => setOrders(r.data.filter((o) => o.status === "delivered")))
      .catch(() => {});
  }, [user]);

  const selectedOrder = orders.find((o) => String(o.id) === form.order_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason) { toast.error("Выберите причину возврата"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setStep("success");
  };

  if (step === "success") return (
    <div className="bg-gray-100 min-h-screen pb-24">
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold">Возврат товара</h1>
      </div>
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-5">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Заявка отправлена!</h2>
        <p className="text-gray-500 text-sm mb-2">Мы рассмотрим вашу заявку в течение 3–5 рабочих дней</p>
        <p className="text-gray-400 text-xs mb-8">Ответ придёт на номер телефона, указанный при регистрации</p>
        <Link href="/" className="bg-primary text-white font-semibold px-8 py-3.5 rounded-2xl">
          На главную
        </Link>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen pb-24">
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold">Возврат товара</h1>
      </div>

      {/* Info */}
      <div className="mx-3 mt-3 bg-blue-50 rounded-2xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">Условия возврата</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>· Возврат возможен в течение 14 дней с момента получения</li>
          <li>· Товар должен быть в оригинальной упаковке</li>
          <li>· Деньги возвращаются в течение 5–7 рабочих дней</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="p-3 mt-0 space-y-3">
        {/* Order select */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Выберите заказ</label>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400">Нет доставленных заказов</p>
          ) : (
            <div className="relative">
              <select
                required
                value={form.order_id}
                onChange={(e) => setForm({ ...form, order_id: e.target.value, item_id: "" })}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm text-gray-800 outline-none focus:border-primary"
              >
                <option value="">Выберите заказ...</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>Заказ #{o.id} — {o.total_price.toLocaleString()} сом.</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Item select */}
        {selectedOrder && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Какой товар хотите вернуть?</label>
            <div className="space-y-2">
              {selectedOrder.items.map((item) => (
                <label key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.item_id === String(item.id) ? "border-primary bg-primary-light" : "border-gray-100 bg-gray-50"}`}>
                  <input type="radio" name="item" value={item.id} checked={form.item_id === String(item.id)}
                    onChange={() => setForm({ ...form, item_id: String(item.id) })} className="accent-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.product.title}</p>
                    <p className="text-xs text-gray-400">{item.quantity} шт. · {item.price.toLocaleString()} сом.</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Reason */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Причина возврата</label>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.reason === r ? "border-primary bg-primary-light" : "border-gray-100 bg-gray-50"}`}>
                <input type="radio" name="reason" value={r} checked={form.reason === r}
                  onChange={() => setForm({ ...form, reason: r })} className="accent-primary" />
                <span className="text-sm text-gray-700">{r}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Комментарий <span className="font-normal text-gray-400">(необязательно)</span></label>
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-primary h-24"
            placeholder="Опишите проблему подробнее..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || !form.order_id || !form.item_id || !form.reason}
          className="w-full bg-primary disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          {loading ? "Отправляем..." : "Отправить заявку"}
        </button>
      </form>
    </div>
  );
}
