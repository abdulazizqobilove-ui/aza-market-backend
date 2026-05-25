"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import api, { Product } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import ProductCard from "@/components/ui/ProductCard";

export default function FavoritesPage() {
  const { user } = useAuthStore();
  const { ids, fetch: fetchFavorites } = useFavoritesStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<Product[]>("/favorites")
      .then((r) => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Sync list when favorites store changes (e.g. user removes from another card)
  useEffect(() => {
    setProducts((prev) => prev.filter((p) => ids.has(p.id)));
  }, [ids]);

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <Heart size={64} className="text-gray-200 mb-4" />
      <p className="text-gray-500 mb-4">Войдите чтобы просмотреть избранное</p>
      <Link href="/auth/login" className="btn-primary">Войти</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
          <Heart size={20} className="text-red-500 fill-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Избранное</h1>
          {!loading && <p className="text-sm text-gray-500">{products.length} товаров</p>}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-t-2xl" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart size={40} className="text-red-200" />
          </div>
          <p className="text-xl font-semibold text-gray-700 mb-2">Список избранного пуст</p>
          <p className="text-gray-400 text-sm mb-6">Нажимайте ♡ на карточках товаров, чтобы сохранять понравившиеся</p>
          <Link href="/" className="btn-primary">Перейти к покупкам</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
