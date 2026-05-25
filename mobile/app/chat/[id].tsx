import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Send, Package } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const WS_BASE = API_URL.replace("https://", "wss://").replace("http://", "ws://");

interface Msg {
  id: number;
  chat_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  text: string;
  is_read: boolean;
  created_at: string;
}

interface ChatInfo {
  id: number;
  other_name: string;
  other_avatar: string | null;
  product_title: string | null;
  product_image: string | null;
  buyer_id: number;
  seller_id: number;
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function dateSep(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Number(id);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history + chat info
  useEffect(() => {
    if (!user) return;

    api.get<ChatInfo[]>("/chats").then((r) => {
      const c = r.data.find((ch) => ch.id === chatId);
      if (c) setChatInfo(c);
    }).catch(() => {});

    api.get<Msg[]>(`/chats/${chatId}/messages`).then((r) => {
      setMessages(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [chatId, user]);

  // WebSocket
  const connect = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/api/chats/${chatId}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (e) => {
      try {
        const msg: Msg = JSON.parse(e.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [chatId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
    }
  }, [loading]);

  const send = () => {
    const t = text.trim();
    if (!t || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ text: t }));
    setText("");
  };

  // Group messages by date
  const grouped: { type: "date" | "msg"; key: string; data?: Msg; date?: string }[] = [];
  let lastDate = "";
  for (const m of messages) {
    const d = dateSep(m.created_at);
    if (d !== lastDate) {
      grouped.push({ type: "date", key: `date-${m.id}`, date: d });
      lastDate = d;
    }
    grouped.push({ type: "msg", key: String(m.id), data: m });
  }

  const isMine = (msg: Msg) => msg.sender_id === user?.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>

        {/* Avatar */}
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#e0e7ff", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          {chatInfo?.other_avatar ? (
            <Image source={{ uri: `${API_URL}${chatInfo.other_avatar}` }} style={{ width: 40, height: 40 }} contentFit="cover" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#4f46e5" }}>{chatInfo?.other_name?.[0]?.toUpperCase() ?? "?"}</Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }} numberOfLines={1}>{chatInfo?.other_name ?? "..."}</Text>
          {chatInfo?.product_title && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Package size={11} color="#9ca3af" />
              <Text style={{ fontSize: 11, color: "#9ca3af" }} numberOfLines={1}>{chatInfo.product_title}</Text>
            </View>
          )}
        </View>

        {/* Connection dot */}
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: connected ? "#22c55e" : "#d1d5db" }} />
      </View>

      {/* Product preview */}
      {chatInfo?.product_image && (
        <View style={{ backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" }}>
          <View style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
            <Image source={{ uri: `${API_URL}${chatInfo.product_image}` }} style={{ width: 44, height: 44 }} contentFit="cover" />
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: "#374151", fontWeight: "500" }} numberOfLines={2}>{chatInfo.product_title}</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        {/* Messages */}
        {loading ? (
          <ActivityIndicator color="#111827" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={grouped}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ padding: 12, gap: 4, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 60 }}>
                <Text style={{ fontSize: 13, color: "#9ca3af" }}>Начните разговор</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.type === "date") {
                return (
                  <View style={{ alignItems: "center", marginVertical: 8 }}>
                    <View style={{ backgroundColor: "rgba(0,0,0,0.06)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500" }}>{item.date}</Text>
                    </View>
                  </View>
                );
              }

              const msg = item.data!;
              const mine = isMine(msg);

              return (
                <View style={{ flexDirection: "row", justifyContent: mine ? "flex-end" : "flex-start", marginVertical: 2 }}>
                  {!mine && (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center", marginRight: 6, alignSelf: "flex-end", overflow: "hidden" }}>
                      {msg.sender_avatar ? (
                        <Image source={{ uri: `${API_URL}${msg.sender_avatar}` }} style={{ width: 28, height: 28 }} contentFit="cover" />
                      ) : (
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#4f46e5" }}>{msg.sender_name[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                  )}
                  <View style={{ maxWidth: "72%" }}>
                    <View style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 18,
                      borderBottomRightRadius: mine ? 4 : 18,
                      borderBottomLeftRadius: mine ? 18 : 4,
                      backgroundColor: mine ? "#111827" : "#fff",
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    }}>
                      <Text style={{ fontSize: 14, color: mine ? "#fff" : "#111827", lineHeight: 20 }}>{msg.text}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 3, textAlign: mine ? "right" : "left", paddingHorizontal: 4 }}>
                      {timeStr(msg.created_at)}{mine && (msg.is_read ? " ✓✓" : " ✓")}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === "ios" ? 10 : 14, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6", gap: 8 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Сообщение..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
            style={{ flex: 1, backgroundColor: "#f9fafb", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: "#111827", maxHeight: 120 }}
            onSubmitEditing={Platform.OS === "ios" ? send : undefined}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || !connected}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: text.trim() && connected ? "#111827" : "#e5e7eb", alignItems: "center", justifyContent: "center" }}
          >
            <Send size={18} color={text.trim() && connected ? "#fff" : "#9ca3af"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
