"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Package, Edit2, Trash2, Eye, EyeOff,
  RefreshCw,
} from "lucide-react";
import api, { Product, imgUrl } from "@/lib/api";
import { clsx } from "clsx";

// ── Main Page ──────────────────────────────────────────────────────────
export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Product[]>("/seller/products");
      setProducts(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (p: Product) => {
    await api.patch(`/products/${p.id}`, { is_active: !p.is_active });
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
  };

  const del = async (id: number) => {
    if (!confirm("Удалить товар?")) return;
    await api.delete(`/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = products.filter((p) =>
    !q || p.title.toLowerCase().includes(q.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Товары</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} товаров в вашем магазине</p>
        </div>
        <button onClick={() => router.push("/products/new")} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Добавить товар
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию или бренду..." />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">Товаров не найдено</p>
            <button onClick={() => router.push("/products/new")} className="btn-primary mt-4 text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Добавить первый товар
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Товар</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Категория</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Цена</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Остаток</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Продано</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const img = p.images.find((i) => i.is_main) ?? p.images[0];
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {img ? <img src={imgUrl(img.url) ?? ""} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 max-w-[200px] truncate">{p.title}</p>
                          {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{p.category.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-gray-900">{p.price.toLocaleString()} сом.</p>
                      {p.original_price && <p className="text-xs text-gray-400 line-through">{p.original_price.toLocaleString()}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx("text-sm font-semibold", p.stock === 0 ? "text-red-500" : p.stock <= 5 ? "text-yellow-600" : "text-gray-800")}>
                        {p.stock} шт.
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-600">{p.sales_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggle(p)} className={clsx("badge", p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                        {p.is_active ? "Активен" : "Скрыт"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => toggle(p)} title={p.is_active ? "Скрыть" : "Показать"}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-400">
                          {p.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => router.push(`/products/${p.id}`)} title="Редактировать"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition text-gray-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => del(p.id)} title="Удалить"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
