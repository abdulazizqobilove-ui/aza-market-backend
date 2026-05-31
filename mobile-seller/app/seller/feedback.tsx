import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Send, ChevronDown, ChevronUp, CheckCircle, MessageSquare } from "lucide-react-native";
import Toast from "react-native-toast-message";
import api from "@/lib/api";
import { useThemeColors } from "@/lib/theme";

const P = "#2563EB";

type FType = "suggestion" | "bug" | "question" | "complaint";
type FStatus = "new" | "read" | "replied" | "done";

interface FeedbackItem {
  id: number; type: FType; title: string; message: string;
  status: FStatus; admin_reply?: string; created_at: string;
}

const TYPES: { value: FType; emoji: string; label: string; color: string; desc: string }[] = [
  { value: "suggestion", emoji: "💡", label: "Предложение",  color: "#ca8a04", desc: "Идея по улучшению" },
  { value: "bug",        emoji: "🐛", label: "Ошибка",        color: "#dc2626", desc: "Что-то не работает" },
  { value: "question",   emoji: "❓", label: "Вопрос",        color: "#2563EB", desc: "Нужна помощь" },
  { value: "complaint",  emoji: "⚠️", label: "Жалоба",        color: "#ea580c", desc: "Проблема" },
];

const STATUS_MAP: Record<FStatus, { label: string; color: string; bg: string }> = {
  new:     { label: "Отправлено",  color: "#6b7280", bg: "#f3f4f6" },
  read:    { label: "Прочитано",   color: "#2563EB", bg: "#eff6ff" },
  replied: { label: "Ответили ✉️", color: "#16a34a", bg: "#f0fdf4" },
  done:    { label: "Решено ✓",    color: "#059669", bg: "#ecfdf5" },
};

export default function FeedbackScreen() {
  const router = useRouter();
  const c = useThemeColors();

  const [tab, setTab] = useState<"new" | "history">("new");
  const [type, setType] = useState<FType>("suggestion");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const r = await api.get<FeedbackItem[]>("/feedback/my");
      setHistory(r.data);
    } catch {}
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab]);

  const send = async () => {
    if (!title.trim()) { Toast.show({ type: "error", text1: "Введите тему" }); return; }
    if (message.trim().length < 10) { Toast.show({ type: "error", text1: "Описание слишком короткое" }); return; }
    setSending(true);
    try {
      await api.post("/feedback", { type, title: title.trim(), message: message.trim() });
      Toast.show({ type: "success", text1: "Сообщение отправлено!", text2: "Мы ответим в ближайшее время" });
      setTitle(""); setMessage(""); setType("suggestion");
      setTab("history"); loadHistory();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Ошибка отправки" });
    } finally { setSending(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={18} color={c.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Обратная связь</Text>
            <Text style={{ fontSize: 12, color: c.textMuted }}>Предложения · Ошибки · Вопросы</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {[
            { key: "new" as const, label: "Новое сообщение" },
            { key: "history" as const, label: `История (${history.length || ""})` },
          ].map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: tab === t.key ? P : c.iconBg, alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: tab === t.key ? "#fff" : c.textSub }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* NEW TAB */}
      {tab === "new" && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
          {/* Type picker */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSub }}>Тип обращения</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TYPES.map(t => (
                <TouchableOpacity key={t.value} onPress={() => setType(t.value)}
                  style={{
                    flex: 1, minWidth: "45%", flexDirection: "row", alignItems: "center", gap: 10,
                    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                    backgroundColor: type === t.value ? t.color + "15" : c.card,
                    borderWidth: 2, borderColor: type === t.value ? t.color : c.border,
                  }}>
                  <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: type === t.value ? t.color : c.text }}>{t.label}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>{t.desc}</Text>
                  </View>
                  {type === t.value && (
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: t.color, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSub }}>Тема *</Text>
            <TextInput
              value={title} onChangeText={setTitle} maxLength={200}
              placeholder={
                type === "suggestion" ? "Например: Добавить фильтр по дате в заказах" :
                type === "bug"        ? "Например: Фото не загружаются" :
                type === "question"   ? "Например: Как настроить доставку?" :
                "Кратко опишите проблему..."
              }
              placeholderTextColor={c.textMuted}
              style={{ backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: c.border }}
            />
          </View>

          {/* Message */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSub }}>Подробнее *</Text>
            <TextInput
              value={message} onChangeText={setMessage} maxLength={5000}
              multiline numberOfLines={6} textAlignVertical="top"
              placeholder="Опишите как можно подробнее. Чем больше деталей — тем быстрее поможем."
              placeholderTextColor={c.textMuted}
              style={{ backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: c.border, minHeight: 120 }}
            />
            <Text style={{ fontSize: 11, color: c.textMuted, alignSelf: "flex-end" }}>{message.length}/5000</Text>
          </View>

          <TouchableOpacity onPress={send} disabled={sending || !title.trim() || message.trim().length < 10}
            style={{ backgroundColor: P, borderRadius: 16, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: (sending || !title.trim() || message.trim().length < 10) ? 0.5 : 1 }}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={16} color="#fff" />}
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {sending ? "Отправляем..." : "Отправить"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          refreshControl={<any refreshing={loadingHistory} onRefresh={loadHistory} tintColor={P} />}>
          {loadingHistory && history.length === 0 && (
            <ActivityIndicator color={P} style={{ marginTop: 40 }} />
          )}
          {!loadingHistory && history.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <MessageSquare size={48} color={c.border} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>Обращений пока нет</Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center" }}>Отправьте первое сообщение — ответим в ближайшее время</Text>
              <TouchableOpacity onPress={() => setTab("new")}
                style={{ backgroundColor: P, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Написать</Text>
              </TouchableOpacity>
            </View>
          )}
          {history.map(fb => {
            const t = TYPES.find(x => x.value === fb.type);
            const st = STATUS_MAP[fb.status];
            const isOpen = expanded === fb.id;
            const date = new Date(fb.created_at).toLocaleDateString("ru-RU", { day:"numeric", month:"short" });
            return (
              <TouchableOpacity key={fb.id} onPress={() => setExpanded(isOpen ? null : fb.id)}
                style={{ backgroundColor: c.card, borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: fb.status === "replied" ? "#16a34a30" : c.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: (t?.color ?? "#6b7280") + "15", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 20 }}>{t?.emoji ?? "💬"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, lineHeight: 20 }} numberOfLines={1}>{fb.title}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{t?.label} · {date}</Text>
                    {fb.status === "replied" && !isOpen && (
                      <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "700", marginTop: 2 }}>💬 Есть ответ</Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={{ backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: st.color }}>{st.label}</Text>
                    </View>
                    {isOpen ? <ChevronUp size={14} color={c.textMuted} /> : <ChevronDown size={14} color={c.textMuted} />}
                  </View>
                </View>
                {isOpen && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderTopColor: c.border }}>
                    <View style={{ paddingTop: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: c.textMuted, marginBottom: 6 }}>ВАШЕ СООБЩЕНИЕ</Text>
                      <Text style={{ fontSize: 13, color: c.text, lineHeight: 20 }}>{fb.message}</Text>
                    </View>
                    {fb.admin_reply && (
                      <View style={{ backgroundColor: "#eff6ff", borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: P }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: P, marginBottom: 6 }}>💬 ОТВЕТ ОТ КОМАНДЫ AZA</Text>
                        <Text style={{ fontSize: 13, color: "#1e3a8a", lineHeight: 20 }}>{fb.admin_reply}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
