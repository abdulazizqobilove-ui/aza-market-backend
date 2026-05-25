"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import ProductCard from "@/components/ui/ProductCard";
import api, { Product, Category } from "@/lib/api";

export default function SubcategoryPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const category = CATEGORIES.find((c) => c.slug === slug);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!category) return;
    setLoadingProducts(true);

    // Try to find matching DB category by name, then fetch by category_id
    api.get<Category[]>("/products/categories")
      .then((r) => {
        const match = r.data.find(
          (c) => c.name.toLowerCase() === category.name.toLowerCase()
        );
        const params = match
          ? { category_id: match.id, limit: 40, sort: "rating" }
          : { q: category.name, limit: 40, sort: "rating" };
        return api.get<{ items: Product[] }>("/products", { params });
      })
      .then((r) => setProducts(r.data.items))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [category?.slug]);

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">Категория не найдена</p>
        <button onClick={() => router.push("/catalog")} className="text-primary font-medium">← Каталог</button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Hero header */}
      <div className={`bg-gradient-to-br ${category.color} px-4 pt-5 pb-6 relative overflow-hidden`}>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-2 w-24 h-24 rounded-full bg-white/5" />

        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 mb-4"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        <div className="flex items-end justify-between z-10 relative">
          <div>
            <p className="text-white/70 text-xs font-medium mb-1">Каталог</p>
            <h1 className="text-white text-xl font-bold leading-tight">{category.name}</h1>
            <p className="text-white/60 text-xs mt-1">{category.subcategories.length} подкатегорий</p>
          </div>
          <div className="text-5xl drop-shadow-lg">{category.emoji}</div>
        </div>
      </div>

      {/* Subcategories */}
      <div className="p-3 grid grid-cols-3 gap-2">
        {category.subcategories.map((sub) => (
          <button
            key={sub.name}
            onClick={() => router.push(`/?q=${encodeURIComponent(sub.name)}`)}
            className="bg-white rounded-2xl p-3 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform text-center"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-sm`}>
              <span className="text-xl">{sub.emoji}</span>
            </div>
            <p className="text-[11px] font-semibold text-gray-700 leading-tight line-clamp-2">{sub.name}</p>
          </button>
        ))}
      </div>

      {/* Products section */}
      <div className="px-3">
        <h2 className="text-base font-bold text-gray-900 mb-3">Товары в категории</h2>

        {loadingProducts ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="bg-gray-200" style={{ aspectRatio: "3/4" }} />
                <div className="p-2.5 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="text-5xl mb-3">{category.emoji}</div>
            <p className="text-gray-500 font-medium">Товары ещё не добавлены</p>
            <p className="text-gray-400 text-sm mt-1">В этой категории пока нет товаров</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
