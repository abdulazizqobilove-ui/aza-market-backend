import { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronLeft, Camera, User as UserIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import api, { API_URL, User } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const avatarColor = user?.role === "admin" ? "#7c3aed" : user?.role === "seller" ? "#16a34a" : "#2563eb";
  const initials = (user?.full_name || user?.username || "?")[0].toUpperCase();

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Нет доступа", "Разрешите доступ к галерее");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);

      const token = await AsyncStorage.getItem("token");
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: asset.fileName || "avatar.jpg", type: asset.mimeType || "image/jpeg" } as any);
      await new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/api/users/me/avatar`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.responseType = "json";
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            await updateUser(xhr.response as User);
            Toast.show({ type: "success", text1: "Фото обновлено!" });
          } else if (xhr.status === 404) {
            Toast.show({ type: "info", text1: "Обновите сервер", text2: "Задеплойте бэкенд на Render" });
          } else {
            Toast.show({ type: "error", text1: xhr.response?.detail || `Ошибка ${xhr.status}` });
          }
          resolve();
        };
        xhr.onerror = () => {
          Toast.show({ type: "error", text1: "Нет соединения" });
          resolve();
        };
        xhr.send(form);
      });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (fullName.trim()) body.full_name = fullName.trim();
      if (phone.trim()) body.phone = phone.trim();
      const res = await api.patch<User>("/users/me", body);
      await updateUser(res.data);
      Toast.show({ type: "success", text1: "Профиль сохранён!" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.detail || "Ошибка" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }} edges={["top"]}>
      <View style={{ backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827", flex: 1 }}>Редактировать профиль</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
              <View style={{ width: 96, height: 96, borderRadius: 48, overflow: "hidden", backgroundColor: avatarColor + "18", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: avatarColor + "40" }}>
                {(avatarUri || user?.avatar_url) ? (
                  <Image
                    source={{ uri: avatarUri || `${API_URL}${user?.avatar_url}` }}
                    style={{ width: 96, height: 96 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={{ color: avatarColor, fontSize: 36, fontWeight: "900" }}>{initials}</Text>
                )}
              </View>
              <View style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: "#111827", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}>
                <Camera size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>Нажмите чтобы изменить фото</Text>
          </View>

          {/* Fields */}
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 14 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 6 }}>Имя</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ваше имя"
                style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827" }}
              />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 6 }}>Логин</Text>
              <View style={{ backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontSize: 15, color: "#9ca3af" }}>{user?.username}</Text>
              </View>
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 6 }}>Телефон</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+992 XX XXX XXXX"
                keyboardType="phone-pad"
                style={{ backgroundColor: "#f9fafb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827" }}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{ backgroundColor: "#111827", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Сохранить</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
