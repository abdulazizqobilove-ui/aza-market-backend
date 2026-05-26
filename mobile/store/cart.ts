import { create } from "zustand";
import api, { CartItem } from "@/lib/api";

interface CartState {
  items: CartItem[];
  loading: boolean;
  fetch: () => Promise<void>;
  add: (productId: number, quantity?: number) => Promise<void>;
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
  fetch: async () => {
    set({ loading: true });
    try {
      const res = await api.get<CartItem[]>("/cart");
      set({ items: res.data });
    } catch (e: any) {
      if (e?.response?.status === 401) set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },
  add: async (productId, quantity = 1) => {
    await api.post("/cart", { product_id: productId, quantity });
    await get().fetch();
  },
  remove: async (itemId) => {
    await api.delete(`/cart/${itemId}`);
    set({ items: get().items.filter((i) => i.id !== itemId) });
  },
  updateQty: async (itemId, quantity) => {
    if (quantity <= 0) {
      await api.delete(`/cart/${itemId}`);
      set({ items: get().items.filter((i) => i.id !== itemId) });
    } else {
      set({ items: get().items.map((i) => i.id === itemId ? { ...i, quantity } : i) });
      await api.patch(`/cart/${itemId}`, null, { params: { quantity } });
    }
  },
  clear: async () => { await api.delete("/cart"); set({ items: [] }); },
  clearLocal: () => set({ items: [] }),
  count: () => get().items.reduce((s, i) => s + i.quantity, 0),
  total: () => get().items.reduce((s, i) => s + i.product.price * i.quantity, 0),
}));
