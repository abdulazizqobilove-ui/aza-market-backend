"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Store, CheckCircle, Package, TrendingUp, Shield } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

export default function BecomeSellerPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [step, setStep] = useState<"info" | "form" | "done">("info");
  const [form, setForm] = useState({ shop_name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shop_name.trim()) { toast.error("Введите название магазина"); return; }
    if (!user) { router.push("/auth/login"); return; }
    setLoading(true);
    try {
      await api.post("/seller-applications", form);
      setStep("done");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Ошибка при отправке");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Заявка отправлена!</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Мы рассмотрим вашу заявку и уведомим вас в разделе уведомлений. Обычно это занимает до 24 часов.
        </p>
        <Link href="/profile" className="bg-primary text-white font-semibold px-10 py-3.5 rounded-2xl">
          Вернуться в профиль
        </Link>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
          <button onClick={() => setStep("info")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold">Заявка продавца</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Название магазина *
              </label>
              <input
                value={form.shop_name}
                onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="Например: Электроника Душанбе"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Что планируете продавать?
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-none h-28"
                placeholder="Опишите кратко ваш бизнес и товары..."
              />
            </div>
          </div>

          <div className="bg-primary/5 rounded-2xl p-4">
            <p className="text-xs text-primary font-medium">
              После одобрения заявки ваш аккаунт получит статус продавца и вы сможете добавлять товары.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-4 rounded-2xl text-sm"
          >
            {loading ? "Отправляем..." : "Отправить заявку"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold">Стать продавцом</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-blue-700 rounded-3xl p-6 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Store size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Откройте магазин на AZA Market</h2>
          <p className="text-blue-100 text-sm leading-relaxed">
            Продавайте товары миллионам покупателей по всему Таджикистану
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-50">
          {[
            { icon: Package, title: "Простое управление товарами", desc: "Добавляйте товары, фото и описания в пару кликов" },
            { icon: TrendingUp, title: "Аналитика и выручка", desc: "Следите за продажами и заказами в реальном времени" },
            { icon: Shield, title: "Безопасные выплаты", desc: "Вывод средств на карту. Комиссия платформы — 10%" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 px-4 py-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => user ? setStep("form") : router.push("/auth/login")}
          className="w-full bg-primary text-white font-semibold py-4 rounded-2xl text-sm"
        >
          Подать заявку
        </button>

        <p className="text-center text-xs text-gray-400">
          Нажимая «Подать заявку», вы соглашаетесь с условиями для продавцов
        </p>
      </div>
    </div>
  );
}
