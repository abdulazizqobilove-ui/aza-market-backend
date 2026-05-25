import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, FlatList,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera, Pencil, Check, Store, X, Package, Star } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "expo-router";
import api, { API_URL, imgUrl, Product } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import ProductCard from "@/components/ProductCard";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    setShopName(user?.shop_name || "");
    setShopDesc(user?.shop_description || "");
  }, [user]);

  useFocusEffect(useCallback(() => {
    api.get<Product[]>("/seller/products")
      .then((r) => setProducts(r.data.filter((p) => p.is_active)))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []));

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
        shop_name: field === "shop_name" ? shopName.trim() : user?.shop_name,
        shop_description: field === "shop_description" ? shopDesc.trim() : user?.shop_description,
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

  const bannerUri = imgUrl(user?.shop_banner_url);
  const logoUri = imgUrl(user?.shop_logo_url);
  const initials = (user?.shop_name || user?.username || "?")[0].toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── BANNER ── */}
          <View style={{ height: 180, backgroundColor: "#e9d5ff" }}>
            {bannerUri
              ? <Image source={{ uri: bannerUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Camera size={36} color="#c4b5fd" />
                  <Text style={{ color: "#a78bfa", fontSize: 13, fontWeight: "500" }}>Нажмите чтобы добавить баннер</Text>
                </View>
            }
            {uploadingBanner && (
              <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
            <TouchableOpacity
              onPress={() => pickAndUpload("banner")}
              style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 }}
            >
              <Camera size={13} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Изменить</Text>
            </TouchableOpacity>
          </View>

          {/* ── PROFILE CARD ── */}
          <View style={{ backgroundColor: "#fff", marginHorizontal: 16, marginTop: -28, borderRadius: 24, padding: 20, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 }}>

            {/* Logo + name row */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14, marginBottom: 16 }}>
              {/* Logo */}
              <View style={{ position: "relative" }}>
                <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: "#f5f3ff", backgroundColor: "#e9d5ff", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  {logoUri
                    ? <Image source={{ uri: logoUri }} style={{ width: 76, height: 76 }} contentFit="cover" />
                    : <Text style={{ fontSize: 30, fontWeight: "900", color: P }}>{initials}</Text>
                  }
                  {uploadingLogo && (
                    <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}>
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => pickAndUpload("logo")}
                  style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: P, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}
                >
                  <Camera size={12} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Shop name */}
              <View style={{ flex: 1 }}>
                {editingName ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 2, borderBottomColor: P, paddingBottom: 4 }}>
                    <TextInput
                      value={shopName}
                      onChangeText={setShopName}
                      autoFocus
                      style={{ flex: 1, fontSize: 17, fontWeight: "700", color: "#111827" }}
                    />
                    <TouchableOpacity onPress={() => { setShopName(user?.shop_name || ""); setEditingName(false); }}>
                      <X size={16} color="#9ca3af" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => saveField("shop_name")} disabled={savingName}>
                      {savingName ? <ActivityIndicator size="small" color={P} /> : <Check size={20} color={P} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setEditingName(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", flex: 1 }} numberOfLines={1}>
                      {user?.shop_name || "Название магазина"}
                    </Text>
                    <Pencil size={14} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <View style={{ backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "600" }}>✓ Продавец</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#9ca3af" }}>{products.length} товаров</Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "#f3f4f6", marginBottom: 14 }} />

            {/* Description */}
            <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Описание</Text>
            {editingDesc ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={shopDesc}
                  onChangeText={setShopDesc}
                  autoFocus
                  multiline
                  placeholder="Расскажите о вашем магазине..."
                  placeholderTextColor="#d1d5db"
                  style={{ fontSize: 14, color: "#374151", lineHeight: 20, borderWidth: 1.5, borderColor: P, borderRadius: 12, padding: 12, textAlignVertical: "top", minHeight: 90 }}
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
                    {savingDesc
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ fontSize: 13, color: "#fff", fontWeight: "600" }}>Сохранить</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingDesc(true)} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <Text style={{ fontSize: 14, color: user?.shop_description ? "#374151" : "#d1d5db", lineHeight: 20, flex: 1 }}>
                  {user?.shop_description || "Добавьте описание магазина..."}
                </Text>
                <Pencil size={14} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* ── PRODUCTS ── */}
          <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>Мои товары</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>{products.length} шт.</Text>
            </View>

            {loadingProducts ? (
              <ActivityIndicator color={P} style={{ marginTop: 20 }} />
            ) : products.length === 0 ? (
              <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", gap: 10 }}>
                <Package size={44} color="#e5e7eb" />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151" }}>Нет активных товаров</Text>
                <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>Добавьте товары во вкладке «Товары»</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {products.map((p) => (
                  <View key={p.id} style={{ width: "47.5%" }}>
                    <ProductCard product={p} />
                  </View>
                ))}
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
