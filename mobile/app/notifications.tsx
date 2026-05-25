import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ChevronLeft, Bell, MessageSquare, Package, CheckCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface NotifItem {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин. назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч. назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function NotifIcon({ title }: { title: string }) {
  if (title.toLowerCase().includes("сообщени") || title.toLowerCase().includes("чат")) {
    return <MessageSquare size={20} color="#8b5cf6" />;
  }
  if (title.toLowerCase().includes("заказ")) {
    return <Package size={20} color="#2563eb" />;
  }
  return <Bell size={20} color="#f59e0b" />;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    api.get<NotifItem[]>("/notifications")
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markAllRead = () => {
    api.post("/notifications/read-all").catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const onPress = (item: NotifItem) => {
    if (!item.is_read) {
      api.patch(`/notifications/${item.id}/read`).catch(() => {});
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n));
    }
    const t = item.title.toLowerCase();
    if (t.includes("сообщени") || t.includes("чат")) {
      router.push("/chats" as any);
    } else if (t.includes("заказ")) {
      router.push("/orders" as any);
    }
  };

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827", flex: 1 }}>Уведомления</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <CheckCheck size={16} color="#2563eb" />
            <Text style={{ fontSize: 13, color: "#2563eb", fontWeight: "600" }}>Прочитать все</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#2563eb" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Bell size={36} color="#d1d5db" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 8 }}>Нет уведомлений</Text>
              <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Здесь будут уведомления о заказах и сообщениях</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onPress(item)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: item.is_read ? "#fff" : "#eff6ff",
                borderBottomWidth: 0.5,
                borderBottomColor: "#f3f4f6",
                gap: 12,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                <NotifIcon title={item.title} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <Text style={{ fontSize: 14, fontWeight: item.is_read ? "600" : "800", color: "#111827", flex: 1 }} numberOfLines={1}>{item.title}</Text>
                  <Text style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{timeLabel(item.created_at)}</Text>
                </View>
                <Text style={{ fontSize: 13, color: "#6b7280" }} numberOfLines={2}>{item.body}</Text>
              </View>
              {!item.is_read && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563eb", marginTop: 4 }} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
