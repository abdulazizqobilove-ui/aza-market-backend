"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Package, TrendingUp, Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const BENEFITS = [
  { icon: TrendingUp, title: "Дополнительный доход", desc: "До 80 000 сом. в месяц за приём и выдачу заказов" },
  { icon: Package, title: "Простая работа", desc: "Обучим всему. Специальный опыт не нужен" },
  { icon: Clock, title: "Гибкий график", desc: "Работайте в удобное для вас время" },
  { icon: MapPin, title: "Рядом с домом", desc: "Открывайте пункт там, где вам удобно" },
];

export default function PickupPointPage() {
  const [step, setStep] = useState<"info" | "form" | "success">("info");
  const [form, setForm] = useState({ name: "", phone: "", city: "", address: "", area: "", comment: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <h1 className="text-lg font-bold">Открыть пункт выдачи</h1>
      </div>
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-5">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Заявка отправлена!</h2>
        <p className="text-gray-500 text-sm mb-2">Наш менеджер свяжется с вами в течение 1–2 рабочих дней</p>
        <p className="text-gray-400 text-xs mb-8">Мы поможем вам на каждом шаге открытия пункта выдачи</p>
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
        <h1 className="text-lg font-bold">Открыть пункт выдачи</h1>
      </div>

      {step === "info" && (
        <div className="p-3 space-y-3">
          {/* Hero */}
          <div className="bg-gradient-to-br from-primary to-blue-900 rounded-3xl p-5 text-white relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/5" />
            <MapPin size={28} className="mb-3 opacity-90" />
            <h2 className="text-xl font-bold mb-1">Станьте партнёром AZA Market</h2>
            <p className="text-white/75 text-sm leading-relaxed">
              Откройте пункт выдачи заказов у себя и зарабатывайте на каждой выдаче
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center mb-3">
                  <Icon size={20} className="text-primary" />
                </div>
                <p className="text-sm font-bold text-gray-800 mb-1 leading-tight">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-semibold text-gray-800 mb-3">Что нужно</p>
            {[
              "Помещение от 10 м² в проходимом месте",
              "Интернет и компьютер или смартфон",
              "Желание работать и развиваться",
            ].map((r) => (
              <div key={r} className="flex items-center gap-2.5 py-2 border-b last:border-0 border-gray-50">
                <div className="w-5 h-5 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                  <CheckCircle size={12} className="text-primary" />
                </div>
                <span className="text-sm text-gray-700">{r}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep("form")}
            className="w-full bg-primary text-white font-semibold py-4 rounded-2xl text-base shadow-sm"
          >
            Подать заявку
          </button>
        </div>
      )}

      {step === "form" && (
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <p className="font-semibold text-gray-800">Контактные данные</p>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Ваше имя</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                placeholder="Иван Иванов" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Номер телефона</label>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                placeholder="+7 (999) 123-45-67" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <p className="font-semibold text-gray-800">Адрес помещения</p>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Город</label>
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                placeholder="Москва" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Адрес</label>
              <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                placeholder="ул. Примерная, д. 1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Площадь (м²)</label>
              <input type="number" min="10" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400"
                placeholder="20" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Комментарий <span className="text-gray-400">(необязательно)</span></label>
            <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-purple-400 h-20"
              placeholder="Дополнительная информация..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-primary disabled:opacity-60 text-white font-semibold py-4 rounded-2xl">
            {loading ? "Отправляем..." : "Отправить заявку"}
          </button>
        </form>
      )}
    </div>
  );
}
