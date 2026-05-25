"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Store, Package, Star, Search, SlidersHorizontal } from "lucide-react";
import api, { Product } from "@/lib/api";

interface Shop {
  id: number;
  username: string;
  full_name?: string;
  shop_name?: string;
  shop_description?: string;
  shop_banner_url?: string;
  shop_logo_url?: string;
  created_at: string;
}

const SORT_OPTIONS = [
  { key: "newest", label: "Новинки" },
  { key: "price_asc", label: "Дешевле" },
  { key: "price_desc", label: "Дороже" },
  { key: "rating", label: "По рейтингу" },
];

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get<Shop>(`/shop/${id}`).then((r) => setShop(r.data)).catch(() => router.push("/"));
    api.get<Product[]>(`/shop/${id}/products`).then((r) => setProducts(r.data)).catch(() => {});
  }, [id]);

  // Unique categories from seller's products
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      if (p.category) map.set(p.category.slug, p.category.name);
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (q.trim()) list = list.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()) || (p.brand || "").toLowerCase().includes(q.toLowerCase()));
    if (activeCategory) list = list.filter((p) => p.category?.slug === activeCategory);
    if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return list;
  }, [products, q, sort, activeCategory]);

  if (!shop) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  const displayName = shop.shop_name || shop.full_name || shop.username;

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
        >
          <ChevronLeft size={22} className="text-gray-700" />
        </button>
      </div>

      {/* Banner */}
      <div className="relative h-52 bg-gradient-to-br from-primary to-blue-700">
        {shop.shop_banner_url && (
          <Image src={`http://192.168.1.45:8000${shop.shop_banner_url}`} alt="banner" fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Shop identity */}
      <div className="bg-white px-4 pb-4 -mt-1 relative">
        <div className="flex items-end gap-4 -mt-10 mb-4">
          <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white shrink-0">
            {shop.shop_logo_url ? (
              <Image src={`http://192.168.1.45:8000${shop.shop_logo_url}`} alt="logo" width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <Store size={32} className="text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-10">
            <h1 className="text-lg font-bold text-gray-900 truncate">{displayName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              На AZA Market с {new Date(shop.created_at).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex py-3 border-y border-gray-100 mb-3">
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-gray-900">{products.length}</p>
            <p className="text-xs text-gray-400">Товаров</p>
          </div>
          <div className="text-center flex-1 border-x border-gray-100">
            <p className="text-lg font-bold text-gray-900">
              {products.length > 0 ? (products.reduce((s, p) => s + (p.rating || 0), 0) / products.length).toFixed(1) : "—"}
            </p>
            <p className="text-xs text-gray-400">Рейтинг</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-gray-900">{products.reduce((s, p) => s + (p.reviews_count || 0), 0)}</p>
            <p className="text-xs text-gray-400">Отзывов</p>
          </div>
        </div>

        {shop.shop_description && (
          <p className="text-sm text-gray-600 leading-relaxed">{shop.shop_description}</p>
        )}
      </div>

      {/* Catalog toolbar */}
      <div className="bg-white mt-2 px-3 py-3 sticky top-0 z-10 border-b border-gray-100 space-y-3 shadow-sm">
        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по магазину..."
              className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${showFilters ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>

        {/* Sort pills — shown when filters open */}
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setSort(o.key)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${sort === o.key ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${!activeCategory ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Все
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveCategory(activeCategory === c.slug ? null : c.slug)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${activeCategory === c.slug ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products grid */}
      <div className="px-3 mt-3">
        <p className="text-xs text-gray-400 mb-3 px-1">{filtered.length} товаров</p>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">{q ? "Ничего не найдено" : "Товаров пока нет"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => {
              const img = p.images?.find((i) => i.is_main) || p.images?.[0];
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform"
                >
                  <div className="relative h-40 bg-gray-50">
                    {img ? (
                      <Image src={`http://192.168.1.45:8000${img.url}`} alt={p.title} fill className="object-contain p-2" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                    )}
                    {p.stock === 0 && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-lg">Нет в наличии</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {p.brand && <p className="text-xs text-gray-400 truncate">{p.brand}</p>}
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug mt-0.5">{p.title}</p>
                    <p className="text-base font-bold text-primary mt-2">{p.price.toLocaleString()} сом.</p>
                    {p.reviews_count > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={10} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-400">{(p.rating || 0).toFixed(1)} · {p.reviews_count}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
