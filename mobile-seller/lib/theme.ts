import { useColorScheme } from "react-native";
import { useThemeStore } from "@/store/theme";

export const light = {
  bg: "#f9fafb", card: "#ffffff", border: "#f3f4f6", text: "#111827",
  textSub: "#6b7280", textMuted: "#9ca3af", inputBg: "#f9fafb",
  tabBar: "#ffffff", tabBorder: "#f3f4f6", iconBg: "#f3f4f6", placeholder: "#e5e7eb",
};

export const dark = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", text: "#f1f5f9",
  textSub: "#94a3b8", textMuted: "#64748b", inputBg: "#1e293b",
  tabBar: "#1e293b", tabBorder: "#334155", iconBg: "#334155", placeholder: "#334155",
};

export type ThemeColors = typeof light;

export function useThemeColors(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  return isDark ? dark : light;
}

export function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  return mode === "dark" || (mode === "system" && system === "dark");
}
