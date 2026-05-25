import { create } from "zustand";
import api from "@/lib/api";

interface FavoritesState {
  ids: Record<number, boolean>;
  fetch: () => Promise<void>;
  toggle: (productId: number) => Promise<void>;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: {},

  fetch: async () => {
    try {
      const res = await api.get<{ id: number }[]>("/favorites");
      const ids: Record<number, boolean> = {};
      res.data.forEach((p: any) => { ids[p.id] = true; });
      set({ ids });
    } catch {}
  },

  toggle: async (productId) => {
    const has = !!get().ids[productId];
    const next = { ...get().ids };
    if (has) delete next[productId];
    else next[productId] = true;
    set({ ids: next });
    try {
      if (has) await api.delete(`/favorites/${productId}`);
      else await api.post(`/favorites/${productId}`);
    } catch {
      const rollback = { ...get().ids };
      if (has) rollback[productId] = true;
      else delete rollback[productId];
      set({ ids: rollback });
    }
  },

  clear: () => set({ ids: {} }),
}));
