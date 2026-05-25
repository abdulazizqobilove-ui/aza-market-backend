"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api, { Product, ProductsResponse } from "@/lib/api";
import ProductCard from "@/components/ui/ProductCard";
import { useAuthStore } from "@/store/auth";

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{id:number;name:string;parent_id:number|null}[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "seller" || user?.role === "admin") {
      router.replace("/seller/products");
    }
  }, [user, router]);

  const q = searchParams.get("q") || "";
  const categoryId = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";

  useEffect(() => {
    api.get<Category[]>("/products/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => { setLoading(true); setPage(1); }, [q, categoryId, sort]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", sort });
    if (q) params.set("q", q);
    if (categoryId) params.set("category_id", categoryId);
    api.get<ProductsResponse>(`/products?${params}`)
      .then((r) => { setProducts(r.data.items); setTotal(r.data.total); setPages(r.data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, q, categoryId, sort]);

  const topLevel = categories.filter((c) => !c.parent_id);

  const navigate = (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    window.location.href = url.toString();
  };


  return (
    <div>

      {/* Баннер */}
      {!q && !categoryId && (
        <div className="mx-3 mt-3 mb-1">
          <div className="bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-5 text-white relative overflow-hidden" style={{ minHeight: "120px" }}>
            <p className="text-xs font-medium opacity-70 mb-1">Только сейчас</p>
            <h2 className="text-xl font-bold leading-tight mb-2">Скидки до 70%<br />на все категории</h2>
            <a href="/?sort=price_asc" className="inline-block bg-white text-primary text-xs font-bold px-4 py-1.5 rounded-xl">
              Смотреть →
            </a>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-20">🛍️</div>
          </div>
        </div>
      )}

      {/* Тулбар */}
      {(q || categoryId) && (
        <div className="flex items-center gap-2 px-3 py-2.5 mt-1">
          <p className="text-sm font-bold text-gray-800">
            {q ? `«${q}»` : categories.find(c => String(c.id) === categoryId)?.name}
          </p>
          <span className="text-xs text-gray-400">{total} товаров</span>
          <a href="/" className="text-xs text-primary underline ml-1">Сбросить</a>
        </div>
      )}

      {/* Сетка товаров */}
      {loading ? (
        <div className="grid grid-cols-2 gap-0.5 px-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white animate-pulse" style={{ aspectRatio: "3/4" }}>
              <div className="h-3/4 bg-gray-100" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 px-4">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-xl font-semibold text-gray-700 mb-2">Ничего не найдено</p>
          <p className="text-gray-400 text-sm mb-6">Попробуйте другой запрос или категорию</p>
          <a href="/" className="btn-primary inline-block">На главную</a>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Пагинация */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 py-6 px-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline p-2.5 disabled:opacity-40">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-10 h-10 rounded-xl font-medium text-sm transition-all ${page === p ? "bg-primary text-white" : "btn-outline"}`}>{p}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-outline p-2.5 disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
