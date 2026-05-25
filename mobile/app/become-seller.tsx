import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Store, CheckCircle } from "lucide-react-native";
import Toast from "react-native-toast-message";
import api from "@/lib/api";

export default function BecomeSellerScreen() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ shop_name: "", description: "", phone: "" });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.shop_name.trim()) {
      Toast.show({ type: "error", text1: "Введите название магазина" }); return;
    }
    setLoading(true);
    try {
      await api.post("/seller-applications", { shop_name: form.shop_name.trim(), description: form.description.trim() });
      setSubmitted(true);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Не удалось отправить заявку";
      Toast.show({ type: "error", text1: msg });
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="bg-white px-4 py-4 flex-row items-center gap-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
            <ArrowLeft size={18} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Стать продавцом</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center">
            <CheckCircle size={40} color="#16a34a" />
          </View>
          <Text className="text-xl font-bold text-gray-900 text-center">Заявка отправлена!</Text>
          <Text className="text-gray-500 text-center text-sm leading-5">Мы рассмотрим вашу заявку в течение 24 часов и сообщим о результате.</Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-blue-600 px-8 py-3 rounded-2xl mt-4">
            <Text className="text-white font-bold">На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 flex-row items-center gap-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
          <ArrowLeft size={18} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Стать продавцом</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Header card */}
        <View className="bg-blue-600 rounded-2xl p-6 items-center gap-3">
          <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center">
            <Store size={32} color="white" />
          </View>
          <Text className="text-white text-xl font-bold text-center">Откройте свой магазин</Text>
          <Text className="text-blue-100 text-sm text-center leading-5">Продавайте товары миллионам покупателей на AZA Market</Text>
        </View>

        {/* Benefits */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700 mb-1">Преимущества</Text>
          {[
            ["💰", "Низкая комиссия платформы"],
            ["📦", "Простое управление товарами"],
            ["📊", "Подробная аналитика продаж"],
            ["💳", "Быстрые выплаты на карту"],
          ].map(([icon, text]) => (
            <View key={text} className="flex-row items-center gap-3">
              <Text className="text-xl">{icon}</Text>
              <Text className="text-sm text-gray-700 flex-1">{text}</Text>
            </View>
          ))}
        </View>

        {/* Form */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <Text className="font-semibold text-gray-700">Заявка</Text>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Название магазина *</Text>
            <TextInput value={form.shop_name} onChangeText={(v) => set("shop_name", v)} placeholder="Например: Мой магазин" placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Контактный телефон</Text>
            <TextInput value={form.phone} onChangeText={(v) => set("phone", v)} placeholder="+992 XX XXX XXXX" placeholderTextColor="#9ca3af" keyboardType="phone-pad" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Что планируете продавать?</Text>
            <TextInput value={form.description} onChangeText={(v) => set("description", v)} placeholder="Опишите ваши товары..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" style={{ textAlignVertical: "top", minHeight: 70 }} />
          </View>
        </View>

        <TouchableOpacity onPress={submit} disabled={loading} className="bg-blue-600 py-4 rounded-2xl items-center">
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Отправить заявку</Text>}
        </TouchableOpacity>

        <Text className="text-xs text-gray-400 text-center px-4">Нажимая «Отправить», вы соглашаетесь с условиями продавца AZA Market</Text>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
