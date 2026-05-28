import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Star } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { imgUrl } from "@/lib/api";
import { useThemeColors } from "@/lib/theme";
import { SkeletonReviewItem } from "@/components/Skeleton";

interface Review {
  id: number;
  rating: number;
  text?: string;
  images?: string[];
  username: string;
  created_at: string;
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} color={s <= Math.round(rating) ? "#facc15" : "#e5e7eb"} fill={s <= Math.round(rating) ? "#facc15" : "#e5e7eb"} />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const avgRating = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  useEffect(() => {
    api.get<Review[]>(`/products/${id}/reviews`)
      .then((r) => setReviews(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <View style={{ backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.iconBg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <ChevronLeft size={20} color={c.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text, flex: 1 }}>Отзывы</Text>
        {reviews.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fefce8", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
            <Star size={13} color="#f59e0b" fill="#f59e0b" />
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#92400e" }}>{avgRating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(r) => String(r.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <>
            {loading && (
              <View style={{ gap: 10, paddingBottom: 4 }}>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonReviewItem key={i} />)}
              </View>
            )}
            {!loading && reviews.length > 0 && (
              <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 16, marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 20 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 48, fontWeight: "900", color: c.text, lineHeight: 52 }}>{avgRating.toFixed(1)}</Text>
                  <Stars rating={avgRating} size={15} />
                  <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{reviews.length} отзывов</Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  {ratingCounts.map(({ star, count }) => (
                    <View key={star} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 12, color: c.textMuted, width: 10 }}>{star}</Text>
                      <Star size={11} color="#f59e0b" fill="#f59e0b" />
                      <View style={{ flex: 1, height: 5, backgroundColor: c.iconBg, borderRadius: 4, overflow: "hidden" }}>
                        <View style={{ width: `${(count / reviews.length) * 100}%`, height: "100%", backgroundColor: "#f59e0b", borderRadius: 4 }} />
                      </View>
                      <Text style={{ fontSize: 11, color: c.textMuted, width: 16 }}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {!loading && reviews.length === 0 && (
              <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 40, alignItems: "center" }}>
                <Text style={{ fontSize: 32, marginBottom: 10 }}>💬</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 6 }}>Отзывов пока нет</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item: r }) => (
          <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#2563eb", fontWeight: "800", fontSize: 14 }}>{r.username[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={{ fontWeight: "700", fontSize: 13, color: c.text }}>{r.username}</Text>
                  <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 1 }}>
                    {new Date(r.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </Text>
                </View>
              </View>
              <Stars rating={r.rating} size={13} />
            </View>
            {r.text && (
              <Text style={{ fontSize: 13, color: c.textSub, lineHeight: 20, marginBottom: r.images?.length ? 10 : 0 }}>{r.text}</Text>
            )}
            {r.images && r.images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {r.images.map((url, i) => (
                    <Image key={i} source={{ uri: imgUrl(url) ?? "" }} style={{ width: 80, height: 80, borderRadius: 10 }} contentFit="cover" />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}
        ListFooterComponent={null}
      />
    </SafeAreaView>
  );
}
