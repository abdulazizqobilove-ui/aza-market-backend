"use client";
import Link from "next/link";
import Image from "next/image";
import { Star, Heart, ShoppingCart, Plus, Minus } from "lucide-react";
import { Product } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import { useCartStore } from "@/store/cart";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ProductCard({ product }: { product: Product }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const toggle = useFavoritesStore((s) => s.toggle);
  const has = useFavoritesStore((s) => s.has);
  const { items, add, updateQty } = useCartStore();
  const faved = has(product.id);
  const [adding, setAdding] = useState(false);

  const cartItem = items.find((i) => i.product.id === product.id);
  const inCart = !!cartItem;

  const mainImage = product.images.find((i) => i.is_main) || product.images[0];

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push("/auth/login"); return; }
    await toggle(product.id);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push("/auth/login"); return; }
    if (product.stock === 0) return;
    setAdding(true);
    try {
      await add(product.id, 1);
    } catch {
      toast.error("Ошибка при добавлении");
    } finally {
      setAdding(false);
    }
  };

  const handleMinus = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItem) return;
    await updateQty(cartItem.id, cartItem.quantity - 1);
  };

  const handlePlus = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItem) return;
    if (cartItem.quantity >= product.stock) return;
    await updateQty(cartItem.id, cartItem.quantity + 1);
  };

  return (
    <Link href={`/products/${product.id}`} className="flex flex-col bg-white rounded-2xl overflow-hidden group active:scale-[0.98] transition-transform">
      <div className="relative w-full bg-gray-50" style={{ aspectRatio: "3/4" }}>
        {mainImage ? (
          <Image
            src={`http://192.168.1.45:8000${mainImage.url}`}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">📦</div>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full shadow">Нет в наличии</span>
          </div>
        )}

        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow"
        >
          <Heart size={15} className={faved ? "fill-red-500 text-red-500" : "text-gray-400"} />
        </button>
      </div>

      <div className="p-2.5 flex flex-col gap-1">
        <span className="text-base font-bold text-primary leading-tight">{product.price.toLocaleString()} сом.</span>

        {product.brand && (
          <p className="text-xs text-gray-500 font-medium truncate">{product.brand}</p>
        )}

        <p className="text-xs text-gray-800 line-clamp-2 leading-snug">{product.title}</p>

        <div className="flex items-center gap-1 mt-0.5">
          <Star size={11} className={product.reviews_count > 0 ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
          <span className="text-xs text-gray-500">{product.reviews_count > 0 ? product.rating.toFixed(1) : "0.0"}</span>
          <span className="text-xs text-gray-400">· {product.reviews_count} отзывов</span>
        </div>

        {product.stock > 0 ? (
          inCart ? (
            <div
              onClick={(e) => e.preventDefault()}
              className="mt-1.5 flex items-center justify-between border-2 border-primary rounded-xl overflow-hidden"
            >
              <button
                onClick={handleMinus}
                className="w-9 h-9 flex items-center justify-center text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
              >
                <Minus size={15} strokeWidth={2.5} />
              </button>
              <span className="text-sm font-bold text-primary">{cartItem.quantity}</span>
              <button
                onClick={handlePlus}
                className="w-9 h-9 flex items-center justify-center text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="mt-1.5 w-full flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold py-2.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60"
            >
              {adding
                ? <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                : <ShoppingCart size={13} />}
              В корзину
            </button>
          )
        ) : (
          <div className="mt-1.5 w-full flex items-center justify-center gap-1.5 bg-gray-100 text-gray-400 text-xs font-medium py-2.5 rounded-xl">
            Нет в наличии
          </div>
        )}
      </div>
    </Link>
  );
}
