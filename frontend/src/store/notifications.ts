import { create } from "zustand";
import api from "@/lib/api";

interface NotificationStore {
  newOrders: number;
  lastChecked: number;
  fetch: () => Promise<void>;
  clear: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  newOrders: 0,
  lastChecked: Date.now(),

  fetch: async () => {
    try {
      const res = await api.get<any[]>("/seller/orders");
      const pending = res.data.filter((o: any) => o.status === "pending").length;
      set({ newOrders: pending });
    } catch {}
  },

  clear: () => set({ newOrders: 0, lastChecked: Date.now() }),
}));
