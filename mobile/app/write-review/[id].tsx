import { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Star, Camera, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import api, { API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "@/lib/theme";

export default function WriteReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const user = useAuthStore((s) => s.user);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickedImages, setPickedImages] = useState<{ uri: string; name: string; type: string }[]>([]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Нет доступа", "Разрешите доступ к галерее в настройках");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.75,
    });
    if (!result.canceled) {
      const imgs = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || `photo_${Date.now()}.jpg`,
        type: a.mimeType || "image/jpeg",
      }));
      setPickedImages((prev) => [...prev, ...imgs].slice(0, 6));
    }
  };

  const submit = async () => {
    if (rating === 0) {
      Toast.show({ type: "error", text1: "Поставьте оценку" });
      return;
    }
    if (!user) { router.push("/(auth)/login"); return; }
    setSubmitting(true);
    try {
      const res = await api.post<{ id: number }>(`/products/${id}/reviews`, { rating, text });
      const reviewId = res.data.id;

      const token = await AsyncStorage.getItem("token");
      for (const img of pickedImages) {
        await new Promise<void>((resolve) => {
          const form = new FormData();
          form.append("file", { uri: img.uri, name: img.name, type: img.type } as any);
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${API_URL}/api/products/${id}/reviews/${reviewId}/images`);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.onload = () => resolve();
          xhr.onerror = () => resolve();
          xhr.send(form);
        });
      }

      Toast.show({ type: "success", text1: "Отзыв опубликован!" });
      // Возвращаемся на экран «Мои отзывы» — он обновится через useFocusEffect
      if (router.canGoBack()) router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.detail || "Ошибка" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Оставить отзыв</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>

          {/* Rating */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 16 }}>Ваша оценка товара</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Star size={44} color={s <= rating ? "#f59e0b" : c.border} fill={s <= rating ? "#f59e0b" : c.border} />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={{ marginTop: 10, fontSize: 13, color: c.textMuted }}>
                {["", "Очень плохо", "Плохо", "Нормально", "Хорошо", "Отлично!"][rating]}
              </Text>
            )}
          </View>

          {/* Photos */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 4 }}>Добавьте фото</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 12 }}>До 6 фото с разных ракурсов</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {pickedImages.map((img, i) => (
                <View key={i} style={{ position: "relative" }}>
                  <Image source={{ uri: img.uri }} style={{ width: 80, height: 80, borderRadius: 12 }} contentFit="cover" />
                  <TouchableOpacity
                    onPress={() => setPickedImages((p) => p.filter((_, idx) => idx !== i))}
                    style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {pickedImages.length < 6 && (
                <TouchableOpacity
                  onPress={pickImages}
                  style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: c.inputBg, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: c.border, borderStyle: "dashed" }}
                >
                  <Camera size={24} color={c.textMuted} />
                  <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 4 }}>Фото</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Comment */}
          <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 12 }}>Комментарий</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Расскажите о качестве, доставке, упаковке..."
              placeholderTextColor={c.textMuted}
              multiline
              style={{ backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 110, textAlignVertical: "top" }}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={submit}
            disabled={submitting || rating === 0}
            style={{ backgroundColor: rating === 0 ? c.iconBg : "#8B5CF6", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: rating === 0 ? c.textMuted : "#fff", fontWeight: "700", fontSize: 15 }}>Отправить отзыв</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
