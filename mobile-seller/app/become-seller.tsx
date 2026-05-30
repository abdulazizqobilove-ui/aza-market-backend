import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Store, CheckCircle, FileText, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import api from "@/lib/api";
import { useThemeColors } from "@/lib/theme";

export default function BecomeSellerScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ shop_name: "", description: "", phone: "" });
  const [regDoc, setRegDoc] = useState<{ uri: string; name: string; type: string } | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const pickDoc = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      const name = a.fileName || `reg_doc_${Date.now()}.jpg`;
      const type = a.mimeType || "image/jpeg";
      setRegDoc({ uri: a.uri, name, type });
    }
  };

  const submit = async () => {
    if (!form.shop_name.trim()) {
      Toast.show({ type: "error", text1: "Введите название магазина" }); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("shop_name", form.shop_name.trim());
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (regDoc) fd.append("registration_doc", { uri: regDoc.uri, name: regDoc.name, type: regDoc.type } as any);
      await api.post("/seller-applications", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSubmitted(true);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Не удалось отправить заявку";
      Toast.show({ type: "error", text1: msg });
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={18} color={c.textSub} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "700", color: c.text }}>Стать продавцом</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={40} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: c.text, textAlign: "center" }}>Заявка отправлена!</Text>
          <Text style={{ color: c.textSub, textAlign: "center", fontSize: 14, lineHeight: 20 }}>Мы рассмотрим вашу заявку в течение 24 часов и сообщим о результате.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: "#2563EB", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 16, marginTop: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: c.text }}>Стать продавцом</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Header card */}
        <View style={{ backgroundColor: "#2563EB", borderRadius: 20, padding: 24, alignItems: "center", gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
            <Store size={32} color="white" />
          </View>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center" }}>Откройте свой магазин</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", lineHeight: 20 }}>Продавайте товары миллионам покупателей на AZA Market</Text>
        </View>

        {/* Benefits */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontWeight: "700", color: c.text, marginBottom: 4 }}>Преимущества</Text>
          {[
            ["💰", "Низкая комиссия платформы"],
            ["📦", "Простое управление товарами"],
            ["📊", "Подробная аналитика продаж"],
            ["💳", "Быстрые выплаты на карту"],
          ].map(([icon, text]) => (
            <View key={text as string} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 20 }}>{icon}</Text>
              <Text style={{ fontSize: 14, color: c.textSub, flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Form */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <Text style={{ fontWeight: "700", color: c.text }}>Заявка</Text>
          <View>
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>Название магазина *</Text>
            <TextInput
              value={form.shop_name}
              onChangeText={(v) => set("shop_name", v)}
              placeholder="Например: Мой магазин"
              placeholderTextColor={c.textMuted}
              style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>Контактный телефон</Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => set("phone", v)}
              placeholder="+992 XX XXX XXXX"
              placeholderTextColor={c.textMuted}
              keyboardType="phone-pad"
              style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>Что планируете продавать?</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => set("description", v)}
              placeholder="Опишите ваши товары..."
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={3}
              style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, textAlignVertical: "top", minHeight: 70 }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>Свидетельство о регистрации ИП/ООО (необязательно)</Text>
            {regDoc ? (
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                <FileText size={18} color="#2563EB" />
                <Text style={{ flex: 1, fontSize: 13, color: "#1D4ED8" }} numberOfLines={1}>{regDoc.name}</Text>
                <TouchableOpacity onPress={() => setRegDoc(null)}>
                  <X size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={pickDoc} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderStyle: "dashed", borderWidth: 1, borderColor: c.border }}>
                <FileText size={18} color={c.textMuted} />
                <Text style={{ fontSize: 13, color: c.textMuted }}>Прикрепить документ (фото)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={submit} disabled={loading} style={{ backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Отправить заявку</Text>}
        </TouchableOpacity>

        <Text style={{ fontSize: 12, color: c.textMuted, textAlign: "center", paddingHorizontal: 16 }}>Нажимая «Отправить», вы соглашаетесь с условиями продавца AZA Market</Text>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
