import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { Product } from "@/lib/api";

const IDS_KEY = "buyer:fav_ids";
const PRODUCTS_KEY = "buyer:fav_products";

interface FavoritesState {
  ids: Record<number, boolean>;
  products: Record<number, Product>;
  hydrate: () => Promise<void>;
  fetch: () => Promise<void>;
  toggle: (product: Product) => Promise<void>;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: {},
  products: {},

  hydrate: async () => {
    try {
      const [rawIds, rawProducts] = await Promise.all([
        AsyncStorage.getItem(IDS_KEY),
        AsyncStorage.getItem(PRODUCTS_KEY),
      ]);
      const ids = rawIds ? JSON.parse(rawIds) : {};
      const products = rawProducts ? JSON.parse(rawProducts) : {};
      set({ ids, products });
    } catch {}
  },

  fetch: async () => {
    try {
      const res = await api.get<Product[]>("/favorites");
      const serverIds: Record<number, boolean> = {};
      const serverProducts: Record<number, Product> = {};
      res.data.forEach((p) => {
        serverIds[p.id] = true;
        serverProducts[p.id] = p;
      });
      const mergedIds = { ...get().ids, ...serverIds };
      const mergedProducts = { ...get().products, ...serverProducts };
      set({ ids: mergedIds, products: mergedProducts });
      AsyncStorage.setItem(IDS_KEY, JSON.stringify(mergedIds));
      AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(mergedProducts));
    } catch {
      // Server unreachable — keep local state
    }
  },

  toggle: async (product: Product) => {
    const has = !!get().ids[product.id];
    const nextIds = { ...get().ids };
    const nextProducts = { ...get().products };
    if (has) {
      delete nextIds[product.id];
      delete nextProducts[product.id];
    } else {
      nextIds[product.id] = true;
      nextProducts[product.id] = product;
    }
    set({ ids: nextIds, products: nextProducts });
    AsyncStorage.setItem(IDS_KEY, JSON.stringify(nextIds));
    AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(nextProducts));
    try {
      if (has) await api.delete(`/favorites/${product.id}`);
      else await api.post(`/favorites/${product.id}`);
    } catch {}
  },

  clear: () => {
    set({ ids: {}, products: {} });
    AsyncStorage.removeItem(IDS_KEY);
    AsyncStorage.removeItem(PRODUCTS_KEY);
  },
}));
