import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginScreen() {
  const router = useRouter();
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-blue-600 rounded-3xl items-center justify-center mb-4">
            <Text className="text-white text-4xl font-black">A</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900">AZA Market</Text>
          <Text className="text-gray-400 mt-1">Войдите в аккаунт</Text>
        </View>

        {step === "phone" ? (
          <>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Номер телефона</Text>
            <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden mb-4">
              <View className="px-4 py-4 border-r border-gray-200 bg-gray-100">
                <Text className="text-base font-semibold text-gray-700">+992</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 9))}
                keyboardType="phone-pad"
                placeholder="90 000 00 00"
                placeholderTextColor="#9ca3af"
                className="flex-1 px-4 py-4 text-base text-gray-900"
              />
            </View>
            <TouchableOpacity
              onPress={sendCode}
              disabled={phone.length < 9 || loading}
              className={`py-4 rounded-2xl items-center ${phone.length >= 9 ? "bg-blue-600" : "bg-gray-200"}`}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className={`font-bold text-base ${phone.length >= 9 ? "text-white" : "text-gray-400"}`}>Получить код</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text className="text-sm font-semibold text-gray-700 mb-1">Код из SMS</Text>
            <Text className="text-xs text-gray-400 mb-3">Отправлен на {fullPhone}</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              placeholder="• • • • • •"
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-widest text-gray-900 mb-4"
            />
            <TouchableOpacity
              onPress={verify}
              disabled={code.length < 4 || loading}
              className={`py-4 rounded-2xl items-center ${code.length >= 4 ? "bg-blue-600" : "bg-gray-200"}`}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className={`font-bold text-base ${code.length >= 4 ? "text-white" : "text-gray-400"}`}>Войти</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("phone")} className="mt-3 items-center">
              <Text className="text-blue-600 font-medium">Изменить номер</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
