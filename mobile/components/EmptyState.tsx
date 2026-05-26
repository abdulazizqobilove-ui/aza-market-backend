import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingVertical: 60, gap: 12 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Text style={{ fontSize: 44 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", textAlign: "center" }}>{title}</Text>
      {subtitle && (
        <Text style={{ fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 20 }}>{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{ marginTop: 8, backgroundColor: "#8B5CF6", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
