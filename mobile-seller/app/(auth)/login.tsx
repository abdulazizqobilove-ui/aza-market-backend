import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemeColors } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState("");

  const fullPhone = `+992${phone}`;

  const sendCode = async () => {
    if (phone.length < 9) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/phone/send", { phone: fullPhone });
      setStep("code");
      setDevCode(res.data?.dev_code || "");
      setCode(res.data?.dev_code || "");
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Ошибка" });
    } finally { setLoading(false); }
  };

  const verify = async () => {
    if (code.length < 4) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/phone/verify", { phone: fullPhone, code });
      await setAuth(res.data.user, res.data.access_token);
      const role = res.data.user.role;
      if (role === "admin") router.replace("/(tabs)/admin-tab" as any);
      else if (role === "seller") router.replace("/(tabs)/seller-products" as any);
      else router.replace("/(tabs)/");
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.response?.data?.detail || "Неверный код" });
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.card }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View style={{ width: 80, height: 80, backgroundColor: "#8B5CF6", borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Text style={{ color: "#fff", fontSize: 36, fontWeight: "900" }}>A</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: c.text }}>AZA Market</Text>
          <Text style={{ color: c.textMuted, marginTop: 4 }}>Войдите в аккаунт</Text>
        </View>

        {step === "phone" ? (
          <>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSub, marginBottom: 8 }}>Номер телефона</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.inputBg, borderWidth: 2, borderColor: c.border, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRightWidth: 1, borderRightColor: c.border, backgroundColor: c.iconBg }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.textSub }}>+992</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 9))}
                keyboardType="phone-pad"
                placeholder="90 000 00 00"
                placeholderTextColor={c.textMuted}
                style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: c.text }}
              />
            </View>
            <TouchableOpacity
              onPress={sendCode}
              disabled={phone.length < 9 || loading}
              style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: phone.length >= 9 ? "#8B5CF6" : c.iconBg }}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ fontWeight: "700", fontSize: 16, color: phone.length >= 9 ? "#fff" : c.textMuted }}>Получить код</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSub, marginBottom: 4 }}>Код из SMS</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 12 }}>Отправлен на {fullPhone}</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              placeholder="• • • • • •"
              placeholderTextColor={c.textMuted}
              style={{ backgroundColor: c.inputBg, borderWidth: 2, borderColor: c.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, textAlign: "center", fontSize: 24, fontWeight: "700", letterSpacing: 8, color: c.text, marginBottom: 16 }}
            />
            <TouchableOpacity
              onPress={verify}
              disabled={code.length < 4 || loading}
              style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: code.length >= 4 ? "#8B5CF6" : c.iconBg }}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ fontWeight: "700", fontSize: 16, color: code.length >= 4 ? "#fff" : c.textMuted }}>Войти</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("phone")} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: "#8B5CF6", fontWeight: "500" }}>Изменить номер</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
