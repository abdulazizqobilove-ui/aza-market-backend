"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Phone, ArrowLeft, Banknote, CreditCard, Check } from "lucide-react";
import api from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

const PAYMENT_METHODS = [
  { id: "cash", icon: Banknote, label: "Наличными при получении", desc: "Оплата курьеру при доставке" },
  { id: "card", icon: CreditCard, label: "Банковская карта", desc: "Visa, Mastercard" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, total, clear } = useCartStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState("cash");
  const [form, setForm] = useState({
    delivery_city: "",
    delivery_address: "",
    contact_phone: user?.phone || "",
  });

  // Filter selected items from cart
  const selectedIds = searchParams.get("ids")?.split(",").map(Number) || [];
  const selectedItems = selectedIds.length > 0
    ? items.filter((i) => selectedIds.includes(i.id))
    : items;

  const orderTotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalQty = selectedItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (user?.phone) setForm((f) => ({ ...f, contact_phone: user.phone || "" }));
  }, [user]);

  if (selectedItems.length === 0) {
    router.push("/cart");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/orders", {
        ...form,
        payment_method: payment,
        item_ids: selectedIds.length > 0 ? selectedIds : undefined,
      });
      await clear();
      toast.success("Заказ оформлен!");
      router.push("/orders");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка при оформлении");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-44">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Оформление заказа</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-3 space-y-3">

        {/* Order items summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-gray-800 mb-3">
            Товары · {totalQty} шт.
          </p>
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-700 line-clamp-1 flex-1">{item.product.title}</p>
                <p className="text-xs text-gray-400 shrink-0">× {item.quantity}</p>
                <p className="text-sm font-semibold text-gray-800 shrink-0">
                  {(item.product.price * item.quantity).toLocaleString()} сом.
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
            <span className="text-sm text-gray-500">Итого</span>
            <span className="text-lg font-bold text-primary">{orderTotal.toLocaleString()} сом.</span>
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-gray-800">Доставка</p>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Город</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                value={form.delivery_city}
                onChange={(e) => setForm({ ...form, delivery_city: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="Душанбе"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Адрес</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="ул. Рудаки, д. 5, кв. 12"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Телефон</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="+992 90 000 00 00"
              />
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-gray-800 mb-3">Способ оплаты</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPayment(id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-colors text-left ${
                  payment === id ? "border-primary bg-primary/5" : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${payment === id ? "bg-primary" : "bg-gray-200"}`}>
                  <Icon size={18} className={payment === id ? "text-white" : "text-gray-500"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${payment === id ? "border-primary bg-primary" : "border-gray-300"}`}>
                  {payment === id && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Fixed bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-4 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-500">К оплате</span>
          <span className="text-xl font-bold text-gray-900">{orderTotal.toLocaleString()} сом.</span>
        </div>
        <button
          onClick={handleSubmit as any}
          disabled={loading}
          className="w-full bg-primary text-white font-bold py-4 rounded-2xl text-base disabled:opacity-60"
        >
          {loading ? "Оформляем..." : "Подтвердить заказ"}
        </button>
      </div>
    </div>
  );
}
