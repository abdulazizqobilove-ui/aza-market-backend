import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Camera, Store } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import api, { imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useThemeColors } from "@/lib/theme";

const P = "#8B5CF6";

interface ShopProfile {
  shop_name?: string; shop_description?: string;
  shop_banner_url?: string; shop_logo_url?: string;
}

export default function SellerShopScreen() {
  const router = useRouter();
  const c = useThemeColors();
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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={P} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, backgroundColor: c.iconBg, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Настройки магазина</Text>
        <TouchableOpacity onPress={save} disabled={saving} style={{ backgroundColor: P, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Сохранить</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ gap: 16, padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Banner */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, overflow: "hidden" }}>
          <TouchableOpacity onPress={pickBanner} style={{ height: 144, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
            {bannerUri
              ? <Image source={{ uri: bannerUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              : <View style={{ alignItems: "center", gap: 8 }}><Camera size={28} color={P} /><Text style={{ color: c.textMuted, fontSize: 13 }}>Баннер магазина</Text></View>}
            <View style={{ position: "absolute", bottom: 12, right: 12, width: 32, height: 32, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
              <Camera size={16} color="white" />
            </View>
          </TouchableOpacity>

          {/* Logo */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16, marginTop: -40, marginBottom: 16 }}>
              <TouchableOpacity onPress={pickLogo} style={{ width: 80, height: 80, borderRadius: 20, borderWidth: 4, borderColor: c.card, overflow: "hidden", backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center" }}>
                {logoUri
                  ? <Image source={{ uri: logoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  : <Text style={{ color: P, fontSize: 28, fontWeight: "800" }}>{(form.shop_name || user?.username || "?")[0]?.toUpperCase()}</Text>}
                <View style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, backgroundColor: P, borderTopLeftRadius: 10, alignItems: "center", justifyContent: "center" }}>
                  <Camera size={12} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: c.textMuted, paddingBottom: 8, flex: 1 }}>Нажмите на баннер или лого чтобы изменить</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Store size={18} color={P} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Информация о магазине</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Название магазина</Text>
            <TextInput
              value={form.shop_name}
              onChangeText={(v) => setForm((f) => ({ ...f, shop_name: v }))}
              placeholder="Введите название..."
              placeholderTextColor={c.placeholder}
              style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text }}
            />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: c.textSub }}>Описание магазина</Text>
            <TextInput
              value={form.shop_description}
              onChangeText={(v) => setForm((f) => ({ ...f, shop_description: v }))}
              placeholder="Расскажите о своём магазине..."
              placeholderTextColor={c.placeholder}
              multiline
              numberOfLines={4}
              style={{ backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, textAlignVertical: "top", minHeight: 90 }}
            />
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
