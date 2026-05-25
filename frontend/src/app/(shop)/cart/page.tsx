"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";

export default function CartPage() {
  const { items, fetch, remove, total, loading } = useCartStore();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { if (user) fetch(); }, [user, fetch]);

  // Auto-select all available items when items load
  useEffect(() => {
    const available = items.filter((i) => i.product.stock > 0).map((i) => i.id);
    setSelected(new Set(available));
  }, [items.length]);

  const availableItems = items.filter((i) => i.product.stock > 0);
  const allSelected = availableItems.length > 0 && availableItems.every((i) => selected.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(availableItems.map((i) => i.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedItems = items.filter((i) => selected.has(i.id));
  const selectedTotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const selectedQty = selectedItems.reduce((s, i) => s + i.quantity, 0);

  if (!user) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-20">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
        <ShoppingBag size={32} className="text-gray-300" />
      </div>
      <p className="text-lg font-bold text-gray-800 mb-1">Корзина пуста</p>
      <p className="text-sm text-gray-400 mb-6">Войдите, чтобы увидеть товары</p>
      <Link href="/auth/login" className="bg-primary text-white font-semibold px-8 py-3.5 rounded-2xl text-sm">Войти</Link>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 flex gap-3 animate-pulse">
            <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3 mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-20">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
        <ShoppingBag size={32} className="text-gray-300" />
      </div>
      <p className="text-lg font-bold text-gray-800 mb-1">Корзина пуста</p>
      <p className="text-sm text-gray-400 mb-6">Добавьте товары, которые вам понравились</p>
      <Link href="/" className="bg-primary text-white font-semibold px-8 py-3.5 rounded-2xl text-sm">Перейти в каталог</Link>
    </div>
  );

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="bg-gray-50 min-h-screen pb-44">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Корзина</h1>
        <p className="text-xs text-gray-400 mt-0.5">{totalQty} товар{totalQty === 1 ? "" : totalQty < 5 ? "а" : "ов"}</p>
      </div>

      {/* Select all row */}
      <div className="bg-white mx-3 mt-3 rounded-2xl px-4 py-3 flex items-center justify-between">
        <button onClick={toggleAll} className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${allSelected ? "bg-primary border-primary" : "border-gray-300"}`}>
            {allSelected && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span className="text-sm font-medium text-gray-800">Выбрать все</span>
        </button>
        <span className="text-xs text-gray-400">{selected.size} из {availableItems.length}</span>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {items.map((item) => {
          const img = item.product.images.find((i) => i.is_main) || item.product.images[0];
          const inStock = item.product.stock > 0;
          const isSelected = selected.has(item.id);

          return (
            <div key={item.id} className={`bg-white rounded-2xl p-4 transition-opacity ${!inStock ? "opacity-55" : ""}`}>
              <div className="flex gap-3">
                {/* Checkbox */}
                {inStock && (
                  <button onClick={() => toggleOne(item.id)} className="shrink-0 pt-1">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "border-gray-300"}`}>
                      {isSelected && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                )}

                {/* Image */}
                <Link href={`/products/${item.product.id}`} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-50">
                  {img ? (
                    <Image src={`http://192.168.1.45:8000${img.url}`} alt={item.product.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2 leading-snug">{item.product.title}</p>
                  {!inStock ? (
                    <span className="inline-block mt-1.5 text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Нет в наличии</span>
                  ) : (
                    <p className="text-base font-bold text-gray-900 mt-1.5">
                      {(item.product.price * item.quantity).toLocaleString()} сом.
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => remove(item.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Quantity */}
              {inStock && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-gray-400">{item.product.price.toLocaleString()} сом. × {item.quantity}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        if (item.quantity <= 1) { remove(item.id); return; }
                        await api.patch(`/cart/${item.id}`, null, { params: { quantity: item.quantity - 1 } });
                        fetch();
                      }}
                      className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus size={14} className="text-gray-600" />
                    </button>
                    <span className="text-sm font-bold text-gray-800 w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={async () => {
                        await api.patch(`/cart/${item.id}`, null, { params: { quantity: item.quantity + 1 } });
                        fetch();
                      }}
                      className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Plus size={14} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom summary */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-4 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {/* Price breakdown */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Выбрано {selectedQty} товар{selectedQty === 1 ? "" : selectedQty < 5 ? "а" : "ов"}</p>
            <p className="text-2xl font-bold text-gray-900">{selectedTotal.toLocaleString()} сом.</p>
          </div>
          {selected.size === 0 && (
            <p className="text-xs text-gray-400 pb-1">Выберите товары</p>
          )}
        </div>

        <Link
          href={selected.size > 0 ? `/checkout?ids=${[...selected].join(",")}` : "#"}
          onClick={(e) => { if (selected.size === 0) e.preventDefault(); }}
          className={`block w-full font-bold text-base py-4 rounded-2xl text-center transition-colors ${selected.size > 0 ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}
        >
          {selected.size > 0 ? `Оформить ${selected.size} товар${selected.size === 1 ? "" : selected.size < 5 ? "а" : "ов"}` : "Оформить заказ"}
        </Link>
      </div>
    </div>
  );
}
