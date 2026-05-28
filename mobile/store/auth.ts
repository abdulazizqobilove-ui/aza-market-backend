import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  initialized: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  initialized: false,
  setAuth: async (user, token) => {
    await AsyncStorage.setItem("buyer:token", token);
    await AsyncStorage.setItem("buyer:user", JSON.stringify(user));
    set({ user, token });
  },
  updateUser: async (user) => {
    await AsyncStorage.setItem("buyer:user", JSON.stringify(user));
    set({ user });
  },
  logout: async () => {
    await AsyncStorage.removeItem("buyer:token");
    await AsyncStorage.removeItem("buyer:user");
    set({ user: null, token: null });
  },
  init: async () => {
    const token = await AsyncStorage.getItem("buyer:token");
    const userStr = await AsyncStorage.getItem("buyer:user");
    if (token && userStr) set({ token, user: JSON.parse(userStr) });
    set({ initialized: true });
  },
}));
