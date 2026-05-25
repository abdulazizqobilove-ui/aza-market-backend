"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Bell, Trash2 } from "lucide-react";
import api, { Product } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

export default function WaitlistPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<Product[]>("/waitlist")
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const remove = async (id: number) => {
    await api.delete(`/waitlist/${id}`).catch(() => {});
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast.success("Удалено из листа ожидания");
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-24">
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Лист ожидания</h1>
          {!loading && items.length > 0 && <p className="text-xs text-gray-400">{items.length} товаров</p>}
        </div>
      </div>

      {/* Info banner */}
      <div className="mx-3 mt-3 bg-primary-light rounded-2xl p-4 flex gap-3 items-start">
        <Bell size={18} className="text-primary-light0 shrink-0 mt-0.5" />
        <p className="text-sm text-primary">Мы уведомим вас, когда товар появится в наличии</p>
      </div>

      {loading ? (
        <div className="p-3 mt-3 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="w-24 h-24 bg-primary-light rounded-full flex items-center justify-center mb-4">
            <Clock size={40} className="text-blue-300" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">Лист ожидания пуст</p>
          <p className="text-gray-400 text-sm mb-6 text-center">Товары без остатка из избранного появятся здесь</p>
          <Link href="/favorites" className="bg-primary text-white font-semibold px-6 py-3 rounded-2xl">
            Избранное
          </Link>
        </div>
      ) : (
        <div className="p-3 mt-3 space-y-3">
          {items.map((p) => {
            const img = p.images?.find((i) => i.is_main) || p.images?.[0];
            return (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-3 items-center">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {img ? (
                    <Image src={`http://192.168.1.45:8000${img.url}`} alt={p.title} width={64} height={64} className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.price.toLocaleString()} сом.</p>
                  <span className="inline-block mt-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    Нет в наличии
                  </span>
                </div>
                <button onClick={() => remove(p.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 shrink-0">
                  <Trash2 size={16} className="text-gray-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
