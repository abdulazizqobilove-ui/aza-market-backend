import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: "system",
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem("buyer:theme_mode", mode);
  },
  toggle: () => {
    const current = get().mode;
    const next = current === "dark" ? "light" : "dark";
    get().setMode(next);
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem("buyer:theme_mode");
    if (stored === "light" || stored === "dark" || stored === "system") {
      set({ mode: stored });
    }
  },
}));
