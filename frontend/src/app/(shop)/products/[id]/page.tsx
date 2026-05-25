"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart, ChevronLeft, ChevronRight, Heart, Share2, ChevronDown, ChevronUp, Truck, Shield, Plus, Minus, Clock, Store } from "lucide-react";
import api, { Product } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import toast from "react-hot-toast";

interface Review { id: number; rating: number; text?: string; username: string; created_at: string; }
interface Shop { id: number; username: string; shop_name?: string; shop_logo_url?: string; }

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [inWaitlist, setInWaitlist] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const { items, add, updateQty } = useCartStore();
  const { user } = useAuthStore();
  const favToggle = useFavoritesStore((s) => s.toggle);
  const favHas = useFavoritesStore((s) => s.has);

  const cartItem = product ? items.find((i) => i.product.id === product.id) : null;
  const inCart = !!cartItem;
  const isFav = favHas(Number(id));

  useEffect(() => {
    api.get<Product>(`/products/${id}`).then((r) => {
      setProduct(r.data);
      api.get<Shop>(`/shop/${r.data.seller_id}`).then((s) => setShop(s.data)).catch(() => {});
    });
    api.get<Review[]>(`/products/${id}/reviews`).then((r) => setReviews(r.data)).catch(() => {});
    if (user) {
      api.get<{ product_id: number }[]>("/waitlist").then((r) => setInWaitlist(r.data.some((w) => w.product_id === Number(id)))).catch(() => {});
    }
  }, [id, user]);

  const toggleFav = async () => {
    if (!user) { router.push("/auth/login"); return; }
    await favToggle(Number(id));
  };

  const toggleWaitlist = async () => {
    if (!user) { router.push("/auth/login"); return; }
    try {
      if (inWaitlist) {
        await api.delete(`/waitlist/${id}`);
        setInWaitlist(false);
        toast.success("Удалено из листа ожидания");
      } else {
        await api.post(`/waitlist/${id}`);
        setInWaitlist(true);
        toast.success("Уведомим, когда появится в наличии!");
      }
    } catch {}
  };

  const handleAddToCart = async () => {
    if (!user) { router.push("/auth/login"); return; }
    setAdding(true);
    try {
      await add(product!.id, 1);
    } catch (err: any) {
      if (err?.response?.status === 401) router.push("/auth/login");
      else toast.error(err?.response?.data?.detail || "Ошибка при добавлении");
    } finally {
      setAdding(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push("/auth/login"); return; }
    setSubmitting(true);
    try {
      const res = await api.post<Review>(`/products/${id}/reviews`, reviewForm);
      setReviews((prev) => [res.data, ...prev]);
      setReviewForm({ rating: 5, text: "" });
      toast.success("Отзыв добавлен!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  const images = product.images;
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;
  const avgRating = product.rating || 0;

  return (
    <div className="bg-gray-50 min-h-screen pb-40">

      {/* Full-screen image */}
      <div className="relative bg-white" style={{ height: "420px" }}>
        {images[activeImage] ? (
          <Image
            src={`http://192.168.1.45:8000${images[activeImage].url}`}
            alt={product.title}
            fill
            className="object-contain"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200 text-8xl">📦</div>
        )}

        {/* Floating top buttons */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
          >
            <ChevronLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={toggleFav}
              className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
            >
              <Heart size={20} className={isFav ? "fill-red-500 text-red-500" : "text-gray-600"} />
            </button>
            <button className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md">
              <Share2 size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Discount badge */}
        {discount && (
          <div className="absolute bottom-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-xl">
            -{discount}%
          </div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
            {activeImage + 1}/{images.length}
          </div>
        )}

        {/* Image dots */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1.5 pb-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImage ? "bg-primary w-4" : "bg-gray-300"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Image thumbnails */}
      {images.length > 1 && (
        <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto border-b border-gray-100">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveImage(i)}
              className={`relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${i === activeImage ? "border-primary" : "border-gray-200"}`}
            >
              <Image src={`http://192.168.1.45:8000${img.url}`} alt="" fill className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}

      {/* Main info card */}
      <div className="bg-white mx-0 mt-2 px-4 py-4">
        {/* Brand */}
        {product.brand && (
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">{product.brand}</span>
        )}

        {/* Title */}
        <h1 className="text-lg font-bold text-gray-900 mt-1 leading-snug">{product.title}</h1>

        {/* Rating */}
        {product.reviews_count > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={14} className={s <= Math.floor(avgRating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
              ))}
            </div>
            <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
            <span className="text-sm text-gray-400">{product.reviews_count} отзывов</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-end gap-3 mt-3">
          <span className="text-3xl font-bold text-primary">{product.price.toLocaleString()} сом.</span>
          {product.original_price && (
            <span className="text-lg text-gray-400 line-through mb-0.5">{product.original_price.toLocaleString()} сом.</span>
          )}
        </div>

        {/* Stock */}
        <p className="text-sm mt-2">
          {product.stock > 0
            ? <span className="text-green-600 font-medium">✓ В наличии: {product.stock} шт.</span>
            : <span className="text-red-500 font-medium">Нет в наличии</span>}
        </p>
      </div>


      {/* Seller shop link */}
      <div className="bg-white mt-2 px-4 py-3">
        <Link href={`/shop/${product.seller_id}`} className="flex items-center gap-3 active:opacity-70">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
            {shop?.shop_logo_url ? (
              <Image
                src={`http://192.168.1.45:8000${shop.shop_logo_url}`}
                alt="logo"
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            ) : (
              <Store size={20} className="text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">
              {shop?.shop_name || shop?.username || "Магазин продавца"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Перейти в магазин</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
        </Link>
      </div>

      {/* Delivery info */}
      <div className="bg-white mt-2 px-4 py-4 flex gap-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Truck size={18} className="text-primary shrink-0" />
          <span>Бесплатная доставка</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Shield size={18} className="text-primary shrink-0" />
          <span>Безопасная оплата</span>
        </div>
      </div>

      {/* Description collapsible */}
      {product.description && (
        <div className="bg-white mt-2">
          <button
            onClick={() => setDescOpen(!descOpen)}
            className="w-full flex items-center justify-between px-4 py-4"
          >
            <span className="font-semibold text-gray-900">Описание</span>
            {descOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
          {descOpen && (
            <div className="px-4 pb-4">
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Reviews collapsible */}
      <div className="bg-white mt-2">
        <button
          onClick={() => setReviewsOpen(!reviewsOpen)}
          className="w-full flex items-center justify-between px-4 py-4"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">Отзывы</span>
            {reviews.length > 0 && (
              <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{reviews.length}</span>
            )}
          </div>
          {reviewsOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {reviewsOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            {/* Write review */}
            {user ? (
              <form onSubmit={handleReview} className="mb-5 bg-gray-50 rounded-2xl p-4">
                <p className="font-medium text-sm mb-3">Оставить отзыв</p>
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                      <Star size={28} className={s <= reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewForm.text}
                  onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                  className="input h-20 resize-none mb-3 text-sm"
                  placeholder="Ваш отзыв..."
                />
                <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm">
                  {submitting ? "Отправляем..." : "Отправить"}
                </button>
              </form>
            ) : (
              <button onClick={() => router.push("/auth/login")} className="w-full btn-outline py-2.5 text-sm mb-4">
                Войдите чтобы оставить отзыв
              </button>
            )}

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">Отзывов пока нет</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {r.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{r.username}</span>
                          <div className="flex">
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} size={11} className={s <= r.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString("ru-RU")}</p>
                      </div>
                    </div>
                    {r.text && <p className="text-sm text-gray-700 mt-1 ml-10">{r.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom bar — только для покупателей */}
      {user?.role !== "seller" && user?.role !== "admin" && (
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 shadow-lg">
        <div className="flex-1">
          <p className="text-xs text-gray-400">Цена</p>
          <p className="font-bold text-primary text-lg leading-tight">
            {(product.price * (cartItem?.quantity || 1)).toLocaleString()} сом.
          </p>
        </div>
        {product.stock === 0 ? (
          <button
            onClick={toggleWaitlist}
            className={`flex-1 font-semibold rounded-2xl flex items-center justify-center gap-2 py-3.5 text-sm transition-colors ${inWaitlist ? "bg-gray-100 text-gray-600" : "bg-primary text-white"}`}
          >
            <Clock size={18} /> {inWaitlist ? "В листе ожидания" : "Уведомить о наличии"}
          </button>
        ) : inCart ? (
          <div className="flex-1 flex items-center justify-between border-2 border-primary rounded-2xl overflow-hidden">
            <button
              onClick={() => updateQty(cartItem!.id, cartItem!.quantity - 1)}
              className="w-14 h-full flex items-center justify-center text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
            >
              <Minus size={18} strokeWidth={2.5} />
            </button>
            <span className="text-base font-bold text-primary">{cartItem!.quantity}</span>
            <button
              onClick={() => updateQty(cartItem!.id, cartItem!.quantity + 1)}
              className="w-14 h-full flex items-center justify-center text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="flex-1 bg-primary text-white font-semibold rounded-2xl flex items-center justify-center gap-2 py-3.5 text-sm disabled:opacity-60"
          >
            {adding
              ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              : <ShoppingCart size={18} />}
            В корзину
          </button>
        )}
      </div>
      )}
    </div>
  );
}
