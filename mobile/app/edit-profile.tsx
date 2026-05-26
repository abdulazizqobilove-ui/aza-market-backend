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
import api, { API_URL, imgUrl, User } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "@/lib/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { user, updateUser } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  // Local preview URI — null means no new photo picked
  const [localAvatar, setLocalAvatar] = useState<{ uri: string; name: string; type: string } | null>(null);

  const avatarColor = user?.role === "admin" ? "#7c3aed" : user?.role === "seller" ? "#16a34a" : "#8B5CF6";
  const initials = (user?.full_name || user?.username || "?")[0].toUpperCase();

  // Current displayed avatar: local preview takes priority
  const displayUri = localAvatar?.uri ?? (user?.avatar_url ? imgUrl(user.avatar_url) : null);

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
      quality: 0.85,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      // Just store locally — will upload on save
      setLocalAvatar({
        uri: asset.uri,
        name: asset.fileName || "avatar.jpg",
        type: asset.mimeType || "image/jpeg",
      });
    }
  };

  const uploadAvatar = async (): Promise<boolean> => {
    if (!localAvatar) return true;
    const token = await AsyncStorage.getItem("token");
    const form = new FormData();
    form.append("file", { uri: localAvatar.uri, name: localAvatar.name, type: localAvatar.type } as any);
    return new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/api/users/me/avatar`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.responseType = "json";
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          await updateUser(xhr.response as User);
          resolve(true);
        } else {
          Toast.show({ type: "error", text1: xhr.response?.detail || `Ошибка загрузки фото` });
          resolve(false);
        }
      };
      xhr.onerror = () => {
        Toast.show({ type: "error", text1: "Нет соединения" });
        resolve(false);
      };
      xhr.send(form);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Upload avatar first if changed
      if (localAvatar) {
        const ok = await uploadAvatar();
        if (!ok) { setSaving(false); return; }
      }

      // Save profile fields
      const body: Record<string, string> = {};
      if (fullName.trim()) body.full_name = fullName.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (email.trim()) body.email = email.trim();

      if (Object.keys(body).length > 0) {
        const res = await api.patch<User>("/users/me", body);
        await updateUser(res.data);
      }

      Toast.show({ type: "success", text1: "Профиль сохранён!" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.detail || "Ошибка" });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View>
      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Редактировать профиль</Text>
        {localAvatar && (
          <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, color: "#d97706", fontWeight: "600" }}>Не сохранено</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>

          {/* Avatar with preview */}
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
              <View style={{ width: 100, height: 100, borderRadius: 50, overflow: "hidden", backgroundColor: avatarColor + "18", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: localAvatar ? "#f59e0b" : avatarColor + "40" }}>
                {displayUri ? (
                  <Image
                    source={{ uri: displayUri }}
                    style={{ width: 100, height: 100 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={{ color: avatarColor, fontSize: 38, fontWeight: "900" }}>{initials}</Text>
                )}
              </View>
              <View style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: c.card }}>
                <Camera size={15} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 10 }}>
              {localAvatar ? "📷 Новое фото выбрано — сохраните" : "Нажмите чтобы изменить фото"}
            </Text>
            {localAvatar && (
              <TouchableOpacity onPress={() => setLocalAvatar(null)} style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: "#ef4444" }}>Отменить</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Fields */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, gap: 14 }}>
            <Field label="Имя и фамилия">
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ваше имя"
                placeholderTextColor={c.textMuted}
                style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text }}
              />
            </Field>

            <Field label="Логин">
              <View style={{ backgroundColor: c.iconBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontSize: 15, color: c.textMuted }}>@{user?.username}</Text>
              </View>
            </Field>

            <Field label="Телефон">
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+992 XX XXX XXXX"
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
                style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text }}
              />
            </Field>

            <Field label="Email">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="example@mail.com"
                placeholderTextColor={c.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text }}
              />
            </Field>
          </View>

          {/* Role badge */}
          <View style={{ backgroundColor: c.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: c.textSub, fontWeight: "500" }}>Роль аккаунта</Text>
            <View style={{ backgroundColor: avatarColor + "18", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: avatarColor, fontSize: 12, fontWeight: "700" }}>
                {user?.role === "admin" ? "Администратор" : user?.role === "seller" ? "Продавец" : "Покупатель"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{ backgroundColor: "#8B5CF6", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Сохранить</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
