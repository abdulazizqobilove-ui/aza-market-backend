import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { ChevronLeft, MessageSquare, Package } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { API_URL, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemeColors } from "@/lib/theme";
import { SkeletonListItem } from "@/components/Skeleton";

interface ChatOut {
  id: number;
  buyer_id: number;
  seller_id: number;
  product_id: number | null;
  product_title: string | null;
  product_image: string | null;
  other_name: string;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function ChatsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const [chats, setChats] = useState<ChatOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    api.get<ChatOut[]>("/chats")
      .then((r) => setChats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <MessageSquare size={48} color={c.border} />
        <Text style={{ color: c.textMuted, marginTop: 12, fontSize: 15 }}>Войдите чтобы видеть чаты</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Сообщения</Text>
      </View>

      {loading ? (
        <View style={{ gap: 8, paddingTop: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} />)}
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(ch) => String(ch.id)}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 32 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <MessageSquare size={36} color={c.textMuted} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: c.text, marginBottom: 8 }}>Нет сообщений</Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center" }}>Напишите продавцу со страницы товара</Text>
            </View>
          }
          renderItem={({ item: chat }) => {
            const initials = chat.other_name[0]?.toUpperCase() ?? "?";
            return (
              <TouchableOpacity
                onPress={() => router.push(`/chat/${chat.id}` as any)}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: c.card, borderBottomWidth: 0.5, borderBottomColor: c.border, gap: 12 }}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={{ position: "relative" }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {chat.other_avatar ? (
                      <Image source={{ uri: imgUrl(chat.other_avatar) ?? "" }} style={{ width: 52, height: 52 }} contentFit="cover" />
                    ) : (
                      <Text style={{ fontSize: 20, fontWeight: "800", color: "#4f46e5" }}>{initials}</Text>
                    )}
                  </View>
                  {chat.unread_count > 0 && (
                    <View style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: c.card }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{chat.unread_count > 99 ? "99+" : chat.unread_count}</Text>
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>{chat.other_name}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>{timeLabel(chat.last_message_at)}</Text>
                  </View>
                  {chat.product_title && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Package size={11} color={c.textMuted} />
                      <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>{chat.product_title}</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 13, color: chat.unread_count > 0 ? c.textSub : c.textMuted, fontWeight: chat.unread_count > 0 ? "600" : "400" }} numberOfLines={1}>
                    {chat.last_message ?? "Нет сообщений"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
