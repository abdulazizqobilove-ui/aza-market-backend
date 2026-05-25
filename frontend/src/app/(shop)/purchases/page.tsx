"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShoppingBag, Star, RotateCcw } from "lucide-react";
import api, { Order } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function PurchasesPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>("/orders")
      .then((r) => setOrders(r.data.filter((o) => o.status === "delivered")))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="bg-gray-100 min-h-screen pb-24">
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold">Покупки</h1>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="w-24 h-24 bg-primary-light rounded-full flex items-center justify-center mb-4">
            <ShoppingBag size={40} className="text-blue-300" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">Покупок пока нет</p>
          <p className="text-gray-400 text-sm mb-6 text-center">Здесь будут отображаться ваши завершённые заказы</p>
          <Link href="/" className="bg-primary text-white font-semibold px-6 py-3 rounded-2xl">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">Доставлен</span>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => {
                  const img = item.product.images?.find((i) => i.is_main) || item.product.images?.[0];
                  return (
                    <Link key={item.id} href={`/products/${item.product.id}`} className="flex gap-3 items-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {img ? (
                          <Image src={`http://192.168.1.45:8000${img.url}`} alt={item.product.title} width={64} height={64} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{item.product.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.quantity} шт.</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{(item.price * item.quantity).toLocaleString()} сом.</p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                <Link href={`/products/${order.items[0]?.product.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                  <Star size={14} /> Оставить отзыв
                </Link>
                <Link href="/returns"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                  <RotateCcw size={14} /> Вернуть
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
