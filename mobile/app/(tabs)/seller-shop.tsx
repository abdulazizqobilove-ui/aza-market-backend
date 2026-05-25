import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImageIcon, Pencil, Check, Store, X } from "lucide-react-native";
import Toast from "react-native-toast-message";
import api, { API_URL, imgUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const P = "#8B5CF6";

export default function SellerShopScreen() {
  const { user, updateUser } = useAuthStore();

  const [shopName, setShopName] = useState(user?.shop_name || "");
  const [shopDesc, setShopDesc] = useState(user?.shop_description || "");
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    setShopName(user?.shop_name || "");
    setShopDesc(user?.shop_description || "");
  }, [user]);

  const pickAndUpload = async (type: "banner" | "logo") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: type === "banner" ? [16, 6] : [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop() || "jpg";
    const form = new FormData();
    form.append("file", { uri: asset.uri, name: `${type}.${ext}`, type: `image/${ext}` } as any);

    if (type === "banner") setUploadingBanner(true);
    else setUploadingLogo(true);

    try {
      const res = await api.post(`/seller/shop/${type}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(res.data);
      Toast.show({ type: "success", text1: type === "banner" ? "Баннер обновлён" : "Логотип обновлён" });
    } catch {
      Toast.show({ type: "error", text1: "Ошибка загрузки фото" });
    } finally {
      if (type === "banner") setUploadingBanner(false);
      else setUploadingLogo(false);
    }
  };

  const saveField = async (field: "shop_name" | "shop_description") => {
    if (field === "shop_name") setSavingName(true);
    else setSavingDesc(true);
    try {
      const res = await api.patch("/seller/shop", {
        shop_name: field === "shop_name" ? shopName.trim() : (user?.shop_name || undefined),
        shop_description: field === "shop_description" ? shopDesc.trim() : (user?.shop_description || undefined),
      });
      updateUser(res.data);
      if (field === "shop_name") setEditingName(false);
      else setEditingDesc(false);
      Toast.show({ type: "success", text1: "Сохранено" });
    } catch {
      Toast.show({ type: "error", text1: "Ошибка сохранения" });
    } finally {
      if (field === "shop_name") setSavingName(false);
      else setSavingDesc(false);
    }
  };

  const bannerUri = user?.shop_banner_url ? imgUrl(user.shop_banner_url) ?? "" : null;
  const logoUri = user?.shop_logo_url ? imgUrl(user.shop_logo_url) ?? "" : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>Оформление магазина</Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Баннер, логотип, название и описание</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Banner */}
          <View style={{ position: "relative" }}>
            <View style={{ width: "100%", aspectRatio: 16 / 6, backgroundColor: "#e9d5ff" }}>
              {bannerUri ? (
                <Image source={{ uri: bannerUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <ImageIcon size={32} color="#c4b5fd" />
                  <Text style={{ fontSize: 12, color: "#a78bfa", fontWeight: "500" }}>Добавить баннер</Text>
                </View>
              )}
              {uploadingBanner && (
                <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color="#fff" size="large" />
                </View>
              )}
            </View>

            {/* Banner edit button */}
            <TouchableOpacity
              onPress={() => pickAndUpload("banner")}
              style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Camera size={13} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Изменить баннер</Text>
            </TouchableOpacity>

            {/* Logo overlapping banner */}
            <View style={{ position: "absolute", bottom: -36, left: 16 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: "#fff", backgroundColor: "#e9d5ff", overflow: "hidden" }}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={{ width: 72, height: 72 }} contentFit="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Store size={28} color="#a78bfa" />
                  </View>
                )}
                {uploadingLogo && (
                  <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => pickAndUpload("logo")}
                style={{ position: "absolute", bottom: 0, right: -2, backgroundColor: P, borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}
              >
                <Camera size={11} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Spacer for logo overlap */}
          <View style={{ height: 48, backgroundColor: "#fff" }} />

          {/* Shop name */}
          <View style={{ backgroundColor: "#fff", marginHorizontal: 12, marginTop: 6, borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Название магазина</Text>
            {editingName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  value={shopName}
                  onChangeText={setShopName}
                  autoFocus
                  placeholder="Введите название..."
                  placeholderTextColor="#d1d5db"
                  style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#111827", borderBottomWidth: 2, borderBottomColor: P, paddingBottom: 4 }}
                />
                <TouchableOpacity onPress={() => { setShopName(user?.shop_name || ""); setEditingName(false); }}>
                  <X size={18} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => saveField("shop_name")} disabled={savingName}>
                  {savingName ? <ActivityIndicator size="small" color={P} /> : <Check size={20} color={P} strokeWidth={2.5} />}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: user?.shop_name ? "#111827" : "#d1d5db" }}>
                  {user?.shop_name || "Не указано"}
                </Text>
                <Pencil size={15} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          <View style={{ backgroundColor: "#fff", marginHorizontal: 12, marginTop: 10, borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Описание магазина</Text>
            {editingDesc ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={shopDesc}
                  onChangeText={setShopDesc}
                  autoFocus
                  multiline
                  numberOfLines={4}
                  placeholder="Расскажите о вашем магазине..."
                  placeholderTextColor="#d1d5db"
                  style={{ fontSize: 14, color: "#374151", lineHeight: 20, borderWidth: 1.5, borderColor: P, borderRadius: 12, padding: 12, textAlignVertical: "top", minHeight: 100 }}
                />
                <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                  <TouchableOpacity
                    onPress={() => { setShopDesc(user?.shop_description || ""); setEditingDesc(false); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f3f4f6" }}
                  >
                    <Text style={{ fontSize: 13, color: "#6b7280", fontWeight: "600" }}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => saveField("shop_description")}
                    disabled={savingDesc}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: P }}
                  >
                    {savingDesc ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 13, color: "#fff", fontWeight: "600" }}>Сохранить</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingDesc(true)} style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ fontSize: 14, color: user?.shop_description ? "#374151" : "#d1d5db", lineHeight: 20, flex: 1 }}>
                  {user?.shop_description || "Добавьте описание магазина..."}
                </Text>
                <Pencil size={15} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Preview hint */}
          <View style={{ marginHorizontal: 12, marginTop: 10, backgroundColor: "#f5f3ff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Store size={18} color={P} />
            <Text style={{ fontSize: 12, color: "#7c3aed", flex: 1, lineHeight: 18 }}>
              Покупатели увидят оформление вашего магазина при переходе на страницу продавца.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
