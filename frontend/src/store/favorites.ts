import { create } from "zustand";
import api from "@/lib/api";

interface FavoritesState {
  ids: Set<number>;
  loading: boolean;
  fetch: () => Promise<void>;
  toggle: (productId: number) => Promise<void>;
  has: (productId: number) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set(),
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const res = await api.get<{ id: number }[]>("/favorites");
      set({ ids: new Set(res.data.map((p: any) => p.id)) });
    } catch (e: any) {
      if (e?.response?.status === 401) set({ ids: new Set() });
    } finally {
      set({ loading: false });
    }
  },

  toggle: async (productId) => {
    const ids = get().ids;
    if (ids.has(productId)) {
      const next = new Set(ids);
      next.delete(productId);
      set({ ids: next });
      await api.delete(`/favorites/${productId}`).catch(() => {
        const reverted = new Set(get().ids);
        reverted.add(productId);
        set({ ids: reverted });
      });
    } else {
      const next = new Set(ids);
      next.add(productId);
      set({ ids: next });
      await api.post(`/favorites/${productId}`).catch(() => {
        const reverted = new Set(get().ids);
        reverted.delete(productId);
        set({ ids: reverted });
      });
    }
  },

  has: (productId) => get().ids.has(productId),

  clear: () => set({ ids: new Set() }),
}));
