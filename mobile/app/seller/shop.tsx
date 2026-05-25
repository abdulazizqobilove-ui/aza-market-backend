import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Camera, Store } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import api, { API_URL, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface ShopProfile {
  shop_name?: string; shop_description?: string;
  shop_banner_url?: string; shop_logo_url?: string;
}

export default function SellerShopScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ShopProfile>({});
  const [form, setForm] = useState({ shop_name: "", shop_description: "" });
  const [newLogo, setNewLogo] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [newBanner, setNewBanner] = useState<{ uri: string; name: string; type: string } | null>(null);

  useEffect(() => {
    api.get<ShopProfile>("/seller/profile").then((r) => {
      setProfile(r.data);
      setForm({ shop_name: r.data.shop_name || "", shop_description: r.data.shop_description || "" });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9, aspect: [1, 1], allowsEditing: true });
    if (!result.canceled) {
      const a = result.assets[0];
      setNewLogo({ uri: a.uri, name: a.fileName || "logo.jpg", type: a.mimeType || "image/jpeg" });
    }
  };

  const pickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9, aspect: [16, 5], allowsEditing: true });
    if (!result.canceled) {
      const a = result.assets[0];
      setNewBanner({ uri: a.uri, name: a.fileName || "banner.jpg", type: a.mimeType || "image/jpeg" });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = new FormData();
      data.append("shop_name", form.shop_name.trim());
      data.append("shop_description", form.shop_description.trim());
      if (newLogo) data.append("logo", { uri: newLogo.uri, name: newLogo.name, type: newLogo.type } as any);
      if (newBanner) data.append("banner", { uri: newBanner.uri, name: newBanner.name, type: newBanner.type } as any);
      await api.put("/seller/profile", data, { headers: { "Content-Type": "multipart/form-data" } });
      Toast.show({ type: "success", text1: "Магазин обновлён" });
      router.back();
    } catch {
      Toast.show({ type: "error", text1: "Не удалось сохранить" });
    } finally { setSaving(false); }
  };

  const logoUri = newLogo ? newLogo.uri : profile.shop_logo_url ? imgUrl(profile.shop_logo_url) ?? "" : null;
  const bannerUri = newBanner ? newBanner.uri : profile.shop_banner_url ? imgUrl(profile.shop_banner_url) ?? "" : null;

  if (loading) {
    return <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center"><ActivityIndicator color="#8B5CF6" /></SafeAreaView>;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 flex-row items-center gap-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
          <ArrowLeft size={18} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">Настройки магазина</Text>
        <TouchableOpacity onPress={save} disabled={saving} className="bg-violet-500 px-4 py-2 rounded-xl">
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-bold text-sm">Сохранить</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ gap: 16, padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Banner */}
        <View className="bg-white rounded-2xl overflow-hidden">
          <TouchableOpacity onPress={pickBanner} className="relative h-36 bg-blue-100 items-center justify-center">
            {bannerUri
              ? <Image source={{ uri: bannerUri }} className="w-full h-full" contentFit="cover" />
              : <View className="items-center gap-2"><Camera size={28} color="#C4B5FD" /><Text className="text-blue-400 text-sm">Баннер магазина</Text></View>}
            <View className="absolute bottom-3 right-3 w-8 h-8 bg-black/40 rounded-full items-center justify-center">
              <Camera size={16} color="white" />
            </View>
          </TouchableOpacity>

          {/* Logo */}
          <View className="px-4 pb-4">
            <View className="flex-row items-end gap-4 -mt-10 mb-4">
              <TouchableOpacity onPress={pickLogo} className="relative w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-blue-100 items-center justify-center shadow">
                {logoUri
                  ? <Image source={{ uri: logoUri }} className="w-full h-full" contentFit="cover" />
                  : <Text className="text-violet-500 text-2xl font-bold">{(form.shop_name || user?.username || "?")[0]?.toUpperCase()}</Text>}
                <View className="absolute bottom-0 right-0 w-6 h-6 bg-violet-500 rounded-tl-lg items-center justify-center">
                  <Camera size={12} color="white" />
                </View>
              </TouchableOpacity>
              <Text className="text-xs text-gray-400 pb-2 flex-1">Нажмите на баннер или лого чтобы изменить</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View className="bg-white rounded-2xl p-4 gap-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Store size={18} color="#8B5CF6" />
            <Text className="font-semibold text-gray-700">Информация о магазине</Text>
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Название магазина</Text>
            <TextInput value={form.shop_name} onChangeText={(v) => setForm((f) => ({ ...f, shop_name: v }))} placeholder="Введите название..." placeholderTextColor="#9ca3af" className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" />
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-1">Описание магазина</Text>
            <TextInput value={form.shop_description} onChangeText={(v) => setForm((f) => ({ ...f, shop_description: v }))} placeholder="Расскажите о своём магазине..." placeholderTextColor="#9ca3af" multiline numberOfLines={4} className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900" style={{ textAlignVertical: "top", minHeight: 90 }} />
          </View>
        </View>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
