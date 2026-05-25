import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: async (user, token) => {
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    set({ user, token });
  },
  updateUser: async (user) => {
    await AsyncStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
  logout: async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    set({ user: null, token: null });
  },
  init: async () => {
    const token = await AsyncStorage.getItem("token");
    const userStr = await AsyncStorage.getItem("user");
    if (token && userStr) set({ token, user: JSON.parse(userStr) });
  },
}));
