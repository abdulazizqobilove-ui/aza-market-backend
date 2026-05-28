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
    AsyncStorage.setItem("seller:theme_mode", mode);
  },
  toggle: () => {
    const current = get().mode;
    const next = current === "dark" ? "light" : "dark";
    get().setMode(next);
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem("seller:theme_mode");
    if (stored === "light" || stored === "dark" || stored === "system") {
      set({ mode: stored });
    }
  },
}));
