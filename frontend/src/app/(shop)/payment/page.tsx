"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Check, X, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

interface Card {
  id: number;
  number: string;
  expiry: string;
  type: "visa" | "mastercard" | "mir";
}

function detectType(num: string): "visa" | "mastercard" | "mir" {
  if (num.startsWith("4")) return "visa";
  if (num.startsWith("5") || num.startsWith("2")) return "mastercard";
  return "mir";
}

function CardBadge({ type }: { type: string }) {
  if (type === "visa") return <span className="font-bold italic text-base tracking-tight text-white">VISA</span>;
  if (type === "mastercard") return (
    <div className="flex items-center">
      <div className="w-5 h-5 rounded-full bg-red-400" />
      <div className="w-5 h-5 rounded-full bg-yellow-300 -ml-2.5" />
    </div>
  );
  return <span className="font-bold text-sm text-white">МИР</span>;
}

const formatCardNumber = (val: string) => {
  const digits = val.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

const formatExpiry = (val: string) => {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
};

export default function PaymentPage() {
  const [cards, setCards] = useState<Card[]>([
    { id: 1, number: "4276 •••• •••• 3721", expiry: "08/27", type: "visa" },
  ]);
  const [defaultId, setDefaultId] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: "", expiry: "", cvv: "" });
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = form.number.replace(/\D/g, "");
    if (digits.length < 16) { toast.error("Введите полный номер карты"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const masked = digits.slice(0, 4) + " •••• •••• " + digits.slice(12);
    const newCard: Card = { id: Date.now(), number: masked, expiry: form.expiry, type: detectType(digits) };
    setCards((prev) => [...prev, newCard]);
    setDefaultId(newCard.id);
    setForm({ number: "", expiry: "", cvv: "" });
    setShowForm(false);
    setLoading(false);
    toast.success("Карта добавлена");
  };

  const remove = (id: number) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (defaultId === id) {
      const remaining = cards.filter((c) => c.id !== id);
      if (remaining.length > 0) setDefaultId(remaining[0].id);
    }
    toast.success("Карта удалена");
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Способ оплаты</h1>
      </div>

      <div className="p-3 space-y-2">

        {/* Cards list */}
        {cards.map((card) => (
          <div key={card.id}
            className={`relative flex items-center gap-4 bg-white rounded-2xl px-4 py-4 shadow-sm border-2 transition-colors cursor-pointer ${defaultId === card.id ? "border-primary" : "border-transparent"}`}
            onClick={() => setDefaultId(card.id)}
          >
            {/* Card icon colored */}
            <div className="w-12 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <CardBadge type={card.type} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 font-mono">{card.number}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.expiry}</p>
            </div>

            {defaultId === card.id ? (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Check size={11} className="text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />
            )}

            <button
              onClick={(e) => { e.stopPropagation(); remove(card.id); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {/* Other methods */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3.5 px-4 py-4">
            <span className="text-xl">💵</span>
            <span className="text-sm text-gray-700 flex-1">Наличными при получении</span>
          </div>
        </div>

        {/* Add card */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm flex items-center gap-3 border-2 border-dashed border-gray-200 active:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus size={18} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-gray-600">Добавить карту</span>
          </button>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-800">Новая карта</p>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <X size={14} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div className="relative">
                <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" inputMode="numeric" required
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: formatCardNumber(e.target.value) })}
                  placeholder="0000 0000 0000 0000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary font-mono tracking-wider"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" inputMode="numeric" required
                  value={form.expiry}
                  onChange={(e) => setForm({ ...form, expiry: formatExpiry(e.target.value) })}
                  placeholder="MM/YY"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary font-mono text-center"
                />
                <input
                  type="password" inputMode="numeric" required maxLength={3}
                  value={form.cvv}
                  onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                  placeholder="CVV"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary font-mono text-center"
                />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-primary text-white font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-60">
                {loading ? "Добавляем..." : "Добавить"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
