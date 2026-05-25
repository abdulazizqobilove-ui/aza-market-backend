"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Package, Eye, EyeOff, TrendingUp, Pencil, Trash2 } from "lucide-react";
import api, { Product } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

export default function SellerProductsPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<Product[]>("/seller/products").then((r) => setProducts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const toggleActive = async (product: Product) => {
    try {
      const res = await api.patch<Product>(`/products/${product.id}/toggle`);
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_active: res.data.is_active } : p));
      toast.success(res.data.is_active ? "Товар активирован" : "Товар скрыт");
    } catch {
      toast.error("Не удалось изменить статус");
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Удалить «${product.title}»? Это действие нельзя отменить.`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Товар удалён");
    } catch {
      toast.error("Не удалось удалить товар");
    }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">Нет доступа</div>;
  }

  const activeCount = products.filter((p) => p.is_active).length;
  const totalStock = products.reduce((s, p) => s + p.stock, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Мои товары</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} товаров · {activeCount} активных</p>
        </div>
        <Link href="/seller/products/new" className="btn-primary flex items-center gap-2 py-2.5 px-4">
          <Plus size={18} /> Добавить товар
        </Link>
      </div>

      {/* Stats */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Всего товаров", value: products.length, icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Активных", value: activeCount, icon: Eye, color: "text-green-500", bg: "bg-green-50" },
            { label: "В наличии (шт.)", value: totalStock, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 flex gap-4 items-center animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={36} className="text-gray-300" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-1">Товаров пока нет</p>
          <p className="text-gray-400 text-sm mb-6">Добавьте первый товар, чтобы начать продавать</p>
          <Link href="/seller/products/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Добавить первый товар
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const img = p.images.find((i) => i.is_main) || p.images[0];
            return (
              <div key={p.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm ${!p.is_active ? "opacity-70" : ""}`}>
                <div className="flex gap-3 p-3 items-center">
                  {/* Фото */}
                  <div className="relative w-16 h-16 shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                    {img ? (
                      <Image src={`http://192.168.1.45:8000${img.url}`} alt={p.title} fill className="object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                    {!p.is_active && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <EyeOff size={14} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Инфо */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 line-clamp-1">{p.title}</p>
                    <p className="text-primary font-bold text-sm mt-0.5">{p.price.toLocaleString()} сом.</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{p.stock} шт.</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.is_active ? "Активен" : "Скрыт"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Кнопки — отдельная строка, крупные, с подписями */}
                <div className="flex border-t border-gray-50">
                  <Link
                    href={`/seller/products/${p.id}/edit`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Pencil size={15} /> Редактировать
                  </Link>
                  <div className="w-px bg-gray-50" />
                  <button
                    onClick={() => toggleActive(p)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors ${p.is_active ? "text-orange-500 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}`}
                  >
                    {p.is_active ? <><EyeOff size={15} /> Скрыть</> : <><Eye size={15} /> Показать</>}
                  </button>
                  <div className="w-px bg-gray-50" />
                  <button
                    onClick={() => deleteProduct(p)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} /> Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
