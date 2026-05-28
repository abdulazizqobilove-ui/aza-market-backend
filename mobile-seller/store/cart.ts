import { create } from "zustand";
import api, { CartItem, Product } from "@/lib/api";

interface CartState {
  items: CartItem[];
  loading: boolean;
  fetchError: boolean;
  fetch: () => Promise<void>;
  add: (product: Product, quantity?: number, attrs?: Record<string, string>) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
  updateQty: (itemId: number, quantity: number) => Promise<void>;
  clear: () => Promise<void>;
  clearLocal: () => void;
  count: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,
  fetchError: false,
  fetch: async () => {
    set({ loading: true, fetchError: false });
    try {
      const res = await api.get<CartItem[]>("/cart");
      set({ items: res.data, fetchError: false });
    } catch (e: any) {
      if (e?.response?.status === 401) set({ items: [] });
      else set({ fetchError: true });
    } finally {
      set({ loading: false });
    }
  },
  add: async (product, quantity = 1, attrs) => {
    const tempId = -Date.now();
    const tempItem: CartItem = { id: tempId, quantity, product, selected_attrs: attrs ?? null };
    set({ items: [...get().items, tempItem] });
    try {
      await api.post("/cart", { product_id: product.id, quantity, selected_attrs: attrs || null });
      await get().fetch();
    } catch (e: any) {
      if (e?.response?.status) {
        set({ items: get().items.filter((i) => i.id !== tempId) });
        throw e;
      }
    }
  },
  remove: async (itemId) => {
    set({ items: get().items.filter((i) => i.id !== itemId) });
    if (itemId > 0) {
      try { await api.delete(`/cart/${itemId}`); } catch {}
    }
  },
  updateQty: async (itemId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.id !== itemId) });
      if (itemId > 0) {
        try { await api.delete(`/cart/${itemId}`); } catch {}
      }
    } else {
      set({ items: get().items.map((i) => i.id === itemId ? { ...i, quantity } : i) });
      if (itemId > 0) {
        try { await api.patch(`/cart/${itemId}`, null, { params: { quantity } }); } catch {}
      }
    }
  },
  clear: async () => { await api.delete("/cart"); set({ items: [] }); },
  clearLocal: () => set({ items: [] }),
  count: () => get().items.reduce((s, i) => s + i.quantity, 0),
  total: () => get().items.reduce((s, i) => s + i.product.price * i.quantity, 0),
}));
