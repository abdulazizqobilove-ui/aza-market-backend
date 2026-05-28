import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronLeft, Star, MessageSquarePlus, CheckCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { API_URL, imgUrl } from "@/lib/api";
import { useThemeColors } from "@/lib/theme";
import { SkeletonSimpleRow } from "@/components/Skeleton";

interface ReviewableItem {
  product_id: number;
  product_title: string;
  product_image?: string;
  order_date: string;
  review?: {
    id: number;
    rating: number;
    text?: string;
  };
}

export default function MyReviewsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [tab, setTab] = useState<"to_review" | "reviewed">("to_review");
  const [toReview, setToReview] = useState<ReviewableItem[]>([]);
  const [reviewed, setReviewed] = useState<ReviewableItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ to_review: ReviewableItem[]; reviewed: ReviewableItem[] }>("/reviews/my")
      .then((r) => {
        setToReview(r.data.to_review);
        setReviewed(r.data.reviewed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const data = tab === "to_review" ? toReview : reviewed;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>Мои отзывы</Text>
      </View>

      {/* Tabs */}
      <View style={{ backgroundColor: c.card, flexDirection: "row", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
        {(["to_review", "reviewed"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: tab === t ? "#8B5CF6" : "transparent" }}
          >
            <Text style={{ fontSize: 14, fontWeight: tab === t ? "700" : "500", color: tab === t ? "#8B5CF6" : c.textMuted }}>
              {t === "to_review" ? `Для оценки${toReview.length > 0 ? ` (${toReview.length})` : ""}` : "Уже оценили"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ gap: 10, paddingTop: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonSimpleRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.product_id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>{tab === "to_review" ? "🛍️" : "✅"}</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.text, marginBottom: 6 }}>
                {tab === "to_review" ? "Нет товаров для оценки" : "Вы ещё не оставили отзывов"}
              </Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center" }}>
                {tab === "to_review" ? "Заказывайте товары, чтобы оставлять отзывы" : "Оцените купленные товары"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: c.card, borderRadius: 18, overflow: "hidden" }}>
              <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: c.iconBg, overflow: "hidden" }}>
                  {item.product_image ? (
                    <Image source={{ uri: imgUrl(item.product_image) ?? "" }} style={{ width: 64, height: 64 }} contentFit="cover" />
                  ) : (
                    <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 28 }}>📦</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.text, lineHeight: 18 }} numberOfLines={2}>
                    {item.product_title}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>
                    Заказ от {new Date(item.order_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </Text>
                  {item.review && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={11} color={s <= item.review!.rating ? "#f59e0b" : c.border} fill={s <= item.review!.rating ? "#f59e0b" : c.border} />
                      ))}
                    </View>
                  )}
                </View>
                {tab === "reviewed" && (
                  <CheckCircle size={20} color="#22c55e" />
                )}
              </View>

              {tab === "to_review" && (
                <TouchableOpacity
                  onPress={() => router.push(`/write-review/${item.product_id}` as any)}
                  style={{ marginHorizontal: 14, marginBottom: 14, backgroundColor: c.iconBg, paddingVertical: 12, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                >
                  <MessageSquarePlus size={15} color={c.textSub} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSub }}>Оставить отзыв</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
